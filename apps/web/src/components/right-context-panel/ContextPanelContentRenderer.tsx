'use client';

import { usePathname } from 'next/navigation';
import type { ContextDescriptor, PanelView } from './RightContextPanelProvider';
import { ContextPanelEntitySummary } from './ContextPanelEntitySummary';
import { ContextPanelIssueDrilldown } from './ContextPanelIssueDrilldown';
import { ContextPanelActionPreview } from './ContextPanelActionPreview';
import { ContextPanelAiAssistHints } from './ContextPanelAiAssistHints';
// [ISSUES-ENGINE-REMOUNT-1] Import issue details component
import { ContextPanelIssueDetails } from './ContextPanelIssueDetails';

interface ContextPanelContentRendererProps {
  activeView: PanelView;
  descriptor: ContextDescriptor;
}

/**
 * Extract project ID from pathname if under /projects/[id]/...
 */
function extractProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Check if descriptor.kind is an asset kind that should use the expanded content system.
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Supports: product, page, collection
 */
function isAssetKind(kind: string): boolean {
  return kind === 'product' || kind === 'page' || kind === 'collection';
}

/**
 * Map descriptor.kind to assetType for API calls.
 */
function kindToAssetType(kind: string): 'products' | 'pages' | 'collections' {
  switch (kind) {
    case 'product':
      return 'products';
    case 'page':
      return 'pages';
    case 'collection':
      return 'collections';
    default:
      return 'products';
  }
}

/**
 * Pure renderer that maps (activeView, descriptor.kind) → content blocks.
 * Token-only and truth-preserving (no fabricated history/recommendations).
 *
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] GLOBAL RULE:
 * Keep ONLY the RCP header external-link (descriptor.openHref) as the single allowed navigation affordance.
 * NO in-body navigation links inside the panel (including Help tab links).
 */
export function ContextPanelContentRenderer({
  activeView,
  descriptor,
}: ContextPanelContentRendererProps) {
  const pathname = usePathname();
  const currentProjectId = extractProjectIdFromPath(pathname);

  // [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Scope safety:
  // If descriptor has scopeProjectId but we're NOT under /projects/[id] (no currentProjectId),
  // OR if scopeProjectId differs from currentProjectId, show safe "Unavailable" state.
  const isScopeMismatch =
    descriptor.scopeProjectId &&
    (currentProjectId === null ||
      descriptor.scopeProjectId !== currentProjectId);

  if (isScopeMismatch) {
    return (
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
        <p className="text-sm text-muted-foreground">
          Unavailable in this project context.
        </p>
      </div>
    );
  }

  switch (activeView) {
    case 'details':
      return renderDetailsView(descriptor, currentProjectId);
    case 'recommendations':
      return renderRecommendationsView(descriptor);
    case 'history':
      return renderHistoryView();
    case 'help':
      return renderHelpView();
    default:
      return renderDetailsView(descriptor, currentProjectId);
  }
}

/**
 * Render the Details view based on descriptor.kind.
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Asset kinds (product, page, collection) use expanded content system.
 * [ISSUES-ENGINE-REMOUNT-1] Issue kind uses dedicated ContextPanelIssueDetails component.
 * [PLAYBOOKS-SHELL-REMOUNT-1] Playbook kind uses dedicated PlaybookDetailsContent component.
 */
function renderDetailsView(descriptor: ContextDescriptor, currentProjectId: string | null) {
  // Asset kinds use the new content expansion system
  if (isAssetKind(descriptor.kind)) {
    return <AssetDetailsContent descriptor={descriptor} projectId={currentProjectId} />;
  }

  // Non-asset kinds use existing renderers
  switch (descriptor.kind) {
    // [ISSUES-ENGINE-REMOUNT-1] Issue kind - read-only issue details in RCP
    // [DRAFT-LIFECYCLE-VISIBILITY-1 PATCH 4] Pass draftLifecycleState from descriptor metadata
    case 'issue':
      if (currentProjectId) {
        return (
          <ContextPanelIssueDetails
            projectId={currentProjectId}
            issueId={descriptor.id}
            draftLifecycleState={descriptor.metadata?.draftLifecycleState as string | undefined}
          />
        );
      }
      // No project context - show unavailable state
      return (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
          <p className="text-sm text-muted-foreground">
            Unavailable in this project context.
          </p>
        </div>
      );
    // [PLAYBOOKS-SHELL-REMOUNT-1] Playbook kind - read-only playbook details in RCP
    case 'playbook':
      if (currentProjectId) {
        return <PlaybookDetailsContent descriptor={descriptor} />;
      }
      // No project context - show unavailable state
      return (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
          <p className="text-sm text-muted-foreground">
            Unavailable in this project context.
          </p>
        </div>
      );
    case 'user':
      return <UserDetailsContent descriptor={descriptor} />;
    case 'work_item':
      return <WorkItemDetailsContent descriptor={descriptor} />;
    default:
      return <GenericDetailsContent descriptor={descriptor} />;
  }
}

/**
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Asset details with expanded content system.
 * Replaces ProductDetailsContent MVP layout with new content sections:
 * A) Contextual Product Summary (always shown for asset kinds)
 * B) Issue Drilldown (read-only, fetch-based; progressive disclosure)
 * C) Action Preview (read-only; no buttons; only shown when relevant metadata exists)
 * D) AI Assist Hints (optional, collapsed by default; no chat UI; no links)
 *
 * NO in-body navigation links.
 */
function AssetDetailsContent({
  descriptor,
  projectId,
}: {
  descriptor: ContextDescriptor;
  projectId: string | null;
}) {
  const metadata = descriptor.metadata || {};
  const issuesCount = descriptor.issues?.length || 0;

  return (
    // [UI-POLISH-&-CLARITY-1] Increased section separation
    <div className="space-y-5">
      {/* A) Contextual Summary (always shown) */}
      <ContextPanelEntitySummary descriptor={descriptor} />

      {/* B) Issue Drilldown (only when projectId available) */}
      {projectId && (
        <ContextPanelIssueDrilldown
          projectId={projectId}
          assetType={kindToAssetType(descriptor.kind)}
          assetId={descriptor.id}
          initialIssues={descriptor.issues}
        />
      )}

      {/* C) Action Preview (only when relevant metadata exists) */}
      <ContextPanelActionPreview descriptor={descriptor} />

      {/* D) AI Assist Hints (optional, collapsed by default) */}
      <ContextPanelAiAssistHints descriptor={descriptor} issuesCount={issuesCount} />

      {/* Legacy SEO metadata blocks (retained for backwards compatibility) */}
      {/* SEO Title - Status + Value */}
      {(metadata.seoTitleStatus || metadata.metaTitle) && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            SEO Title
          </p>
          {metadata.seoTitleStatus && (
            <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {metadata.seoTitleStatus}
            </span>
          )}
          {metadata.metaTitle && metadata.metaTitle !== 'Not set' && (
            <p className="mt-2 text-sm text-foreground break-words">
              {metadata.metaTitle}
            </p>
          )}
        </div>
      )}

      {/* SEO Description - Status + Value */}
      {(metadata.seoDescriptionStatus || metadata.metaDescription) && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            SEO Description
          </p>
          {metadata.seoDescriptionStatus && (
            <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              {metadata.seoDescriptionStatus}
            </span>
          )}
          {metadata.metaDescription && metadata.metaDescription !== 'Not set' && (
            <p className="mt-2 text-sm text-foreground break-words line-clamp-3">
              {metadata.metaDescription}
            </p>
          )}
        </div>
      )}

      {/* Recommended Action (text only, no link) */}
      {metadata.recommendedAction && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recommended Action
          </p>
          <p className="mt-1 text-sm text-foreground">
            {metadata.recommendedAction}
          </p>
        </div>
      )}

      {/* NO "Open Full Page Link" in body - header external-link is the only navigation affordance */}
    </div>
  );
}

/**
 * Admin User details (MVP) from descriptor metadata.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Removed in-body "Open Full Page Link".
 */
function UserDetailsContent({ descriptor }: { descriptor: ContextDescriptor }) {
  const metadata = descriptor.metadata || {};

  return (
    // [UI-POLISH-&-CLARITY-1] Increased section separation
    <div className="space-y-5">
      {/* Role */}
      {metadata.role && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Role
          </p>
          <p className="mt-1 text-sm text-foreground">
            {metadata.role}
            {metadata.adminRole && (
              <span className="ml-2 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {metadata.adminRole}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Plan */}
      {metadata.plan && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Plan
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.plan}
          </span>
        </div>
      )}

      {/* Account Status */}
      {metadata.accountStatus && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Account Status
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.accountStatus}
          </span>
        </div>
      )}

      {/* Last Activity */}
      {metadata.lastActivity && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Last Activity
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.lastActivity}</p>
        </div>
      )}

      {/* Projects Count */}
      {metadata.projectsCount && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.projectsCount}</p>
        </div>
      )}

      {/* AI Usage */}
      {metadata.aiUsage && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            AI Usage (this month)
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.aiUsage}</p>
        </div>
      )}

      {/* Quota Percent - numeric only, renderer adds % */}
      {metadata.quotaPercent && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quota Usage
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.quotaPercent}%</p>
        </div>
      )}

      {/* 2FA Enabled - expects 'true'/'false' string */}
      {metadata.twoFactorEnabled !== undefined && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Two-Factor Auth
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.twoFactorEnabled === 'true' ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      )}

      {/* Created At */}
      {metadata.createdAt && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Created
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.createdAt}</p>
        </div>
      )}

      {/* NO "Open Full Page Link" in body - header external-link is the only navigation affordance */}
    </div>
  );
}

/**
 * Work Queue item details (MVP) from descriptor metadata.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
 */
function WorkItemDetailsContent({
  descriptor,
}: {
  descriptor: ContextDescriptor;
}) {
  const metadata = descriptor.metadata || {};

  return (
    <div className="space-y-4">
      {/* Bundle Type */}
      {metadata.bundleType && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Type
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.bundleType}
          </span>
        </div>
      )}

      {/* State */}
      {metadata.state && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            State
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.state}
          </span>
        </div>
      )}

      {/* Health */}
      {metadata.health && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Health
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.health}
          </span>
        </div>
      )}

      {/* Scope Type */}
      {metadata.scopeType && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Scope Type
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.scopeType}</p>
        </div>
      )}

      {/* Scope Counts */}
      {(metadata.scopeActionable || metadata.scopeDetected) && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Scope
          </p>
          <div className="mt-1 text-sm text-foreground">
            {metadata.scopeActionable && (
              <p>
                <span className="font-medium">{metadata.scopeActionable}</span>{' '}
                actionable
              </p>
            )}
            {metadata.scopeDetected && (
              <p className="text-muted-foreground">
                ({metadata.scopeDetected} detected)
              </p>
            )}
          </div>
        </div>
      )}

      {/* AI Usage */}
      {metadata.aiUsage && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            AI Usage
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.aiUsage === 'NONE' ? 'Does not use AI' : 'AI used for drafts'}
          </span>
        </div>
      )}

      {/* AI Disclosure Text */}
      {metadata.aiDisclosureText && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            AI Disclosure
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {metadata.aiDisclosureText}
          </p>
        </div>
      )}

      {/* Approval Status */}
      {metadata.approvalStatus && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Approval Status
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
            {metadata.approvalStatus}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * [PLAYBOOKS-SHELL-REMOUNT-1] Playbook details content for RCP.
 * Read-only, token-only styling, no in-body navigation links.
 * Sections:
 * - What this playbook does (from metadata.description)
 * - Which assets it can affect (asset types + scope summary)
 * - Preconditions (plan/eligibility/permissions/data readiness)
 * - Runnable state (Ready/Blocked/Informational)
 * - History stub
 */
function PlaybookDetailsContent({
  descriptor,
}: {
  descriptor: ContextDescriptor;
}) {
  const metadata = descriptor.metadata || {};

  // Derive runnable state from metadata
  const runnableState = metadata.runnableState || 'Blocked';
  const getRunnableStateClass = () => {
    switch (runnableState) {
      case 'Ready':
        return 'bg-[hsl(var(--success-background))] text-[hsl(var(--success-foreground))]';
      case 'Informational':
        return 'bg-[hsl(var(--info-background))] text-[hsl(var(--info-foreground))]';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Parse preconditions from metadata (comma-separated string or already array-like)
  const preconditions = metadata.preconditions
    ? metadata.preconditions.split(',').map((p: string) => p.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      {/* What this playbook does */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          What This Playbook Does
        </p>
        <p className="mt-1 text-sm text-foreground">
          {metadata.description || 'Not available.'}
        </p>
      </div>

      {/* Which assets it can affect */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Applicable Assets
        </p>
        {metadata.assetTypes ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {metadata.assetTypes.split(',').map((assetType: string) => (
              <span
                key={assetType.trim()}
                className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {assetType.trim()}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Products</p>
        )}
        {metadata.scopeSummary && (
          <p className="mt-2 text-xs text-muted-foreground">
            {metadata.scopeSummary}
          </p>
        )}
      </div>

      {/* Preconditions */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Preconditions
        </p>
        {preconditions.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {preconditions.map((condition: string, idx: number) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No specific preconditions.
          </p>
        )}
      </div>

      {/* Runnable State */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Availability
        </p>
        <span
          className={`mt-1 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium ${getRunnableStateClass()}`}
        >
          {runnableState}
        </span>
        {metadata.runnableGuidance && (
          <p className="mt-2 text-xs text-muted-foreground">
            {metadata.runnableGuidance}
          </p>
        )}
      </div>

      {/* History stub */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          History
        </p>
        {metadata.lastRunSummary ? (
          <p className="mt-1 text-sm text-foreground">{metadata.lastRunSummary}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No history available.
          </p>
        )}
      </div>

      {/* NO in-body navigation links - header external-link is the only navigation affordance */}
    </div>
  );
}

/**
 * Generic details content for unknown kinds.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Removed in-body "Open Full Page Link".
 */
function GenericDetailsContent({
  descriptor,
}: {
  descriptor: ContextDescriptor;
}) {
  const metadata = descriptor.metadata || {};
  const metadataEntries = Object.entries(metadata);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Kind
        </p>
        <p className="mt-1 text-sm text-foreground">{descriptor.kind}</p>
      </div>
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          ID
        </p>
        <p className="mt-1 text-sm text-foreground">{descriptor.id}</p>
      </div>
      {metadataEntries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {key}
          </p>
          <p className="mt-1 text-sm text-foreground">{value}</p>
        </div>
      ))}
      {/* NO "Open Full Page Link" in body - header external-link is the only navigation affordance */}
    </div>
  );
}

/**
 * Render the Recommendations view.
 * Shows recommended next steps if provided; otherwise shows stub.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
 */
function renderRecommendationsView(descriptor: ContextDescriptor) {
  const metadata = descriptor.metadata || {};
  const hasRecommendation =
    metadata.recommendedAction || metadata.recommendedNextStep;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Recommendations (based on detected issues)
      </h3>
      {hasRecommendation ? (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-sm text-foreground">
            {metadata.recommendedNextStep || metadata.recommendedAction}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
          <p className="text-sm text-muted-foreground">
            No recommendations available for this item.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Render the History view.
 * Always shows "No history available." unless real events are supplied.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
 */
function renderHistoryView() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">History</h3>
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
        <p className="text-sm text-muted-foreground">No history available.</p>
      </div>
    </div>
  );
}

/**
 * Render the Help view.
 * Stub content only (truthfully labeled).
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
 * [RIGHT-CONTEXT-PANEL-CONTENT-EXPANSION-1] Removed Help Center link - no in-body navigation links.
 */
function renderHelpView() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Help</h3>
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-4">
        <p className="text-sm text-muted-foreground">
          Help content is not yet available for this item.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Visit the Help Center for general documentation.
        </p>
      </div>
    </div>
  );
}
