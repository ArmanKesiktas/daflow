import React from 'react'

export interface LoadingStateProps {
  message?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg
        className="w-5 h-5 animate-spin text-[var(--color-text-primary)] opacity-40"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <path
          d="M18 10a8 8 0 0 0-8-8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {message && (
        <p className="text-[13px] text-[var(--color-text-muted)] mt-3">
          {message}
        </p>
      )}
    </div>
  )
}

export default LoadingState
