import './chartSetup'

interface CorrelationHeatmapProps {
  matrix: Record<string, Record<string, number>>
  strongPairs?: { col_a: string; col_b: string; correlation: number; direction: string }[]
  method?: string
}

function getColor(val: number): string {
  // -1 → red, 0 → gray, +1 → blue
  const abs = Math.abs(val)
  if (val > 0) return `rgba(0, 113, 227, ${abs * 0.8 + 0.1})`
  if (val < 0) return `rgba(255, 69, 58, ${abs * 0.8 + 0.1})`
  return 'rgba(128, 128, 128, 0.1)'
}

export default function CorrelationHeatmap({ matrix, strongPairs, method }: CorrelationHeatmapProps) {
  const columns = Object.keys(matrix)
  if (!columns.length) return <p className="text-[11px] opacity-40">No correlation data</p>

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-semibold opacity-70">
        Correlation Matrix ({method || 'pearson'})
      </p>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="p-1" />
              {columns.map((c) => (
                <th key={c} className="p-1 font-medium opacity-60 max-w-[60px] truncate" title={c}>
                  {c.length > 8 ? c.slice(0, 8) + '…' : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map((row) => (
              <tr key={row}>
                <td className="p-1 font-medium opacity-60 text-right pr-2 max-w-[60px] truncate" title={row}>
                  {row.length > 8 ? row.slice(0, 8) + '…' : row}
                </td>
                {columns.map((col) => {
                  const val = matrix[row]?.[col] ?? 0
                  return (
                    <td
                      key={col}
                      className="p-0 w-9 h-9 text-center font-mono relative group"
                      style={{ backgroundColor: getColor(val) }}
                      title={`${row} × ${col} = ${val.toFixed(3)}`}
                    >
                      <span className="text-white dark:text-white text-[9px] font-bold drop-shadow-sm">
                        {val === 1 ? '1' : val.toFixed(2)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strong pairs */}
      {strongPairs && strongPairs.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold opacity-40 uppercase tracking-wider">Strong Correlations</p>
          {strongPairs.map((p, i) => (
            <div
              key={i}
              className={`text-[10px] px-2 py-1 rounded-lg border ${
                p.direction === 'positive'
                  ? 'bg-[#0071E3]/10 border-[#0071E3]/20 text-[#0071E3]'
                  : 'bg-[#FF453A]/10 border-[#FF453A]/20 text-[#FF453A]'
              }`}
            >
              <span className="font-semibold">{p.col_a}</span>
              {' ↔ '}
              <span className="font-semibold">{p.col_b}</span>
              {': '}
              <span className="font-mono">{p.correlation.toFixed(3)}</span>
              <span className="opacity-60"> ({p.direction})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
