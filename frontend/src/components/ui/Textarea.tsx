import React from 'react'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  required?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    const errorId = error && textareaId ? `${textareaId}-error` : undefined

    return (
      <div className="flex flex-col">
        {label && (
          <label
            htmlFor={textareaId}
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
        <textarea
          ref={ref}
          id={textareaId}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          disabled={props.disabled}
          className={[
            'min-h-[80px] rounded-md border p-3 text-[13px] text-[var(--color-text-primary)] transition-colors duration-150',
            'bg-black/[0.04] dark:bg-white/[0.06]',
            'placeholder:text-[var(--color-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'disabled:opacity-[0.45] disabled:cursor-not-allowed',
            'resize-y',
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

Textarea.displayName = 'Textarea'

export default Textarea
