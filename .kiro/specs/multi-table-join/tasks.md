# Implementation Plan: Multi-Table Join

## Overview

This plan implements the enhanced multi-table join experience for the Daflow workflow editor. The implementation is ordered by dependency: foundation (node registration, handles, backend), then config panel (type selector, key selectors, composite keys, auto-suggest, preview), then UX enhancements (smart suggestion, add another table, relationship panel, edge badges).

## Tasks

- [x] 1. Foundation — Node registration, handle update, and backend endpoint
  - [x] 1.1 Register JoinNode in frontend nodeTypes and backend NODE_REGISTRY
    - Import `JoinNode` from `TransformationNodes.tsx` in `nodeTypes.ts` and add `join_node: JoinNode` entry
    - Import `JoinProcessor` in `node_registry.py` and add `"join_node": JoinProcessor()` entry
    - Add `join_node` to `NODE_DEFINITIONS` in `NodePanel.tsx` with label "Join", category "transformation", icon "⋈", and default config `{ how: 'inner', keyPairs: [], suffixes: ['_x', '_y'], dismissedSuggestions: [] }`
    - _Requirements: 1.1, 2.1_

  - [x] 1.2 Update JoinNode handles to left_df/right_df
    - In `TransformationNodes.tsx`, replace the single `<Handle type="target" id="dataframe" />` with two target handles: `id="left_df"` at `top: 35%` and `id="right_df"` at `top: 65%`
    - Add visual labels ("L" / "R") next to each handle for clarity
    - Keep the source handle as `id="dataframe"`
    - _Requirements: 2.1, 2.2_

  - [x] 1.3 Enhance JoinProcessor for composite key support
    - In `backend/app/nodes/transformation/join.py`, update `execute()` to accept `left_on` and `right_on` as either `str` or `List[str]`
    - Normalize string values to single-element lists before passing to `pd.merge`
    - Read `keyPairs` from config and convert to `left_on`/`right_on` lists if `on`/`left_on`/`right_on` are not directly provided
    - _Requirements: 4.2_

  - [x] 1.4 Create backend POST /api/join/preview endpoint
    - Create `backend/app/api/routes/join.py` with Pydantic models `JoinPreviewRequest` and `JoinPreviewResponse`
    - Implement the preview logic: validate keys exist in data columns (return 422 if not), truncate input to 1000 rows per side, perform `pd.merge`, return first 10 rows
    - Return 200 with empty rows array and message when result is empty
    - Include the route in `backend/app/api/router.py`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x]* 1.5 Write property tests for backend join preview endpoint
    - **Property 10: Preview endpoint returns at most 10 rows**
    - **Property 11: Invalid join keys return 422**
    - **Property 12: Input truncation to 1000 rows**
    - **Validates: Requirements 10.1, 10.2, 10.4**

  - [x] 1.6 Add useUpstreamSchema hook to flowStore
    - Create `frontend/src/hooks/useUpstreamSchema.ts` that accepts `(nodeId, handleId)` and returns `ColumnMeta[] | null`
    - Traverse edges to find the incoming edge on the specified handle, then read `sourceNode.data.columns`
    - _Requirements: 2.1, 2.2_

- [x] 2. Checkpoint — Ensure all foundation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Config Panel — Join type selector, column selectors, composite keys
  - [x] 3.1 Create JoinTypeSelector component
    - Create `frontend/src/components/panels/JoinTypeSelector.tsx`
    - Render 5 join type options (INNER, LEFT, RIGHT, OUTER, CROSS) with inline SVG Venn-diagram icons
    - Highlight the active type with a distinct border/background
    - Show tooltip on hover explaining each join type in plain language
    - Call `onConfigChange('how', selectedType)` on selection
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Create JoinKeyPairList component
    - Create `frontend/src/components/panels/JoinKeyPairList.tsx`
    - Render a vertical list of key pairs, each with left dropdown, right dropdown, and a remove button
    - Include an "Add key pair" button at the bottom
    - Populate dropdowns from `leftSchema` and `rightSchema` props
    - Show validation error when non-CROSS join has zero key pairs
    - Show warning indicator when a selected column no longer exists in schema
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.3 Create suggestJoinKeys utility function
    - Create `frontend/src/utils/joinSuggestions.ts`
    - Implement `suggestJoinKeys(leftColumns, rightColumns, dismissed)` as a pure function
    - Return exact matches (same name) with confidence "exact"
    - Return fuzzy matches (case-insensitive substring) with confidence "fuzzy" when no exact matches exist
    - Filter out dismissed suggestions
    - _Requirements: 3.1, 3.2, 3.4_

  - [x]* 3.4 Write property tests for suggestJoinKeys
    - **Property 5: Auto-suggest exact match identification**
    - **Property 6: Auto-suggest fuzzy match fallback**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 3.5 Create JoinConfigPanel with auto-suggest integration
    - Create `frontend/src/components/panels/JoinConfigPanel.tsx`
    - Compose `JoinTypeSelector`, `JoinKeyPairList`, and preview section
    - Use `useUpstreamSchema` hook to get left/right schemas
    - Call `suggestJoinKeys` and pre-select top suggestion when config has no keys yet
    - Allow user to dismiss suggestions (store in `config.dismissedSuggestions`)
    - Include "Add another table" action button
    - _Requirements: 2.1, 3.3, 3.4, 7.1_

  - [x] 3.6 Wire JoinConfigPanel into ConfigPanel
    - In `ConfigPanel.tsx`, add a `node.type === 'join_node'` case that renders `<JoinConfigPanel />`
    - Pass `nodeId`, `config`, `leftSchema`, `rightSchema`, and `onConfigChange` props
    - Add `join_node` entry to `HELP_CONTENT` with concept and description
    - _Requirements: 1.1, 2.1_

  - [x]* 3.7 Write property tests for validateJoinConfig
    - Create `frontend/src/utils/joinValidation.ts` with `validateJoinConfig` function
    - **Property 4: Invalid join key detection**
    - **Property 7: Composite key list integrity**
    - **Property 8: Non-CROSS join requires at least one key pair**
    - **Validates: Requirements 2.5, 4.2, 4.3, 4.5**

- [x] 4. Config Panel — Join result preview
  - [x] 4.1 Create join API client
    - Create `frontend/src/api/join.ts` with `previewJoin(request: JoinPreviewRequest): Promise<JoinPreviewResponse>` function
    - POST to `/api/join/preview` with the join configuration and sample data
    - Handle error responses (422, 500) and return structured error info
    - _Requirements: 5.2_

  - [x] 4.2 Create JoinPreviewTable component
    - Create `frontend/src/components/panels/JoinPreviewTable.tsx`
    - Render a compact table with column headers and row values from preview response
    - Show loading spinner while request is in progress
    - Show descriptive error message on failure
    - Show "Preview" button only when both sources connected and at least one key configured
    - Invalidate (hide) stale preview when config changes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x]* 4.3 Write unit tests for JoinPreviewTable
    - Test preview button visibility conditions
    - Test loading indicator display
    - Test error message rendering
    - Test stale preview invalidation on config change
    - **Property 9: Config change invalidates preview**
    - **Validates: Requirements 5.1, 5.3, 5.5, 5.6**

- [x] 5. Checkpoint — Ensure all config panel tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. UX Enhancements — Smart suggestion, add another table, relationship panel, edge badges
  - [x] 6.1 Create SmartSourceSuggestion tooltip component
    - Create `frontend/src/components/flow/SmartSourceSuggestion.tsx`
    - Display a non-blocking tooltip near a newly added Data_Source_Node when another source exists without a downstream Join_Node
    - Offer to connect them via a new Join_Node (accept action creates Join_Node + edges)
    - Auto-dismiss after 8 seconds; dismiss action hides and prevents re-display for same pair
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Implement "Add another table" quick action logic
    - In `JoinConfigPanel`, implement the "Add another table" button handler
    - If right handle is unconnected: create a new File Upload node and connect to right_df
    - If right handle is already connected: create a new Join_Node chained after current, connect new File Upload to the new Join_Node's right_df
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 6.3 Create RelationshipPanel overlay component
    - Create `frontend/src/components/flow/RelationshipPanel.tsx`
    - Add a toggle button to the workflow editor toolbar to open/close the panel
    - Derive entities (source nodes) and relationships (join connections) from flowStore
    - Render entity boxes with table/file names, connected by lines labeled with join type and key columns
    - Show column list tooltip on entity hover
    - Click entity/line to select and center the corresponding node on canvas
    - Update visualization within 500ms when graph changes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 6.4 Create JoinEdgeBadge component
    - Create `frontend/src/components/flow/JoinEdgeBadge.tsx`
    - Display a subtle badge/icon on edges connecting to Join_Node showing the join type
    - Show tooltip on hover with join key columns and row count from last execution
    - Use consistent iconography matching JoinTypeSelector icons
    - _Requirements: 9.1, 9.2, 9.3_

  - [x]* 6.5 Write unit tests for UX enhancement components
    - Test SmartSourceSuggestion trigger conditions and auto-dismiss
    - Test RelationshipPanel entity rendering and click-to-select
    - Test JoinEdgeBadge tooltip content
    - _Requirements: 6.1, 6.4, 8.2, 8.5, 9.2_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript (frontend) and Python (backend) as established in the existing codebase
- All new components follow existing patterns: React Flow nodes, Zustand store, ConfigPanel rendering, FastAPI routes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "1.6"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.5", "3.7"] },
    { "id": 4, "tasks": ["3.6", "4.1"] },
    { "id": 5, "tasks": ["4.2"] },
    { "id": 6, "tasks": ["4.3", "6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4"] },
    { "id": 8, "tasks": ["6.5"] }
  ]
}
```
