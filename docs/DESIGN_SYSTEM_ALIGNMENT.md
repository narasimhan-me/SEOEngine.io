# Design System v1.5 Alignment Confirmation

| Component Region        | v1.5 Token(s) Used                   | Rationale                                             |
| :---------------------- | :----------------------------------- | :---------------------------------------------------- |
| **Page Background**     | `--background`                       | Standard dark-mode page base.                         |
| **Sidebar / Top Bar**   | `--surface-card`                     | Subtle elevation from page background.                |
| **Hover / Active Item** | `--surface-raised`                   | Clear visual separation on interactive elements.      |
| **Borders / Dividers**  | `--border`                           | Low-contrast separation for dense data.               |
| **Primary Actions**     | `--primary`, `--primary-foreground`  | Standard blue brand color for CTAs.                   |
| **Semantic Status**     | `--success`, `--warning`, `--danger` | Signal-specific coloring (muted for dark-mode trust). |
| **Text (Primary)**      | `--foreground`                       | Maximum readability (near-white).                     |
| **Text (Secondary)**    | `--muted-foreground`                 | Lower visual priority (gray-700 equivalent).          |

## Token Compliance

- **New Tokens**: None required. Existing v1.5 tokens are comprehensive for this structural redesign.
- **Raw Hex Usage**: **ZERO**. All colors are mapped to CSS variables.
- **Dark Mode**: Default and strictly enforced.
