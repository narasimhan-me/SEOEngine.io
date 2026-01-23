# Right Context Panel - Behavioral Contract

## 1. Trigger Mechanics
- **Automatic (System-Driven)**: 
  - Opens when a single row is selected in a `Dense Table`.
  - Opens upon navigation to a `Detail View` if the primary object has unresolved critical actions.
- **Requested (User-Driven)**:
  - Invoked via the "Info" icon or "View Details" button on any list item.
  - Toggled via the "Panel" icon in the Top Bar (persists last state).

## 2. Navigation Behavior
- **Context Preservation**: The panel stays open (with updated data) when paging through items in a list (e.g., clicking "Next Product").
- **Auto-Dismissal**: The panel closes automatically if the user switches high-level navigation segments (e.g., moving from "Products" to "Automation").
- **Persistence Toggle**: Users can "Pin" the panel to prevent auto-dismissal.

## 3. Interaction Patterns
- **Complement vs Replace**:
  - In **Operational Command**, it *complements* the canvas by shifting content to the left, maintaining visibility of the selected row.
  - In **Contextual Specialist**, it *overlays* the canvas, providing a focus on the panel's data while blurring out background distractions.
- **Dismissal**: Must support `ESC` key, a clear close `(X)` button, and clicking outside (if in Overlay mode).

## 4. Link Policy
- **Default**: No in-body navigation links; header external-link is the primary navigation affordance.
- **Exception**: Issue Details may include a single guidance CTA "View playbook" per ISSUE-TO-ACTION-GUIDANCE-1 (navigation-only; no execution).
