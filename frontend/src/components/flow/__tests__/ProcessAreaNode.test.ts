import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { ProcessAreaColor, ProcessAreaData } from '../ProcessAreaNode'

/**
 * Property 5: Process area persistence round-trip
 *
 * For any process area with title, description, color, position, and size,
 * serializing to `graph_data` JSON and deserializing SHALL produce an
 * equivalent process area object.
 *
 * **Validates: Requirements 3.7**
 */

const PROCESS_AREA_COLORS: ProcessAreaColor[] = ['blue', 'green', 'orange', 'purple', 'gray']
const jsonSafeCoordinate = fc
  .double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true })
  .filter((value) => !Object.is(value, -0))

/** Arbitrary for generating random ProcessAreaData objects */
const processAreaDataArb: fc.Arbitrary<ProcessAreaData> = fc.record({
  title: fc.string({ minLength: 0, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 500 }),
  color: fc.constantFrom(...PROCESS_AREA_COLORS),
  width: fc.integer({ min: 200, max: 5000 }),
  height: fc.integer({ min: 150, max: 5000 }),
})

/** Arbitrary for generating a full process area node as stored in graph_data */
const processAreaNodeArb = fc.record({
  id: fc.uuid(),
  type: fc.constant('process_area' as const),
  position: fc.record({
    x: jsonSafeCoordinate,
    y: jsonSafeCoordinate,
  }),
  data: processAreaDataArb,
  style: fc.record({
    width: fc.integer({ min: 200, max: 5000 }),
    height: fc.integer({ min: 150, max: 5000 }),
  }),
})

describe('Property 5: Process area persistence round-trip', () => {
  it('ProcessAreaData survives JSON serialize/deserialize round-trip', () => {
    fc.assert(
      fc.property(processAreaDataArb, (data: ProcessAreaData) => {
        const serialized = JSON.stringify(data)
        const deserialized: ProcessAreaData = JSON.parse(serialized)

        expect(deserialized.title).toBe(data.title)
        expect(deserialized.description).toBe(data.description)
        expect(deserialized.color).toBe(data.color)
        expect(deserialized.width).toBe(data.width)
        expect(deserialized.height).toBe(data.height)
        expect(deserialized).toEqual(data)
      }),
      { numRuns: 100 }
    )
  })

  it('full process area node (with position and style) survives JSON round-trip', () => {
    fc.assert(
      fc.property(processAreaNodeArb, (node) => {
        const serialized = JSON.stringify(node)
        const deserialized = JSON.parse(serialized)

        // Verify all top-level fields
        expect(deserialized.id).toBe(node.id)
        expect(deserialized.type).toBe('process_area')

        // Verify position
        expect(deserialized.position.x).toBe(node.position.x)
        expect(deserialized.position.y).toBe(node.position.y)

        // Verify data (ProcessAreaData)
        expect(deserialized.data.title).toBe(node.data.title)
        expect(deserialized.data.description).toBe(node.data.description)
        expect(deserialized.data.color).toBe(node.data.color)
        expect(deserialized.data.width).toBe(node.data.width)
        expect(deserialized.data.height).toBe(node.data.height)

        // Verify style dimensions
        expect(deserialized.style.width).toBe(node.style.width)
        expect(deserialized.style.height).toBe(node.style.height)

        // Full deep equality
        expect(deserialized).toEqual(node)
      }),
      { numRuns: 100 }
    )
  })
})
