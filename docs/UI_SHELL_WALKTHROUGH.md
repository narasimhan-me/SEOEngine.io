# EngineO.ai UI Shell - Design System v1.5 Full Delivery

## 1. System-Level Design Directions

We have defined three distinct architectural directions for the EngineO.ai shell:

| Direction                 | Philosophy                                               | Tradeoffs                                | Preferred For                                 |
| :------------------------ | :------------------------------------------------------- | :--------------------------------------- | :-------------------------------------------- |
| **Operational Command**   | Efficiency first. Dense data, persistent navigation.     | Can be overwhelming for new users.       | Daily operators scanning high-volume issues.  |
| **Contextual Specialist** | Focus first. Minimalist shell with overlay context.      | Reduced efficiency for comparison tasks. | Deep-dive audits and complex content editing. |
| **Orchestrator**          | Multi-tenant first. Global store switcher + dynamic nav. | Reduced canvas width for active store.   | Agency admins managing 10+ Shopify stores.    |

## 2. Right Context Panel Contract

The panel operates as a system-driven "Assistant" that complements the canvas.

- **Auto-Open**: On row selection in dense lists or critical dashboard issues.
- **Navigation**: Persists metadata across items (e.g., paging products); auto-dismisses on section change.
- **Interactions**: Shifting (Command mode) or Overlay (Specialist mode). Responsive to `ESC` and external clicks.

## 3. High-Fidelity Mockups

_Refer to the design system artifacts for visual mockups._

## 4. Design System v1.5 Alignment

| Component | Token(s)                                             | Compliance              |
| :-------- | :--------------------------------------------------- | :---------------------- |
| Surfaces  | `--background`, `--surface-card`, `--surface-raised` | 100% Token-driven.      |
| Contrast  | `--foreground`, `--muted-foreground`                 | WCAG AA Dark-mode safe. |
| Actions   | `--primary`, `--ring`                                | Zero raw hex usage.     |

## 5. Interaction & Trust Notes

- **Hover**: Rows use `var(--menu-hover-bg) / 0.14` for deterministic feedback.
- **Focus**: Thick focus rings on keyboard navigation to ensure Shopify accessibility compliance.
- **Trust**: Consistent use of semantic terminology ("Review", "Update"). No hidden "AI magic"—all actions are user-authorized.
