# EngineO.ai UI Shell - Design Directions

## 1. Operational Command (Base)
**Philosophy**: Optimized for high-frequency operators. Density is the priority.
- **Layout**: Persistent left-nav, fixed Top Bar. Workspace uses the full width.
- **Right Panel**: Semi-persistent. Shifts the canvas when active.
- **Tradeoffs**: Highest data visibility; can feel "busy" for occasional users.
- **Preferred for**: Daily power users managed a large queue of issues.

## 2. The Contextual Specialist (New)
**Philosophy**: Focuses on a single object at a time with deep contextual support.
- **Layout**: Collapsed icon-only Left Nav by default. Canvas is centered and narrower (e.g., max-width 1200px).
- **Right Panel**: Floating Overlay. Appears as a high-elevation surface (with backdrop blur/glassmorphism) that slides over the edge of the canvas.
- **Tradeoffs**: Dramatically reduces "information noise." Less efficient for multi-item comparison.
- **Preferred for**: In-depth audits, content editing, and playbook configuration where focus is critical.

## 3. The Multi-Tenant Orchestrator (New)
**Philosophy**: Designed for agency/multi-store management workflows.
- **Layout**: Top Bar features a prominent "Tenant/Store Switcher" and a global "Operational Health" summary. Left Nav changes dynamically based on the selected store.
- **Right Panel**: Permanent Sidebar. Functions as a "Communication & History" log for the current store/context.
- **Tradeoffs**: Excellent for switching between store contexts; reduced canvas horizontal space.
- **Preferred for**: Agency admins or Enterprise managers overseeing 10+ Shopify stores simultaneously.
