import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = error && inputId ? `${inputId}-error` : undefined

    return (
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5"
          >
            {label}
            {required && (
              <span className="text-danger ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          disabled={props.disabled}
          className={[
            'h-9 rounded-md border px-3 text-[13px] text-[var(--color-text-primary)] transition-colors duration-150',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'placeholder:text-[var(--color-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'disabled:opacity-[0.45] disabled:cursor-not-allowed',
            error
              ? 'border-danger'
              : 'border-[var(--color-border-default)]',
            className,
          ].join(' ')}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className="text-[11px] text-danger mt-1"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
