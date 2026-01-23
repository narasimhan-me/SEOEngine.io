# Right Context Panel - Behavioral Contract

> **Updated:** RIGHT-CONTEXT-PANEL-AUTONOMY-1 (Autonomous panel behavior)

## 1. Trigger Mechanics

### [RIGHT-CONTEXT-PANEL-AUTONOMY-1] Autonomous Context-Driven Behavior
- **Automatic (System-Driven)**:
  - Opens automatically when navigating to entity detail routes:
    - `/projects/{projectId}/products/{productId}` → product context
    - `/projects/{projectId}/pages/{pageId}` → page context
    - `/projects/{projectId}/collections/{collectionId}` → collection context
    - `/projects/{projectId}/playbooks/{playbookId}` → playbook context
  - Closes automatically when navigating to contextless routes:
    - `/projects` (projects list)
    - `/dashboard`
    - List pages without selection
  - Opens when a single row is selected in a `Dense Table` (issues, playbooks lists).
- **URL as Source of Truth**:
  - Panel state is synced to URL params: `panel`, `entityType`, `entityId`, `entityTitle`
  - Deep-links (PANEL-DEEP-LINKS-1) restore panel state deterministically

### [REMOVED] User-Driven Mode Controls
- ~~"Panel" icon in the Top Bar~~ → **Removed** (no global toggle)
- ~~"Pin" toggle~~ → **Removed** (no pinning)
- ~~Width toggle~~ → **Removed** (fixed default width)
- ~~View tabs (Details/Recommendations/History/Help)~~ → **Removed** (Details view only)

## 2. Navigation Behavior
- **Context Preservation**: The panel stays open (with updated data) when switching between items in a list selection.
- **Autonomous Close**: The panel closes automatically when navigating to contextless routes (no meaningful entity context).
- **Dismissal Respect**: User-driven close (X, ESC, scrim click) sets dismissal for the current context; dismissal is respected until navigating to a different entity.

## 3. Interaction Patterns
- **Complement vs Replace**:
  - Desktop (≥1024px): Part of flex layout, shifts content to the left.
  - Narrow (<1024px): Overlay mode with scrim; click scrim to close.
- **Dismissal**: Must support `ESC` key, close `(X)` button, and clicking scrim (in Overlay mode).
- **[REMOVED]** ~~Cmd/Ctrl + '.' shortcut~~ → Removed

## 4. Link Policy
- **Single Rule**: No in-body navigation links; header external-link is the only navigation affordance.
- **[RIGHT-CONTEXT-PANEL-AUTONOMY-1]** All in-body CTAs removed (including "View playbook"). Guidance sections are informational only.
