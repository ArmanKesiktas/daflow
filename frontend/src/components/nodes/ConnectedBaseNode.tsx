import { type ReactNode } from 'react'
import { BaseNode } from './BaseNode'
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu'
import type { NodeStatus, NodeCategory } from '../../types/workflow'

interface ConnectedBaseNodeProps {
  /** The node's unique ID — used to wire up context menu actions */
  nodeId: string
  label: string
  icon: string
  status: NodeStatus
  color: string
  category?: NodeCategory
  children?: ReactNode
  selected?: boolean
  note?: string
  error_message?: unknown
  cached?: unknown
  disabled?: boolean
}

/**
 * A wrapper around BaseNode that automatically provides context menu actions
 * based on the node ID. Use this in place of BaseNode in node components
 * to get full context menu support without manual wiring.
 */
export function ConnectedBaseNode({ nodeId, disabled, ...props }: ConnectedBaseNodeProps) {
  const contextMenu = useNodeContextMenu(nodeId)

  return (
    <BaseNode
      {...props}
      disabled={disabled}
      contextMenu={contextMenu}
    />
  )
}
