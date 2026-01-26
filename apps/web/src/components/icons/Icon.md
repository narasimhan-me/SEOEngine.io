# Icon Component

ICONS-LOCAL-LIBRARY-1 - Local SVG Icon System

## Overview

The Icon component provides a single rendering surface for Material Symbols icons using a locally-served SVG sprite. No runtime CDN dependencies.

## Usage

```tsx
import { Icon } from '@/components/icons/Icon';

// Basic usage with semantic key
<Icon name="nav.dashboard" />

// With size (16, 20, or 24 pixels)
<Icon name="status.critical" size={24} />

// With custom styling
<Icon name="utility.search" className="text-primary" />

// Meaningful icon with accessibility label
<Icon name="status.warning" ariaLabel="Warning: action required" />
```

## Semantic Keys

Icons are referenced using semantic keys in the format `category.name`:

### Navigation (`nav.*`)

- `nav.dashboard` - Home/Dashboard
- `nav.projects` - Projects/Inventory
- `nav.settings` - Settings
- `nav.help` - Help/Campaign
- `nav.admin` - Admin Panel

### Utility (`utility.*`)

- `utility.search` - Search
- `utility.download` - Download
- `utility.semantic` - Knowledge Graph
- `utility.visibility` - View/Read-only

### Status (`status.*`)

- `status.critical` - Error/Critical
- `status.warning` - Warning
- `status.healthy` - Success/Healthy
- `status.aiFixable` - AI can fix
- `status.blocked` - Blocked/Forbidden

### Workflow (`workflow.*`)

- `workflow.ai` - AI/Auto Awesome
- `workflow.preview` - Preview
- `workflow.apply` - Apply/Publish
- `workflow.history` - History

### Playbook (`playbook.*`)

- `playbook.title` - Title
- `playbook.content` - Content/Article
- `playbook.intent` - Intent/Target

## How to Add an Icon

1. **Discover the icon name**: Run the extraction script on Stitch HTML

   ```bash
   node scripts/extract-stitch-material-symbols.mjs path/to/stitch.html
   ```

2. **Add the SVG**: Place the SVG file in `apps/web/public/icons/material-symbols/svg/`
   - Filename: `{icon_name}.svg`
   - Ensure `viewBox="0 0 24 24"` and `fill="currentColor"`

3. **Regenerate sprite**:

   ```bash
   node scripts/build-material-symbols-sprite.mjs
   ```

4. **Add to manifest**: Update `material-symbols-manifest.ts`
   - Add raw name to `MATERIAL_SYMBOL_RAW_NAMES`
   - Add semantic alias to appropriate category in `ICON_MANIFEST`

## Accessibility

- **Decorative icons**: Omit `ariaLabel` - icon receives `aria-hidden="true"`
- **Meaningful icons**: Provide `ariaLabel` - icon receives `role="img"` and `<title>`

### Left Rail Exception

In the left rail navigation, icons are decorative because the parent `<a>` element has `aria-label` and `title` attributes providing the accessible name. The icons add visual cue only.

## Design Specifications

Per Stitch design system:

- Grid: 20 × 20 px
- Stroke: 1.5 pt
- Default size: 20px
- Colors via `currentColor` (inherits from parent text color)

## No CDN Policy

This icon system intentionally avoids runtime CDN dependencies:

- All SVGs are committed to the repository
- Sprite is served from `/icons/material-symbols/sprite.svg`
- App works fully offline once loaded
