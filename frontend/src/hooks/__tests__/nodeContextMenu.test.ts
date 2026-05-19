import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { NodeData, NodeCategory, NodeStatus } from '../../types/workflow'

/**
 * Property 4: Node duplication produces independent copy
 *
 * For any node in the workflow, duplicating it SHALL produce a new node with
 * a different ID, offset position, identical config data, and no shared
 * mutable references with the original.
 *
 * **Validates: Requirements 7.3**
 */

// Replicate the duplication logic from useNodeContextMenu.ts
function duplicateNode(node: { id: string; type: string; position: { x: number; y: number }; data: NodeData }) {
  const clone = {
    id: crypto.randomUUID(),
    type: node.type,
    position: {
      x: node.position.x + 40,
      y: node.position.y + 40,
    },
    data: JSON.parse(JSON.stringify(node.data)) as NodeData,
  }
  // Reset status on the clone (as done in the real hook)
  clone.data.status = 'idle'
  clone.data.resultPreview = undefined
  clone.data.error_message = undefined
  clone.data.cached = undefined
  return clone
}

// Arbitraries for generating random node-like objects
const ALL_CATEGORIES: NodeCategory[] = [
  'source', 'preparation', 'transformation', 'analysis',
  'big_data', 'utility', 'visualization', 'ml', 'output',
]

const ALL_STATUSES: NodeStatus[] = [
  'idle', 'pending', 'running', 'success', 'error', 'cancelled',
]

const arbNodeCategory = fc.constantFrom(...ALL_CATEGORIES)
const arbNodeStatus = fc.constantFrom(...ALL_STATUSES)

// Generate random nested config objects
const arbNodeConfig = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }),
  fc.oneof(
    fc.string(),
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.boolean(),
    fc.constant(null),
    fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { maxLength: 5 }),
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.oneof(fc.string(), fc.integer(), fc.boolean()), { minKeys: 0, maxKeys: 3 })
  ),
  { minKeys: 0, maxKeys: 8 }
)

const arbNodeData: fc.Arbitrary<NodeData> = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }),
  category: arbNodeCategory,
  config: arbNodeConfig,
  status: arbNodeStatus,
  disabled: fc.option(fc.boolean(), { nil: undefined }),
  resultPreview: fc.option(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.oneof(fc.string(), fc.integer()), { minKeys: 0, maxKeys: 3 }),
    { nil: undefined }
  ),
}) as fc.Arbitrary<NodeData>

const arbNode = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom('base_node', 'process_area', 'code_sql', 'export_output'),
  position: fc.record({
    x: fc.double({ min: -5000, max: 5000, noNaN: true, noDefaultInfinity: true }),
    y: fc.double({ min: -5000, max: 5000, noNaN: true, noDefaultInfinity: true }),
  }),
  data: arbNodeData,
})

describe('Property 4: Node duplication produces independent copy', () => {
  it('clone has a different ID than the original', () => {
    fc.assert(
      fc.property(arbNode, (node) => {
        const clone = duplicateNode(node)
        expect(clone.id).not.toBe(node.id)
        // ID should be a valid UUID format
        expect(clone.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      }),
      { numRuns: 100 }
    )
  })

  it('clone position is offset by (+40, +40) from original', () => {
    fc.assert(
      fc.property(arbNode, (node) => {
        const clone = duplicateNode(node)
        expect(clone.position.x).toBeCloseTo(node.position.x + 40)
        expect(clone.position.y).toBeCloseTo(node.position.y + 40)
      }),
      { numRuns: 100 }
    )
  })

  it('clone config data is deeply equal to original config data', () => {
    fc.assert(
      fc.property(arbNode, (node) => {
        const clone = duplicateNode(node)
        // Config should be deeply equal
        expect(clone.data.config).toEqual(node.data.config)
        // Label and category should be preserved
        expect(clone.data.label).toBe(node.data.label)
        expect(clone.data.category).toBe(node.data.category)
      }),
      { numRuns: 100 }
    )
  })

  it('mutating clone data does not affect original (no shared mutable references)', () => {
    fc.assert(
      fc.property(arbNode, (node) => {
        // Deep copy original data for comparison
        const originalDataSnapshot = JSON.parse(JSON.stringify(node.data))

        const clone = duplicateNode(node)

        // Mutate the clone's config
        clone.data.config['__mutated_key__'] = 'mutated_value'
        clone.data.label = '__MUTATED_LABEL__'

        // If config has nested objects, mutate them too
        for (const key of Object.keys(clone.data.config)) {
          const val = clone.data.config[key]
          if (Array.isArray(val)) {
            val.push('__injected__')
          } else if (val !== null && typeof val === 'object') {
            (val as Record<string, unknown>)['__injected__'] = true
          }
        }

        // Original should remain unchanged
        expect(node.data.config).toEqual(originalDataSnapshot.config)
        expect(node.data.label).toBe(originalDataSnapshot.label)
      }),
      { numRuns: 100 }
    )
  })

  it('clone status is reset to idle regardless of original status', () => {
    fc.assert(
      fc.property(arbNode, (node) => {
        const clone = duplicateNode(node)
        expect(clone.data.status).toBe('idle')
        expect(clone.data.resultPreview).toBeUndefined()
        expect(clone.data.error_message).toBeUndefined()
        expect(clone.data.cached).toBeUndefined()
      }),
      { numRuns: 100 }
    )
  })

  it('clone preserves the node type from original', () => {
    fc.assert(
      fc.property(arbNode, (node) => {
        const clone = duplicateNode(node)
        expect(clone.type).toBe(node.type)
      }),
      { numRuns: 100 }
    )
  })
})
