# Icon System Documentation

**Phase**: ICONS-LOCAL-LIBRARY-1
**Status**: Active

## Overview

EngineO.ai uses a local SVG icon system based on Material Symbols Outlined. All icons are served from a locally-committed SVG sprite with no runtime CDN dependencies.

## No CDN Policy

This icon system intentionally avoids runtime CDN dependencies:

- All SVGs are committed to the repository
- Sprite is served from `/icons/material-symbols/sprite.svg`
- App works fully offline once loaded
- No external font/script loading (Google Fonts CDN is NOT used)

## Icon Component Usage

```tsx
import { Icon } from '@/components/icons';

// Basic usage with semantic key
<Icon name="nav.dashboard" />

// With size (16, 20, or 24 pixels - default is 20)
<Icon name="status.critical" size={24} />

// With custom styling
<Icon name="utility.search" className="text-primary" />

// Meaningful icon with accessibility label
<Icon name="status.warning" ariaLabel="Warning: action required" />
```

## Semantic Icon Keys

Icons are referenced using semantic keys in the format `category.name`. This abstraction allows us to swap underlying icons without changing UI code.

### Navigation (`nav.*`)

| Key | Description | Raw Icon |
|-----|-------------|----------|
| `nav.dashboard` | Home/Dashboard | `home` |
| `nav.projects` | Projects/Inventory | `inventory_2` |
| `nav.settings` | Settings | `settings` |
| `nav.help` | Help/Campaign | `campaign` |
| `nav.admin` | Admin Panel | `admin_panel_settings` |
| `nav.storeHealth` | Store Health | `health_and_safety` |
| `nav.automations` | Automations | `settings_suggest` |
| `nav.insights` | Insights/Monitoring | `monitoring` |

### Utility (`utility.*`)

| Key | Description | Raw Icon |
|-----|-------------|----------|
| `utility.search` | Search | `search` |
| `utility.download` | Download | `download` |
| `utility.semantic` | Knowledge Graph | `hub` |
| `utility.technical` | Technical/Memory | `memory` |
| `utility.schema` | Schema/Data Object | `data_object` |
| `utility.visibility` | View/Read-only | `visibility` |

### Status (`status.*`)

| Key | Description | Raw Icon |
|-----|-------------|----------|
| `status.critical` | Error/Critical | `error` |
| `status.warning` | Warning | `warning` |
| `status.healthy` | Success/Healthy | `check_circle` |
| `status.aiFixable` | AI can fix | `auto_fix_high` |
| `status.check` | Check/Complete | `check` |
| `status.blocked` | Blocked/Forbidden | `block` |

### Workflow (`workflow.*`)

| Key | Description | Raw Icon |
|-----|-------------|----------|
| `workflow.ai` | AI/Auto Awesome | `auto_awesome` |
| `workflow.preview` | Preview | `preview` |
| `workflow.estimate` | Estimate/Calculate | `calculate` |
| `workflow.apply` | Apply/Publish | `publish` |
| `workflow.history` | History | `history` |

### Playbook (`playbook.*`)

| Key | Description | Raw Icon |
|-----|-------------|----------|
| `playbook.title` | Title | `title` |
| `playbook.content` | Content/Article | `article` |
| `playbook.intent` | Intent/Target | `target` |
| `playbook.metadata` | Metadata | `data_object` |
| `playbook.authority` | Authority/Award | `award_star` |
| `playbook.voice` | Voice Search | `settings_voice` |

## How to Add an Icon

### Step 1: Discover the Icon Name

Run the extraction script on Stitch HTML files to discover icon names:

```bash
node scripts/extract-stitch-material-symbols.mjs path/to/stitch.html
```

This outputs a sorted, deduped JSON array of icon names.

### Step 2: Add the SVG

Place the SVG file in `apps/web/public/icons/material-symbols/svg/`:

- Filename: `{icon_name}.svg`
- Ensure `viewBox="0 0 24 24"`
- Ensure `fill="currentColor"` for token-compatible coloring

### Step 3: Regenerate the Sprite

```bash
node scripts/build-material-symbols-sprite.mjs
```

### Step 4: Update the Manifest

Edit `apps/web/src/components/icons/material-symbols-manifest.ts`:

1. Add the raw name to `MATERIAL_SYMBOL_RAW_NAMES`
2. Add a semantic alias to the appropriate category in `ICON_MANIFEST`

## Accessibility Guidelines

### Decorative Icons

Most icons in the UI are decorative (they accompany text labels). These should:

- Omit `ariaLabel` prop
- Receive `aria-hidden="true"` automatically

```tsx
// Decorative - icon is hidden from screen readers
<button aria-label="Search">
  <Icon name="utility.search" />
</button>
```

### Meaningful Icons

Icons that convey meaning without accompanying text need accessible names:

- Provide `ariaLabel` prop
- Receive `role="img"` and `<title>` automatically

```tsx
// Meaningful - icon is announced to screen readers
<Icon name="status.warning" ariaLabel="Warning: action required" />
```

### Left Rail Exception

In the left rail navigation, icons are decorative because the parent `<a>` element has `aria-label` and `title` attributes providing the accessible name.

## Design Specifications

Per Stitch design system:

- **Grid**: 20 × 20 px
- **Stroke**: 1.5 pt (Material Symbols weight 300)
- **Default size**: 20px
- **Sizes available**: 16, 20, 24
- **Colors**: Via `currentColor` (inherits from parent text color)

## File Structure

```
apps/web/
├── public/icons/material-symbols/
│   ├── svg/                    # Individual SVG files
│   │   ├── home.svg
│   │   ├── search.svg
│   │   └── ...
│   └── sprite.svg              # Generated sprite (committed)
└── src/components/icons/
    ├── Icon.tsx                # React component
    ├── Icon.md                 # Component docs
    ├── material-symbols-manifest.ts  # Icon manifest
    └── index.ts                # Exports

scripts/
├── extract-stitch-material-symbols.mjs  # Dev: extract icons from HTML
├── download-material-symbols.mjs        # Dev: download SVGs
└── build-material-symbols-sprite.mjs    # Dev: build sprite
```

## Related Documents

- `apps/web/src/components/icons/Icon.md` - Component-level documentation
- `docs/manual-testing/ICONS-LOCAL-LIBRARY-1.md` - QA checklist
