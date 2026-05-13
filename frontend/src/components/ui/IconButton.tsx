import React from 'react'

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  'aria-label': string // Required for accessibility
  size?: 'sm' | 'md' | 'lg'
}

const iconSizeClasses: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', disabled, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          // Base styles — ghost button with minimum 28×28px tap target
          'inline-flex items-center justify-center',
          'min-w-7 min-h-7',
          'rounded-md',
          // Ghost treatment
          'bg-transparent',
          'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
          // Active state
          'active:scale-[0.97]',
          // Focus ring for keyboard navigation
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          // Transition
          'transition-all duration-150',
          // Disabled state
          disabled && 'opacity-[0.45] cursor-not-allowed pointer-events-none',
          // Custom classes
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        <span className={['inline-flex shrink-0', iconSizeClasses[size]].join(' ')}>
          {icon}
        </span>
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

export default IconButton
