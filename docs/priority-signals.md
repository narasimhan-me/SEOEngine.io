# Priority Signals Implementation (EA-46)

## Overview

This document describes the priority signals system implemented for EA-46, which provides transparent prioritization context for issues and recommendations.

## Trust Contract

The priority signals system adheres to the following trust principles:

1. **No hidden weighting logic**: All factors influencing priority are visible to users
2. **Honest confidence framing**: Explanations never overstate certainty about priorities
3. **Informational guidance only**: Priority signals guide decisions but don't automate them
4. **No silent changes**: Priority calculation logic is transparent and documented

## Architecture

### Core Modules

#### `apps/web/src/lib/priority-signals.ts`
Core types and utilities for priority signals:
- `PrioritySignal` - Complete signal with level, confidence, and factors
- `PriorityFactor` - Individual contributing factor with weight and explanation
- `PriorityConfidence` - Confidence level (high/medium/low)
- Helper functions for building and formatting signals

#### `apps/web/src/lib/issue-priority-mapping.ts`
Maps issue types to their priority signals:
- Predefined factors for each issue type
- Impact summaries explaining prioritization
- Comparison context for relative rankings

### Components

#### Priority Components (`apps/web/src/components/priority/`)
- `PriorityBadge` - Visual badge showing priority level with confidence dots
- `PriorityExplanation` - Expandable breakdown of contributing factors
- `PriorityComparisonTooltip` - Explains relative ranking between items

#### Issue Components (`apps/web/src/components/issues/`)
- `IssueCard` - Issue display with integrated priority signal
- `PrioritizedIssueList` - Sorted list with comparison context

#### Dashboard Components (`apps/web/src/components/dashboard/`)
- `DashboardPrioritySection` - Dashboard widget for priority issues

## Usage

### Displaying Priority for an Issue

```tsx
import { IssueCard } from '@/components/issues';

<IssueCard
  issueKey="missing_seo_title"
  title="Missing Page Titles"
  affectedCount={12}
  assetType="pages"
  onClick={() => handleIssueClick('missing_seo_title')}
/>
```

### Getting Priority Signal Programmatically

```tsx
import { getIssuePrioritySignal } from '@/lib/issue-priority-mapping';

const signal = getIssuePrioritySignal('missing_seo_title');
console.log(signal.impactSummary);
// "Missing titles significantly reduce search visibility..."
```

### Adding Context-Specific Factors

```tsx
import { getIssuePrioritySignal } from '@/lib/issue-priority-mapping';
import { COMMON_PRIORITY_FACTORS } from '@/lib/priority-signals';

const signal = getIssuePrioritySignal('thin_content', [
  COMMON_PRIORITY_FACTORS.highTrafficPage,
]);
// Signal now includes high-traffic context in its calculation
```

## Confidence Levels

| Level | Meaning | When Used |
|-------|---------|-----------|
| High | Based on strong signals and historical patterns | 3+ factors from 2+ categories |
| Medium | Based on available data with some uncertainty | 2+ factors |
| Low | Limited data—consider additional context | Single factor or limited data |

## Adding New Issue Types

To add priority signals for a new issue type:

1. Add factors to `ISSUE_SPECIFIC_FACTORS` in `issue-priority-mapping.ts`
2. Add configuration to `ISSUE_PRIORITY_CONFIGS`
3. Include impact summary and optional comparison context

## Acceptance Criteria Verification

- [x] Each prioritized item displays an impact explanation visible to the user
- [x] Priority signals include confidence framing (high/medium/low indicator)
- [x] Users can identify why one item is ranked higher than another
- [x] No weighting factors are applied without corresponding user-visible explanation
- [x] Existing prioritization data is displayed with added context, not altered
