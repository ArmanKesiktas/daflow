import { useState } from 'react'

type JoinType = 'inner' | 'left' | 'right' | 'outer' | 'cross'

interface JoinTypeSelectorProps {
  value: JoinType
  onChange: (type: JoinType) => void
}

const JOIN_TYPES: { type: JoinType; label: string; tooltip: string }[] = [
  { type: 'inner', label: 'Inner', tooltip: 'Returns only rows that match in both tables' },
  { type: 'left', label: 'Left', tooltip: 'Returns all rows from the left table, matched rows from right' },
  { type: 'right', label: 'Right', tooltip: 'Returns all rows from the right table, matched rows from left' },
  { type: 'outer', label: 'Outer', tooltip: 'Returns all rows from both tables, filling gaps with null' },
  { type: 'cross', label: 'Cross', tooltip: 'Returns every combination of rows (cartesian product)' },
]

function VennIcon({ type, active }: { type: JoinType; active: boolean }) {
  const fill = active ? '#0071E3' : 'var(--color-text-muted)'
  const opacity = active ? '0.3' : '0.15'

  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      {type === 'inner' && (
        <>
          <circle cx="10" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill="none" opacity="0.5" />
          <circle cx="18" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M14 3.4A8 8 0 0 1 14 16.6A8 8 0 0 1 14 3.4Z" fill={fill} opacity={opacity} />
          <path d="M14 3.4A8 8 0 0 1 18 10A8 8 0 0 1 14 16.6A8 8 0 0 0 10 10A8 8 0 0 0 14 3.4Z" fill={fill} opacity="0.6" />
        </>
      )}
      {type === 'left' && (
        <>
          <circle cx="10" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill={fill} opacity={active ? '0.4' : '0.2'} />
          <circle cx="18" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill="none" opacity="0.5" />
        </>
      )}
      {type === 'right' && (
        <>
          <circle cx="10" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill="none" opacity="0.5" />
          <circle cx="18" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill={fill} opacity={active ? '0.4' : '0.2'} />
        </>
      )}
      {type === 'outer' && (
        <>
          <circle cx="10" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill={fill} opacity={active ? '0.4' : '0.2'} />
          <circle cx="18" cy="10" r="8" stroke={fill} strokeWidth="1.5" fill={fill} opacity={active ? '0.4' : '0.2'} />
        </>
      )}
      {type === 'cross' && (
        <>
          <rect x="2" y="3" width="10" height="14" rx="2" stroke={fill} strokeWidth="1.5" fill={fill} opacity={active ? '0.4' : '0.2'} />
          <rect x="16" y="3" width="10" height="14" rx="2" stroke={fill} strokeWidth="1.5" fill={fill} opacity={active ? '0.4' : '0.2'} />
          <path d="M12 10 L16 10" stroke={fill} strokeWidth="1.5" strokeDasharray="2 1" />
        </>
      )}
    </svg>
  )
}

export default function JoinTypeSelector({ value, onChange }: JoinTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<JoinType | null>(null)

  return (
    <div className="space-y-2">
      <label className="block text-[11px] text-[var(--color-text-muted)] font-medium">Join Type</label>
      <div className="grid grid-cols-5 gap-1">
        {JOIN_TYPES.map(({ type, label, tooltip }) => (
          <div key={type} className="relative">
            <button
              onClick={() => onChange(type)}
              onMouseEnter={() => setHoveredType(type)}
              onMouseLeave={() => setHoveredType(null)}
              className={`w-full flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all ${
                value === type
                  ? 'border-[#0071E3] bg-[#0071E3]/10'
                  : 'border-[var(--color-border-default)] hover:border-[var(--color-border-default)] hover:bg-[var(--color-secondary)]'
              }`}
            >
              <VennIcon type={type} active={value === type} />
              <span className={`text-[10px] font-medium ${
                value === type ? 'text-[#0071E3]' : 'text-[var(--color-text-secondary)]'
              }`}>
                {label}
              </span>
            </button>
            {hoveredType === type && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-[#1C1C1E] text-white text-[10px] whitespace-nowrap z-50 shadow-lg pointer-events-none">
                {tooltip}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
