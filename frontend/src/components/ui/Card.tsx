import React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', padding = 'md' }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          // Surface background
          'bg-[#ffffff] dark:bg-[#1C1C1E]',
          // Border
          'border border-[var(--color-border-default)]',
          // Border radius 12px
          'rounded-lg',
          // Shadow: sm in light, md in dark
          'shadow-sm dark:shadow-md',
          // Padding
          paddingClasses[padding],
          // Custom classes
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
