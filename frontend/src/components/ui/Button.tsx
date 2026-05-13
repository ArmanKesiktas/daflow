import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:brightness-110',
  secondary:
    'bg-black/[0.05] dark:bg-white/[0.07] text-[var(--color-text-primary)] hover:bg-black/[0.09] dark:hover:bg-white/[0.11]',
  ghost:
    'bg-transparent text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
  danger: 'bg-[var(--color-danger)] text-white hover:brightness-110',
  outline:
    'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-7 px-2 rounded-sm',
  md: 'h-8 px-3 rounded-md',
  lg: 'h-9 px-4 rounded-md',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          // Base styles
          'inline-flex items-center justify-center gap-1.5',
          'text-xs font-medium',
          'transition-all duration-150',
          'select-none whitespace-nowrap',
          // Focus ring for keyboard navigation
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          // Active state
          'active:scale-[0.97]',
          // Disabled state
          isDisabled && 'opacity-[0.45] cursor-not-allowed pointer-events-none',
          // Variant styles
          variantClasses[variant],
          // Size styles
          sizeClasses[size],
          // Custom classes
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            <span className="invisible">{children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="inline-flex shrink-0">{icon}</span>
            )}
            {children && <span>{children}</span>}
            {icon && iconPosition === 'right' && (
              <span className="inline-flex shrink-0">{icon}</span>
            )}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

/** 14px animated spinner for loading state */
function Spinner() {
  return (
    <svg
      className="absolute animate-spin"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default Button
