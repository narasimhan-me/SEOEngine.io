# Engineering Implementation Contract: EngineO.ai Design System v1.5

## 1. COMPONENT INVENTORY

| Component | Purpose | Visibility Logic | Stability |
| :--- | :--- | :--- | :--- |
| **Global Top Bar** | Persistent system identity & global controls. | Always visible. | Core (v1.5) |
| **Left Navigation** | Primary segment navigation (Operate to Admin). | Always visible. Icon-only. No expand/collapse toggle. [FIXUP-1] | Core (v1.5) |
| **Center Work Canvas** | Primary viewport for data and workflows. | Always visible. Width adjusts to Nav/Panel state. | Core (v1.5) |
| **Right Context Panel** | Contextual metadata, history, and secondary actions. | Dynamic. Triggered by selection/intent. | Core (v1.5) |
| **Dense Tables** | Batch data management. | Page-specific in Center Canvas. | Core (v1.5) |
| **Lists / Cards** | Overview and high-level object summaries. | Page-specific in Center Canvas. | Core (v1.5) |
| **Modals / Overlays** | Blocking interruptions for critical input. | Triggered by user action (e.g., "Delete"). | Core (v1.5) |
| **Command Palette** | Global search and command shortcut entry. | Contextual (`CMD+K`). | Core (v1.5) |
| **Toasts / Notices** | Non-blocking system feedback. | Temporary (auto-dismiss). | Core (v1.5) |

---

## 2. BEHAVIORAL CONTRACTS

### 2.1 Right Context Panel Coordination
- **Triggers**:
  - **Implicit**: Row selection in a `Dense Table` opens a "Property Panel".
  - **Explicit**: Clicking an "Info" icon or "Details" button.
- **Pane Management**: 
  - **Pinned State**: Canvas shifts left to accommodate the panel. Total viewport width is shared.
  - **Overlay State**: Panel slides over the canvas edge (Mobile and specialist modes).
- **Navigation Persistence**: Panel state (open/closed) must persist during pagination (e.g., Next/Prev product), but must auto-close when switching Left Nav segments.

### 2.2 Focus & Keyboard
- **Focus Trap**: Only enforced in `Modals`.
- **Panel Close**: `ESC` key must trigger `ClosePanel` if a modal is not currently open.
- **Selection**: `Row Selection` != `Navigation`. Selecting a row updates the Context Panel but does not change the URL.

---

## 3. STATE & PROPS CONTRACT

### 3.1 Global State (Persistent)
- `theme`: `light | dark` (strictly mapped to `.dark` class).
- `shopifyEmbedded`: `boolean` (read from `data-shopify-embedded`).
- ~~`navState`: `collapsed | expanded`~~ (Removed in WORK-CANVAS-ARCHITECTURE-LOCK-1 FIXUP-1; left rail is icon-only always)

### 3.2 Component Props (Deterministic)
- **TopNav**: `(userProfile: object, activeContextTitle: string, globalSearchHandler: function)`.
- **RightPanel**: `(isOpen: boolean, isPinned: boolean, content: ReactNode, onDismiss: function)`.
- **DenseTable**: `(rows: Array, selectedRowId: string | null, onRowSelect: function)`.

---

## 4. DESIGN TOKEN USAGE RULES

### 4.1 Surface Elevation
- **Level 0 (Base)**: `var(--background)` - Main page background.
- **Level 1 (Card)**: `var(--surface-card)` - Persistent Nav/Sidebar, Page Cards.
- **Level 2 (Raised)**: `var(--surface-raised)` - Hover/Active/Popovers/Modals.

### 4.2 Prohibited Practices
- **Forbidden**: Hardcoded `hex` (`#0b0e14`), `rgb`, or `tailwind colors` (`bg-gray-100`) in code.
- **Rule**: All colors must use `hsl(var(--token-name))` or `bg-primary`, `text-foreground` Tailwind aliases that bind to these tokens.
- **Dark Mode**: No "if dark then blue else gray" logic. Tokens must handle the inversion.

---

## 5. SHOPIFY EMBEDDED CONSTRAINTS
- **Scroll Containment**: Main scrolling must happen within `Center Work Canvas`. Top Bar and Left Nav must remain fixed to prevent double-scrollbars in Shopify Admin.
- **Z-Index Strategy**: 
  - TopBar: 50
  - SideNav: 40
  - Modals: 100+ (must clear Shopify's possible overlay injection).
- **Safe Zones**: Ensure no content is hidden by Shopify App Bridge action bars or headers.

---

## 6. INCREMENTAL ROLLOUT PLAN (v1.5)

1. **Phase 1 (Structural Shell)**: Update `layout.tsx`, `TopNav`, and `SideNav` to the new grid system. No right-panel logic.
2. **Phase 2 (Context Panel Service)**: Implementation of `RightContextPanel` logic and state management.
3. **Phase 3 (Density Uplift)**: Refactor `Products` and `Dashboard` tables to use new density and row-selection triggers.

---

## 7. DO NOT IMPLEMENT YET
- ~~**Command Palette (`CMD+K`)**: Logic and UI reserved for v1.6.~~ (Implemented in v1.5 per COMMAND-PALETTE-IMPLEMENTATION-1)
- **AI-Driven Layout Shifts**: The UI must not "auto-reorganize" based on AI predictions.
- **Drag-and-Drop Reordering**: Out of scope for v1.5 UI shell.
