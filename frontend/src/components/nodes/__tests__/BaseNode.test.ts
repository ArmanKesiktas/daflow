import { describe, it, expect } from 'vitest'
import { statusAnimation } from '../BaseNode'
import type { NodeStatus } from '../../../types/workflow'

describe('statusAnimation mapping', () => {
  it('maps idle status to empty string (no animation)', () => {
    expect(statusAnimation['idle']).toBe('')
  })

  it('maps pending status to animate-node-pulse-blue', () => {
    expect(statusAnimation['pending']).toBe('animate-node-pulse-blue')
  })

  it('maps running status to animate-node-pulse-blue', () => {
    expect(statusAnimation['running']).toBe('animate-node-pulse-blue')
  })

  it('maps success status to animate-node-glow-green', () => {
    expect(statusAnimation['success']).toBe('animate-node-glow-green')
  })

  it('maps error status to animate-node-glow-red', () => {
    expect(statusAnimation['error']).toBe('animate-node-glow-red')
  })

  it('maps cancelled status to animate-node-glow-orange', () => {
    expect(statusAnimation['cancelled']).toBe('animate-node-glow-orange')
  })

  it('returns undefined for unknown status values (fallback to idle behavior)', () => {
    // When accessed with an unknown key, the Record returns undefined
    // The BaseNode component uses `?? ''` to fall back to no animation (idle behavior)
    const unknownStatus = 'unknown_status' as NodeStatus
    expect(statusAnimation[unknownStatus]).toBeUndefined()
  })

  it('covers all defined NodeStatus values', () => {
    const expectedStatuses: NodeStatus[] = ['idle', 'pending', 'running', 'success', 'error', 'cancelled']
    for (const status of expectedStatuses) {
      expect(statusAnimation[status]).toBeDefined()
    }
  })
})
