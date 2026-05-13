import React from 'react'

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Icon at 20px with 30-40% opacity */}
      <div className="w-5 h-5 text-[var(--color-text-primary)] opacity-[0.35] mb-4">
        {icon}
      </div>

      {/* Title: 15px medium weight */}
      <h3 className="text-[15px] font-medium text-[var(--color-text-primary)] mb-1.5">
        {title}
      </h3>

      {/* Description: 13px at 40% opacity */}
      <p className="text-[13px] text-[var(--color-text-primary)] opacity-40 max-w-[280px]">
        {description}
      </p>

      {/* Optional action */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'

export default EmptyState
