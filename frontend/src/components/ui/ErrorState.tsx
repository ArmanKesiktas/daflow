import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Warning icon in danger color */}
      <AlertTriangle className="w-5 h-5 text-danger mb-3" />

      {/* Error title */}
      <h3 className="text-[15px] font-medium text-[var(--color-text-primary)] mb-1">
        {title}
      </h3>

      {/* Error description */}
      <p className="text-[13px] text-[var(--color-text-primary)] opacity-40 max-w-[320px] mb-4">
        {message}
      </p>

      {/* Retry button */}
      <Button variant="secondary" size="md" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

ErrorState.displayName = 'ErrorState'

export default ErrorState
