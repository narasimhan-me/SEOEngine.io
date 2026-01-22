'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ContextDescriptor, PanelView } from './RightContextPanelProvider';

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
 * Pure renderer that maps (activeView, descriptor.kind) → content blocks.
 * Token-only and truth-preserving (no fabricated history/recommendations).
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
      return renderDetailsView(descriptor);
    case 'recommendations':
      return renderRecommendationsView(descriptor);
    case 'history':
      return renderHistoryView();
    case 'help':
      return renderHelpView();
    default:
      return renderDetailsView(descriptor);
  }
}

/**
 * Render the Details view based on descriptor.kind.
 */
function renderDetailsView(descriptor: ContextDescriptor) {
  switch (descriptor.kind) {
    case 'product':
      return <ProductDetailsContent descriptor={descriptor} />;
    case 'user':
      return <UserDetailsContent descriptor={descriptor} />;
    case 'work_item':
      return <WorkItemDetailsContent descriptor={descriptor} />;
    default:
      return <GenericDetailsContent descriptor={descriptor} />;
  }
}

/**
 * Product details (MVP) from descriptor fields/metadata.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling + metaTitle/metaDescription display.
 */
function ProductDetailsContent({
  descriptor,
}: {
  descriptor: ContextDescriptor;
}) {
  const metadata = descriptor.metadata || {};

  return (
    <div className="space-y-4">
      {/* Handle / External ID */}
      {(metadata.handle || metadata.externalId) && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Handle / ID
          </p>
          <p className="mt-1 text-sm text-foreground break-words">
            {metadata.handle || metadata.externalId}
          </p>
        </div>
      )}

      {/* Shopify Status (only if provided) */}
      {metadata.shopifyStatus && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Shopify Status
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.shopifyStatus}</p>
        </div>
      )}

      {/* Last Synced (only if provided) */}
      {metadata.lastSynced && (
        <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Last Synced
          </p>
          <p className="mt-1 text-sm text-foreground">{metadata.lastSynced}</p>
        </div>
      )}

      {/* SEO Title - Status + Value */}
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

      {/* SEO Description - Status + Value */}
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

      {/* Recommended Action */}
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

      {/* Open Full Page Link */}
      {descriptor.openHref && (
        <div className="pt-2">
          <Link
            href={descriptor.openHref}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <span>{descriptor.openHrefLabel || 'Open full EngineO.ai page'}</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Admin User details (MVP) from descriptor metadata.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
 */
function UserDetailsContent({ descriptor }: { descriptor: ContextDescriptor }) {
  const metadata = descriptor.metadata || {};

  return (
    <div className="space-y-4">
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

      {/* Open Full Page Link */}
      {descriptor.openHref && (
        <div className="pt-2">
          <Link
            href={descriptor.openHref}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <span>{descriptor.openHrefLabel || 'View user details'}</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
        </div>
      )}
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
 * Generic details content for unknown kinds.
 * [RIGHT-CONTEXT-PANEL-IMPLEMENTATION-1 FIXUP-4] Token-only styling.
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
      {descriptor.openHref && (
        <div className="pt-2">
          <Link
            href={descriptor.openHref}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <span>{descriptor.openHrefLabel || 'Open full page'}</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
        </div>
      )}
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
          Visit the{' '}
          <Link
            href="/help/shopify-permissions"
            className="text-primary hover:text-primary/80"
          >
            Help Center
          </Link>{' '}
          for general documentation.
        </p>
      </div>
    </div>
  );
}
