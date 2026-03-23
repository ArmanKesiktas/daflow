import type { Node, Edge } from '@xyflow/react'
import type { NodeData } from '../types/workflow'

// ── Topological sort ──────────────────────────────────────────────────────────

function topoSort(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of nodes) { inDegree.set(n.id, 0); adj.set(n.id, []) }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }
  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0)
  const result: Node<NodeData>[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    for (const nid of adj.get(node.id) ?? []) {
      const d = (inDegree.get(nid) ?? 1) - 1
      inDegree.set(nid, d)
      if (d === 0) {
        const next = nodes.find((n) => n.id === nid)
        if (next) queue.push(next)
      }
    }
  }
  return result
}

// ── Variable name helper ──────────────────────────────────────────────────────

function varName(node: Node<NodeData>, idx: number): string {
  const t = (node.type ?? 'node').replace(/_/g, '_')
  return `${t}_${idx}`
}

// ── Code generation per node type ─────────────────────────────────────────────

function upstreamDf(nodeId: string, edges: Edge[], varMap: Map<string, string>): string {
  const edge = edges.find((e) => e.target === nodeId)
  if (!edge) return 'df'
  return varMap.get(edge.source) ?? 'df'
}

function genNode(
  node: Node<NodeData>,
  idx: number,
  edges: Edge[],
  varMap: Map<string, string>,
): string {
  const cfg = (node.data.config ?? {}) as Record<string, unknown>
  const inDf = upstreamDf(node.id, edges, varMap)
  const out  = varName(node, idx)
  varMap.set(node.id, out)

  const comment = node.data.note ? `\n# Note: ${node.data.note}` : ''

  switch (node.type) {
    case 'database_query': {
      const dbType   = String(cfg.db_type ?? 'postgresql')
      const connMode = String(cfg.connection_mode ?? 'fields')
      const useSSH   = Boolean(cfg.use_ssh_tunnel)
      let connStr = ''
      if (connMode === 'connection_string') {
        connStr = String(cfg.connection_string ?? '')
      } else if (dbType === 'sqlite') {
        connStr = `sqlite:///${cfg.database ?? 'data.db'}`
      } else {
        const driver = dbType === 'mysql' ? 'mysql+pymysql' : 'postgresql+psycopg2'
        const host = useSSH ? '127.0.0.1:{tunnel.local_bind_port}' : `${cfg.host ?? 'localhost'}:${cfg.port ?? 5432}`
        connStr = `${driver}://${cfg.username ?? 'user'}:${cfg.password ?? 'pass'}@${host}/${cfg.database ?? 'db'}`
      }
      const query = String(cfg.query ?? 'SELECT 1')
      if (useSSH) {
        return `${comment}\n# Database Query via SSH Tunnel (${dbType})\nimport sshtunnel, sqlalchemy as _sa\nwith sshtunnel.SSHTunnelForwarder(\n    ("${cfg.ssh_host ?? 'jump.host'}", ${cfg.ssh_port ?? 22}),\n    ssh_username="${cfg.ssh_user ?? 'user'}",\n    ssh_password="${cfg.ssh_password ?? 'YOUR_SSH_PASSWORD'}",\n    remote_bind_address=("${cfg.host ?? 'localhost'}", ${cfg.port ?? 5432}),\n) as _tunnel:\n    _tunnel.start()\n    _engine = _sa.create_engine("${connStr}")\n    ${out} = pd.read_sql(_sa.text("""${query}"""), _engine)\n    _engine.dispose()\nprint(f"Loaded {len(${out})} rows, {len(${out}.columns)} columns")\n`
      }
      return `${comment}\n# Database Query (${dbType})\nimport sqlalchemy as _sa\n_engine = _sa.create_engine("${connStr}")\n${out} = pd.read_sql(_sa.text("""${query}"""), _engine)\n_engine.dispose()\nprint(f"Loaded {len(${out})} rows, {len(${out}.columns)} columns")\n`
    }
    case 'file_upload': {
      const path = String(cfg.filename ?? 'data.csv')
      const ext = path.split('.').pop()?.toLowerCase()
      const reader = ext === 'csv' ? `pd.read_csv("${path}")` : ext === 'parquet' ? `pd.read_parquet("${path}")` : `pd.read_excel("${path}")`
      return `${comment}\n# File Upload: ${path}\n${out} = ${reader}\nprint(f"Loaded {len(${out})} rows, {len(${out}.columns)} columns")\n`
    }
    case 'column_type_detection': {
      return `${comment}\n# Column Type Detection\n${out} = ${inDf}.copy()\nprint(${out}.dtypes)\n`
    }
    case 'missing_value': {
      const strategy = String(cfg.strategy ?? 'report_only')
      const cols = (cfg.columns as string[])?.length ? JSON.stringify(cfg.columns) : 'None'
      const strats: Record<string, string> = {
        report_only: `# Report only — no changes\n${out} = ${inDf}.copy()\nprint(${inDf}.isnull().sum())`,
        drop_rows:   `${out} = ${inDf}.dropna(subset=${cols} if ${cols} != 'None' else None).reset_index(drop=True)`,
        fill_mean:   `${out} = ${inDf}.copy()\n${out}.fillna(${out}.mean(numeric_only=True), inplace=True)`,
        fill_median: `${out} = ${inDf}.copy()\nfor col in (${cols} or ${inDf}.select_dtypes('number').columns):\n    ${out}[col] = ${out}[col].fillna(${out}[col].median())`,
        fill_mode:   `${out} = ${inDf}.copy()\nfor col in (${cols} or ${inDf}.columns):\n    ${out}[col] = ${out}[col].fillna(${out}[col].mode()[0] if not ${out}[col].mode().empty else np.nan)`,
        fill_constant: `${out} = ${inDf}.fillna(${cfg.fill_value ?? 0})`,
      }
      return `${comment}\n# Missing Values (${strategy})\n${strats[strategy] ?? `${out} = ${inDf}.copy()`}\n`
    }
    case 'duplicate_detection': {
      const drop = Boolean(cfg.drop)
      const keep = String(cfg.keep ?? 'first')
      return `${comment}\n# Duplicate Detection\n${out} = ${inDf}.copy()\nprint(f"Duplicates: {${inDf}.duplicated().sum()}")\n${drop ? `${out} = ${out}.drop_duplicates(keep='${keep}').reset_index(drop=True)` : ''}\n`
    }
    case 'filter_rows': {
      const col = String(cfg.column ?? '')
      const op  = String(cfg.operator ?? '==')
      const val = String(cfg.value ?? '')
      const opMap: Record<string, string> = {
        '==': `${out} = ${inDf}[${inDf}["${col}"] == ${JSON.stringify(val)}]`,
        '!=': `${out} = ${inDf}[${inDf}["${col}"] != ${JSON.stringify(val)}]`,
        '>':  `${out} = ${inDf}[${inDf}["${col}"] > ${val}]`,
        '>=': `${out} = ${inDf}[${inDf}["${col}"] >= ${val}]`,
        '<':  `${out} = ${inDf}[${inDf}["${col}"] < ${val}]`,
        '<=': `${out} = ${inDf}[${inDf}["${col}"] <= ${val}]`,
        contains:     `${out} = ${inDf}[${inDf}["${col}"].astype(str).str.contains("${val}", na=False)]`,
        not_contains: `${out} = ${inDf}[~${inDf}["${col}"].astype(str).str.contains("${val}", na=False)]`,
        isnull:   `${out} = ${inDf}[${inDf}["${col}"].isna()]`,
        notnull:  `${out} = ${inDf}[${inDf}["${col}"].notna()]`,
      }
      return `${comment}\n# Filter Rows: ${col} ${op} ${val}\n${opMap[op] ?? `${out} = ${inDf}.copy()`}\nprint(f"Rows after filter: {len(${out})}")\n`
    }
    case 'statistics': {
      const cols = (cfg.columns as string[])?.length ? `[${(cfg.columns as string[]).map(c => `"${c}"`).join(', ')}]` : 'None'
      return `${comment}\n# Descriptive Statistics\n${out} = ${inDf}.copy()\n_stats_df = ${inDf}.select_dtypes('number')${cols !== 'None' ? `[${cols}]` : ''}\nprint(_stats_df.describe())\n`
    }
    case 'anomaly_detection': {
      const method = String(cfg.method ?? 'iqr')
      const k = Number(cfg.iqr_multiplier ?? 1.5)
      const z = Number(cfg.zscore_threshold ?? 3.0)
      let detect = ''
      if (method === 'iqr') {
        detect = `Q1 = ${inDf}.select_dtypes('number').quantile(0.25)\nQ3 = ${inDf}.select_dtypes('number').quantile(0.75)\nIQR = Q3 - Q1\n_anomaly_mask = ((${inDf}.select_dtypes('number') < (Q1 - ${k} * IQR)) | (${inDf}.select_dtypes('number') > (Q3 + ${k} * IQR))).any(axis=1)`
      } else if (method === 'zscore') {
        detect = `from scipy import stats as _stats\n_anomaly_mask = (np.abs(_stats.zscore(${inDf}.select_dtypes('number').fillna(0))) > ${z}).any(axis=1)`
      } else {
        detect = `from sklearn.ensemble import IsolationForest\n_iforest = IsolationForest(contamination=${cfg.contamination ?? 0.05}, random_state=42)\n_anomaly_mask = _iforest.fit_predict(${inDf}.select_dtypes('number').fillna(0)) == -1`
      }
      return `${comment}\n# Anomaly Detection (${method})\n${out} = ${inDf}.copy()\n${detect}\n${out}["_is_anomaly"] = _anomaly_mask\nprint(f"Anomalies found: {_anomaly_mask.sum()}")\n`
    }
    case 'correlation': {
      const method = String(cfg.method ?? 'pearson')
      const thresh = Number(cfg.threshold ?? 0.7)
      return `${comment}\n# Correlation Analysis (${method})\n${out} = ${inDf}.copy()\n_corr = ${inDf}.select_dtypes('number').corr(method='${method}')\nprint("Strong pairs (|r| > ${thresh}):")\nprint(_corr[_corr.abs() > ${thresh}].stack().reset_index())\n`
    }
    case 'distribution': {
      const bins = Number(cfg.bins ?? 20)
      return `${comment}\n# Distribution Analysis\n${out} = ${inDf}.copy()\n${inDf}.select_dtypes('number').hist(bins=${bins}, figsize=(12, 6))\nplt.tight_layout()\nplt.show()\n`
    }
    case 'normalize': {
      const method = String(cfg.method ?? 'minmax')
      const cols = (cfg.columns as string[])?.length
        ? `[${(cfg.columns as string[]).map(c => `"${c}"`).join(', ')}]`
        : `${inDf}.select_dtypes('number').columns.tolist()`
      if (method === 'minmax') {
        return `${comment}\n# Normalize (min-max)\nfrom sklearn.preprocessing import MinMaxScaler\n${out} = ${inDf}.copy()\n_scaler = MinMaxScaler()\n${out}[${cols}] = _scaler.fit_transform(${inDf}[${cols}])\n`
      } else if (method === 'zscore') {
        return `${comment}\n# Normalize (z-score)\nfrom sklearn.preprocessing import StandardScaler\n${out} = ${inDf}.copy()\n_scaler = StandardScaler()\n${out}[${cols}] = _scaler.fit_transform(${inDf}[${cols}])\n`
      } else {
        return `${comment}\n# Normalize (robust)\nfrom sklearn.preprocessing import RobustScaler\n${out} = ${inDf}.copy()\n_scaler = RobustScaler()\n${out}[${cols}] = _scaler.fit_transform(${inDf}[${cols}])\n`
      }
    }
    case 'encode': {
      const method = String(cfg.method ?? 'label')
      const cols = (cfg.columns as string[])?.length
        ? `[${(cfg.columns as string[]).map(c => `"${c}"`).join(', ')}]`
        : `${inDf}.select_dtypes(['object', 'category']).columns.tolist()`
      if (method === 'onehot') {
        return `${comment}\n# Encode (one-hot)\n${out} = pd.get_dummies(${inDf}, columns=${cols}, dtype=int)\n`
      } else {
        return `${comment}\n# Encode (label)\nfrom sklearn.preprocessing import LabelEncoder\n${out} = ${inDf}.copy()\n_le = LabelEncoder()\nfor _col in ${cols}:\n    ${out}[_col] = _le.fit_transform(${out}[_col].astype(str))\n`
      }
    }
    case 'pivot': {
      const aggfunc = String(cfg.aggfunc ?? 'mean')
      return `${comment}\n# Pivot Table\n${out} = pd.pivot_table(${inDf}, index="${cfg.index}", columns="${cfg.columns}", values="${cfg.values}", aggfunc="${aggfunc}", fill_value=0).reset_index()\n`
    }
    case 'group_by': {
      const groupCols = (cfg.group_columns as string[]) ?? []
      const aggs = (cfg.aggregations as Record<string, string>) ?? {}
      const defaultAgg = aggs._default ?? 'sum'
      const colsStr = groupCols.map(c => `"${c}"`).join(', ')
      return `${comment}\n# Group By\n${out} = ${inDf}.groupby([${colsStr}]).agg("${defaultAgg}").reset_index()\n`
    }
    case 'column_ops': {
      const op = String(cfg.operation ?? 'select')
      const cols = (cfg.columns as string[]) ?? []
      if (op === 'select') {
        const colsStr = cols.map(c => `"${c}"`).join(', ')
        return `${comment}\n# Column Ops (select)\n${out} = ${inDf}[[${colsStr}]].copy()\n`
      } else if (op === 'drop') {
        const colsStr = cols.map(c => `"${c}"`).join(', ')
        return `${comment}\n# Column Ops (drop)\n${out} = ${inDf}.drop(columns=[${colsStr}]).copy()\n`
      } else if (op === 'rename') {
        const rm = JSON.stringify(cfg.rename_map ?? {})
        return `${comment}\n# Column Ops (rename)\n${out} = ${inDf}.rename(columns=${rm})\n`
      } else {
        const cm = JSON.stringify(cfg.cast_map ?? {})
        return `${comment}\n# Column Ops (cast)\n${out} = ${inDf}.astype(${cm})\n`
      }
    }
    case 'custom_python': {
      const code = String(cfg.code ?? 'df_out = df.copy()')
      const indented = code.split('\n').map(l => '    ' + l).join('\n')
      return `${comment}\n# Custom Python\ndef _custom_transform(df):\n${indented}\n    return df_out\n${out} = _custom_transform(${inDf})\n`
    }
    case 'join': {
      // For join, find both input edges
      const leftEdge = edges.find((e) => e.target === node.id && e.targetHandle === 'left_df')
      const rightEdge = edges.find((e) => e.target === node.id && e.targetHandle === 'right_df')
      const leftDf = leftEdge ? (varMap.get(leftEdge.source) ?? 'df_left') : 'df_left'
      const rightDf = rightEdge ? (varMap.get(rightEdge.source) ?? 'df_right') : 'df_right'
      const how = String(cfg.how ?? 'inner')
      const on = cfg.on ? `on="${cfg.on}"` : `left_on="${cfg.left_on ?? ''}", right_on="${cfg.right_on ?? ''}"`
      return `${comment}\n# Join (${how})\n${out} = pd.merge(${leftDf}, ${rightDf}, how="${how}", ${on})\nprint(f"Join output: {len(${out})} rows")\n`
    }
    case 'time_series': {
      const dateCol = String(cfg.date_column ?? 'date')
      const valCol  = String(cfg.value_column ?? 'value')
      const window  = Number(cfg.window ?? 7)
      return `${comment}\n# Time Series Analysis\n${out} = ${inDf}.copy()\n${out}["${dateCol}"] = pd.to_datetime(${out}["${dateCol}"])\n${out} = ${out}.sort_values("${dateCol}").reset_index(drop=True)\n${out}["rolling_mean"] = ${out}["${valCol}"].rolling(window=${window}, min_periods=1).mean()\nimport numpy as np\n_x = np.arange(len(${out}))\n_coeffs = np.polyfit(_x, ${out}["${valCol}"].fillna(0), 1)\n${out}["trend"] = np.polyval(_coeffs, _x)\nprint(f"Trend slope: {_coeffs[0]:.4f}")\n`
    }
    case 'train_test_split': {
      const testSize = Number(cfg.test_size ?? 0.2)
      const seed = Number(cfg.random_state ?? 42)
      const stratify = cfg.stratify_column ? `stratify=${inDf}["${cfg.stratify_column}"]` : ''
      return `${comment}\n# Train/Test Split\nfrom sklearn.model_selection import train_test_split as _tts\n_train, _test = _tts(${inDf}, test_size=${testSize}, random_state=${seed}${stratify ? ', ' + stratify : ''})\n${out} = ${inDf}.copy()\n${out}["_split"] = "test"\n${out}.loc[_train.index, "_split"] = "train"\nprint(f"Train: {len(_train)}, Test: {len(_test)}")\n`
    }
    case 'ml_model': {
      const taskType = String(cfg.task_type ?? 'classification')
      const algorithm = String(cfg.algorithm ?? 'random_forest_classifier')
      const target = String(cfg.target_column ?? '')
      const featureCols = (cfg.feature_columns as string[]) ?? []
      const seed = Number(cfg.random_state ?? 42)
      const featsExpr = featureCols.length
        ? `[${featureCols.map(c => `"${c}"`).join(', ')}]`
        : `${inDf}.select_dtypes("number").columns.drop("${target}", errors="ignore").tolist()`
      const modelImport = taskType === 'classification'
        ? `from sklearn.ensemble import RandomForestClassifier\n_model = RandomForestClassifier(random_state=${seed})`
        : `from sklearn.ensemble import RandomForestRegressor\n_model = RandomForestRegressor(random_state=${seed})`
      const metricsCode = taskType === 'classification'
        ? `from sklearn.metrics import accuracy_score\nprint(f"Accuracy: {accuracy_score(_y_test, _y_pred):.4f}")`
        : `from sklearn.metrics import r2_score, mean_squared_error\nprint(f"R²: {r2_score(_y_test, _y_pred):.4f}, RMSE: {mean_squared_error(_y_test, _y_pred)**0.5:.4f}")`
      const comment2 = algorithm !== 'random_forest_classifier' && algorithm !== 'random_forest_regressor' ? `\n# Note: using RandomForest; change ${modelImport.split('\n')[0]} for ${algorithm}` : ''
      return `${comment}${comment2}\n# ML Model (${algorithm})\n_feats = ${featsExpr}\n_train_df = ${inDf}[${inDf}["_split"] == "train"] if "_split" in ${inDf}.columns else ${inDf}.sample(frac=0.8, random_state=${seed})\n_test_df  = ${inDf}[${inDf}["_split"] == "test"]  if "_split" in ${inDf}.columns else ${inDf}.drop(_train_df.index)\nX_train, X_test = _train_df[_feats].fillna(0), _test_df[_feats].fillna(0)\n_y_train, _y_test = _train_df["${target}"], _test_df["${target}"]\n${modelImport}\n_model.fit(X_train, _y_train)\n_y_pred = _model.predict(X_test)\n${out} = _test_df.copy()\n${out}["_prediction"] = _y_pred\n${metricsCode}\n`
    }
    case 'data_export': {
      const fmt  = String(cfg.format ?? 'csv')
      const fname = String(cfg.filename ?? 'export')
      const writers: Record<string, string> = {
        csv:   `${inDf}.to_csv("${fname}.csv", index=False)`,
        excel: `${inDf}.to_excel("${fname}.xlsx", index=False)`,
        json:  `${inDf}.to_json("${fname}.json", orient="records", indent=2)`,
      }
      return `${comment}\n# Data Export (${fmt})\n${writers[fmt] ?? writers.csv}\n${out} = ${inDf}.copy()\nprint(f"Exported {len(${inDf})} rows to ${fname}.${fmt === 'excel' ? 'xlsx' : fmt}")\n`
    }
    default:
      return `${comment}\n# ${node.type} (not implemented)\n${out} = ${inDf}.copy()\n`
  }
}

// ── Main export function ──────────────────────────────────────────────────────

export function exportToPython(nodes: Node<NodeData>[], edges: Edge[]): string {
  const sorted = topoSort(nodes, edges)
  const varMap = new Map<string, string>()

  const blocks: string[] = []

  blocks.push(`# Generated by Daflow — ${new Date().toLocaleString()}
# Install: pip install pandas numpy scipy scikit-learn matplotlib openpyxl

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
`)

  sorted.forEach((node, idx) => {
    const block = genNode(node, idx, edges, varMap)
    blocks.push(block)
  })

  return blocks.join('\n')
}

export function downloadPython(nodes: Node<NodeData>[], edges: Edge[], name = 'workflow'): void {
  const code = exportToPython(nodes, edges)
  const blob = new Blob([code], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${name.replace(/\s+/g, '_').toLowerCase()}.py`
  a.click()
  URL.revokeObjectURL(url)
}
