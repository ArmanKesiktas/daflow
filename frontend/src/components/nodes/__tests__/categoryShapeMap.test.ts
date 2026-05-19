import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { categoryShapeMap } from '../BaseNode'
import type { NodeCategory } from '../../../types/workflow'

/**
 * Property 7: Category-to-shape mapping is total
 *
 * For any valid NodeCategory value, the categoryShapeMap SHALL return
 * a defined shape class string (never undefined or empty).
 *
 * **Validates: Requirements 6.8**
 */

const ALL_NODE_CATEGORIES: NodeCategory[] = [
  'source',
  'preparation',
  'analysis',
  'ml',
  'visualization',
  'output',
  'utility',
  'big_data',
  'transformation',
]

describe('Property 7: Category-to-shape mapping is total', () => {
  it('every NodeCategory value maps to a non-empty shape class string', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_NODE_CATEGORIES),
        (category: NodeCategory) => {
          const shapeClass = categoryShapeMap[category]
          // Must be defined (not undefined)
          expect(shapeClass).toBeDefined()
          // Must be a string
          expect(typeof shapeClass).toBe('string')
          // Must be non-empty
          expect(shapeClass.length).toBeGreaterThan(0)
          // Must not be only whitespace
          expect(shapeClass.trim().length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('categoryShapeMap has an entry for every known NodeCategory', () => {
    for (const category of ALL_NODE_CATEGORIES) {
      const shapeClass = categoryShapeMap[category]
      expect(shapeClass).toBeDefined()
      expect(shapeClass).not.toBe('')
    }
  })
})
