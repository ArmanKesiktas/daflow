import type { ColumnMeta } from '../types/workflow'

export interface JoinKeySuggestion {
  left: string
  right: string
  confidence: 'exact' | 'fuzzy'
  reason: string
}

export function suggestJoinKeys(
  leftColumns: ColumnMeta[],
  rightColumns: ColumnMeta[],
  dismissed: Array<{ left: string; right: string }>
): JoinKeySuggestion[] {
  const suggestions: JoinKeySuggestion[] = []
  const dismissedSet = new Set(dismissed.map(d => `${d.left}::${d.right}`))

  // Exact name matches
  for (const lc of leftColumns) {
    for (const rc of rightColumns) {
      if (lc.name === rc.name && !dismissedSet.has(`${lc.name}::${rc.name}`)) {
        suggestions.push({ left: lc.name, right: rc.name, confidence: 'exact', reason: 'Same column name' })
      }
    }
  }

  // Fuzzy matches (case-insensitive substring) only if no exact matches
  if (suggestions.length === 0) {
    for (const lc of leftColumns) {
      for (const rc of rightColumns) {
        const ln = lc.name.toLowerCase()
        const rn = rc.name.toLowerCase()
        if (ln !== rn && (ln.includes(rn) || rn.includes(ln)) && !dismissedSet.has(`${lc.name}::${rc.name}`)) {
          suggestions.push({ left: lc.name, right: rc.name, confidence: 'fuzzy', reason: 'Similar name' })
        }
      }
    }
  }

  return suggestions
}
