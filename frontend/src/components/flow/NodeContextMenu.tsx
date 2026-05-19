import { useState, useEffect, useRef, type ReactNode } from 'react'

export interface NodeContextMenuProps {
  onConfigure: () => void
  onRename: () => void
  onDuplicate: () => void
  onDisable: () => void
  onRun: () => void
  onViewOutput: () => void
  onDelete: () => void
  isDisabled?: boolean
}

interface MenuItem {
  id: string
  label: string
  icon: ReactNode
  danger?: boolean
  handler: () => void
}

/**
 * Three-dot context menu for workflow nodes.
 * Renders a trigger button and a dropdown with common node actions.
 */
export function NodeContextMenu({
  onConfigure,
  onRename,
  onDuplicate,
  onDisable,
  onRun,
  onViewOutput,
  onDelete,
  isDisabled = false,
}: NodeContextMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const menuItems: MenuItem[] = [
    { id: 'configure', label: 'Configure', icon: <SettingsIcon />, handler: onConfigure },
    { id: 'rename', label: 'Rename', icon: <RenameIcon />, handler: onRename },
    { id: 'duplicate', label: 'Duplicate', icon: <DuplicateIcon />, handler: onDuplicate },
    { id: 'disable', label: isDisabled ? 'Enable' : 'Disable', icon: <DisableIcon />, handler: onDisable },
    { id: 'run', label: 'Run this node', icon: <RunIcon />, handler: onRun },
    { id: 'view_output', label: 'View output', icon: <OutputIcon />, handler: onViewOutput },
    { id: 'delete', label: 'Delete', icon: <DeleteIcon />, danger: true, handler: onDelete },
  ]

  return (
    <div className="relative">
      {/* Three-dot trigger */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
        aria-label="Node actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--color-text-muted)]">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-xl backdrop-blur-xl py-1 overflow-hidden"
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation()
                item.handler()
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors text-left ${
                item.danger
                  ? 'text-[#FF453A] hover:bg-[#FF453A]/[0.08]'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)]'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-70">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Inline SVG Icons ─────────────────────────────────────────────────────── */

function SettingsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function RenameIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function DuplicateIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function DisableIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

function RunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function OutputIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
