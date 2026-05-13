import type { ColumnMeta } from '../../types/workflow'

interface KeyPair {
  left: string
  right: string
}

interface JoinKeyPairListProps {
  keyPairs: KeyPair[]
  leftSchema: ColumnMeta[] | null
  rightSchema: ColumnMeta[] | null
  joinType: string
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, side: 'left' | 'right', value: string) => void
}

export default function JoinKeyPairList({
  keyPairs,
  leftSchema,
  rightSchema,
  joinType,
  onAdd,
  onRemove,
  onChange,
}: JoinKeyPairListProps) {
  const isCross = joinType === 'cross'
  const showError = !isCross && keyPairs.length === 0

  return (
    <div className="space-y-2">
      <label className="block text-[11px] text-[var(--color-text-muted)] font-medium">
        Join Keys
      </label>

      {isCross && (
        <div className="rounded-lg bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] px-3 py-2 text-[10.5px] text-[var(--color-text-muted)]">
          Cross join does not require key columns — it produces a cartesian product.
        </div>
      )}

      {!isCross && (
        <>
          <div className="space-y-1.5">
            {keyPairs.map((pair, idx) => {
              const leftInvalid = leftSchema && pair.left && !leftSchema.find(c => c.name === pair.left)
              const rightInvalid = rightSchema && pair.right && !rightSchema.find(c => c.name === pair.right)

              return (
                <div key={idx} className="flex items-center gap-1.5">
                  {/* Left dropdown */}
                  <select
                    value={pair.left}
                    onChange={(e) => onChange(idx, 'left', e.target.value)}
                    className={`flex-1 bg-[var(--color-secondary)] border rounded-lg px-2 py-1.5 text-[11px] text-[var(--color-text-primary)] focus:outline-none focus:border-[#0071E3]/50 transition-colors ${
                      leftInvalid ? 'border-[#FF453A]' : 'border-[var(--color-border-default)]'
                    }`}
                  >
                    <option value="">Left col…</option>
                    {leftSchema?.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                    {/* Keep invalid value visible */}
                    {leftInvalid && <option value={pair.left}>{pair.left} ⚠️</option>}
                  </select>

                  <span className="text-[11px] text-[var(--color-text-muted)] font-mono">=</span>

                  {/* Right dropdown */}
                  <select
                    value={pair.right}
                    onChange={(e) => onChange(idx, 'right', e.target.value)}
                    className={`flex-1 bg-[var(--color-secondary)] border rounded-lg px-2 py-1.5 text-[11px] text-[var(--color-text-primary)] focus:outline-none focus:border-[#0071E3]/50 transition-colors ${
                      rightInvalid ? 'border-[#FF453A]' : 'border-[var(--color-border-default)]'
                    }`}
                  >
                    <option value="">Right col…</option>
                    {rightSchema?.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                    {rightInvalid && <option value={pair.right}>{pair.right} ⚠️</option>}
                  </select>

                  {/* Remove button */}
                  <button
                    onClick={() => onRemove(idx)}
                    className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors flex-shrink-0"
                    title="Remove key pair"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add button */}
          <button
            onClick={onAdd}
            className="w-full h-7 rounded-lg border border-dashed border-[var(--color-border-default)] text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] transition-colors"
          >
            + Add key pair
          </button>

          {/* Validation error */}
          {showError && (
            <div className="rounded-lg bg-[#FF453A]/10 border border-[#FF453A]/20 px-3 py-1.5 text-[10.5px] text-[#FF453A]">
              At least one join key pair is required for {joinType} join.
            </div>
          )}
        </>
      )}
    </div>
  )
}
