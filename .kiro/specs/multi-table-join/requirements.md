# Requirements Document

## Introduction

This feature enhances the multi-table join experience in the Daflow workflow editor. It improves the Join node configuration panel with visual join type selection, column-aware key selectors, result preview, auto-suggestion of matching columns, and composite key support. It also introduces UX improvements for connecting multiple data sources and adds a mini ER-diagram relationship visualization panel.

## Glossary

- **Workflow_Editor**: The React Flow-based canvas where users build data processing workflows by connecting nodes
- **Join_Node**: A transformation node that merges two DataFrames (left and right) using pandas merge operations
- **Config_Panel**: The right-side panel that renders node-specific configuration forms when a node is selected
- **Data_Source_Node**: A source node that provides tabular data — either a File Upload node or a Database Query node
- **Join_Key**: One or more columns used to match rows between two DataFrames during a join operation
- **Composite_Key**: A join key consisting of two or more columns that together uniquely identify the relationship between tables
- **Column_Schema**: The list of column names and their data types extracted from a connected DataFrame
- **Relationship_Panel**: A mini ER-diagram overlay that visualizes data source connections and join relationships within the workflow
- **Join_Type**: The merge strategy used when combining two DataFrames (INNER, LEFT, RIGHT, OUTER, CROSS)
- **Auto_Suggest**: The system behavior that identifies and recommends columns with matching names or compatible types across connected DataFrames

## Requirements

### Requirement 1: Join Type Visual Selector

**User Story:** As a data analyst, I want to select the join type from a visual selector with diagrams, so that I can understand the effect of each join strategy without memorizing SQL terminology.

#### Acceptance Criteria

1. WHEN the user opens the Join_Node Config_Panel, THE Config_Panel SHALL display a visual selector showing all five Join_Type options (INNER, LEFT, RIGHT, OUTER, CROSS) with Venn-diagram-style icons
2. WHEN the user hovers over a Join_Type option, THE Config_Panel SHALL display a tooltip explaining the join behavior in plain language
3. WHEN the user selects a Join_Type, THE Config_Panel SHALL update the Join_Node configuration and persist the selection
4. THE Config_Panel SHALL highlight the currently active Join_Type with a distinct visual indicator

### Requirement 2: Column Key Selector with Schema Awareness

**User Story:** As a data analyst, I want to select join keys from dropdown menus that show columns from both connected tables, so that I can configure joins without manually typing column names.

#### Acceptance Criteria

1. WHEN both left and right Data_Source_Nodes are connected to the Join_Node, THE Config_Panel SHALL populate dropdown selectors with the Column_Schema from each connected DataFrame
2. WHEN only one Data_Source_Node is connected, THE Config_Panel SHALL display the available columns for the connected side and show a placeholder message for the unconnected side
3. WHEN the user selects a column from the left dropdown, THE Config_Panel SHALL set it as the left join key in the Join_Node configuration
4. WHEN the user selects a column from the right dropdown, THE Config_Panel SHALL set it as the right join key in the Join_Node configuration
5. IF a previously selected join key column no longer exists in the connected DataFrame schema, THEN THE Config_Panel SHALL display a warning indicator and clear the invalid selection

### Requirement 3: Auto-Suggest Matching Columns

**User Story:** As a data analyst, I want the system to suggest matching column names between connected tables, so that I can configure joins faster without scanning column lists manually.

#### Acceptance Criteria

1. WHEN both left and right Data_Source_Nodes are connected to the Join_Node, THE Auto_Suggest SHALL identify columns with identical names across both DataFrames and display them as recommended join keys
2. WHEN no exact name matches exist, THE Auto_Suggest SHALL identify columns with similar names (case-insensitive partial match) and present them as secondary suggestions
3. WHEN the user has not yet configured a join key, THE Config_Panel SHALL pre-select the top Auto_Suggest recommendation
4. WHEN the user dismisses an Auto_Suggest recommendation, THE Config_Panel SHALL not re-suggest the same column pair until the connected sources change

### Requirement 4: Composite Key Support

**User Story:** As a data analyst, I want to join tables on multiple columns simultaneously, so that I can handle composite key relationships between datasets.

#### Acceptance Criteria

1. THE Config_Panel SHALL provide an "Add key pair" action that allows the user to specify additional join key column pairs
2. WHEN the user adds multiple key pairs, THE Join_Node SHALL pass all specified columns as a list to the pandas merge operation
3. WHEN the user removes a key pair, THE Config_Panel SHALL update the Join_Node configuration to exclude the removed pair
4. THE Config_Panel SHALL display all configured key pairs in a vertically stacked list with individual remove actions
5. IF the user configures zero key pairs and the Join_Type is not CROSS, THEN THE Config_Panel SHALL display a validation error indicating that at least one key pair is required

### Requirement 5: Join Result Preview

**User Story:** As a data analyst, I want to preview the first rows of the join result before running the full workflow, so that I can verify the join configuration is correct.

#### Acceptance Criteria

1. WHEN both Data_Source_Nodes are connected and at least one join key is configured, THE Config_Panel SHALL display a "Preview" button
2. WHEN the user clicks the Preview button, THE Workflow_Editor SHALL send a preview request to the backend with the current join configuration and return the first 10 rows of the merged result
3. WHILE the preview request is in progress, THE Config_Panel SHALL display a loading indicator
4. WHEN the preview result is received, THE Config_Panel SHALL render the result as a compact table showing column headers and row values
5. IF the preview request fails due to incompatible column types or missing data, THEN THE Config_Panel SHALL display a descriptive error message explaining the failure reason
6. WHEN the user changes the join configuration (type, keys), THE Config_Panel SHALL invalidate the current preview and hide the stale result

### Requirement 6: Smart Source Connection Suggestion

**User Story:** As a data analyst, I want the editor to suggest connecting a new data source to an existing one via a Join node, so that I can build multi-table workflows more intuitively.

#### Acceptance Criteria

1. WHEN the user adds a second Data_Source_Node to a workflow that already contains one Data_Source_Node with no downstream Join_Node, THE Workflow_Editor SHALL display a non-blocking suggestion tooltip offering to connect them via a Join_Node
2. WHEN the user accepts the suggestion, THE Workflow_Editor SHALL create a new Join_Node and connect both Data_Source_Nodes to its left and right input handles
3. WHEN the user dismisses the suggestion, THE Workflow_Editor SHALL hide the tooltip and not re-display it for the same pair of nodes
4. THE suggestion tooltip SHALL appear near the newly added Data_Source_Node and auto-dismiss after 8 seconds if not interacted with

### Requirement 7: Add Another Table Quick Action

**User Story:** As a data analyst, I want a quick action on the Join node to add another data source, so that I can extend multi-table joins without navigating the node panel.

#### Acceptance Criteria

1. WHEN the user selects a Join_Node, THE Config_Panel SHALL display an "Add another table" action button
2. WHEN the user clicks the "Add another table" button, THE Workflow_Editor SHALL create a new Data_Source_Node (File Upload by default) and connect it to the Join_Node right input handle
3. IF the Join_Node right input handle is already connected, THEN THE Workflow_Editor SHALL create a new Join_Node chained after the current one and connect the new Data_Source_Node to the new Join_Node right input handle

### Requirement 8: Table Relationship Visualization Panel

**User Story:** As a data analyst, I want to see a mini ER-diagram showing all data sources and their join relationships, so that I can understand the overall data model of my workflow at a glance.

#### Acceptance Criteria

1. THE Workflow_Editor SHALL provide a toggle button to open the Relationship_Panel as a floating overlay
2. WHEN the Relationship_Panel is open, THE Relationship_Panel SHALL display all Data_Source_Nodes in the current workflow as entity boxes with their table/file names
3. WHEN two Data_Source_Nodes are connected through a Join_Node, THE Relationship_Panel SHALL draw a line between them labeled with the Join_Type and join key column names
4. WHEN the user hovers over an entity box in the Relationship_Panel, THE Relationship_Panel SHALL display a tooltip listing the column names of that data source
5. WHEN the user clicks an entity box or relationship line in the Relationship_Panel, THE Workflow_Editor SHALL select and center the corresponding node on the main canvas
6. WHEN the workflow graph changes (nodes added, removed, or reconnected), THE Relationship_Panel SHALL update its visualization within 500 milliseconds

### Requirement 9: Visual Connection Indicators on Canvas

**User Story:** As a data analyst, I want visual indicators on the canvas showing which tables are connected via joins, so that I can quickly identify data relationships without opening a separate panel.

#### Acceptance Criteria

1. WHEN two Data_Source_Nodes are connected through a Join_Node, THE Workflow_Editor SHALL display a subtle badge or icon on the Join_Node edge indicating the Join_Type
2. WHEN the user hovers over a Join_Node edge badge, THE Workflow_Editor SHALL display a tooltip showing the join key columns and row count from the last execution
3. THE visual indicators SHALL use consistent iconography matching the Join_Type visual selector icons from the Config_Panel

### Requirement 10: Backend Preview Endpoint

**User Story:** As a developer, I want a dedicated backend endpoint for join preview, so that the frontend can request partial join results without executing the full workflow.

#### Acceptance Criteria

1. THE backend SHALL expose a POST endpoint that accepts left DataFrame sample, right DataFrame sample, join configuration (type, keys, suffixes), and returns the first 10 rows of the merged result
2. WHEN the provided join keys do not exist in the sample DataFrames, THE backend endpoint SHALL return a 422 response with a descriptive error message
3. WHEN the join operation produces an empty result, THE backend endpoint SHALL return a 200 response with an empty rows array and a message indicating no matching rows were found
4. THE backend endpoint SHALL limit processing to sample data (maximum 1000 rows per side) to maintain response times below 2 seconds
