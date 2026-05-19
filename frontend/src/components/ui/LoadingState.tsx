import React from 'react'

export interface LoadingStateProps {
  message?: string
  variant?: 'center' | 'grid' | 'list' | 'modal'
  rows?: number
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, variant = 'center', rows = 6 }) => {
  if (variant === 'grid') {
    return (
      <div className="space-y-4">
        {message && <LoadingMessage message={message} />}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <Skeleton className="w-7 h-7 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-7/12 rounded-md mb-2" />
              <Skeleton className="h-3 w-10/12 rounded-md mb-5" />
              <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {message && <LoadingMessage message={message} />}
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-5/12 rounded-md" />
                <Skeleton className="h-3 w-8/12 rounded-md" />
              </div>
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'modal') {
    return (
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-0">
        <div className="p-3 grid sm:grid-cols-2 gap-2 max-h-[440px] overflow-hidden">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
              <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-8/12 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-7/12 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <aside className="border-l border-[var(--color-border-subtle)] p-4 bg-[var(--color-secondary)]/50">
          <Skeleton className="h-3 w-20 rounded-md mb-3" />
          <Skeleton className="h-5 w-7/12 rounded-md mb-3" />
          <Skeleton className="h-3 w-full rounded-md mb-2" />
          <Skeleton className="h-3 w-9/12 rounded-md mb-4" />
          <Skeleton className="h-[210px] w-full rounded-xl" />
          {message && <p className="mt-3 text-[12px] text-[var(--color-text-muted)]">{message}</p>}
        </aside>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto py-16 space-y-4">
      {message && <LoadingMessage message={message} />}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-5/12 rounded-md" />
            <Skeleton className="h-3 w-9/12 rounded-md" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function LoadingMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center text-[13px] text-[var(--color-text-muted)]">
      <span>{message}</span>
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--color-secondary)] ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-[skeleton-shimmer_1.35s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/35 dark:via-white/10 to-transparent" />
    </div>
  )
}

export default LoadingState
