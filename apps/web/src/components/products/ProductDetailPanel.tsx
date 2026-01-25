import Link from 'next/link';

import type { Product } from '@/lib/products';
import type { PillarIssueSummary } from './ProductRow';

interface ProductDetailPanelProps {
  product: Product;
  projectId: string;
  issuesByPillar?: PillarIssueSummary[];
}

export function ProductDetailPanel({
  product,
  projectId,
  issuesByPillar,
}: ProductDetailPanelProps) {
  const metaTitle = product.seoTitle?.trim() || null;
  const metaDescription = product.seoDescription?.trim() || null;

  const formattedLastSynced = product.lastSyncedAt
    ? new Date(product.lastSyncedAt).toLocaleString()
    : 'Not available';

  const workspacePath = `/projects/${projectId}/products/${product.id}`;

  return (
    <div className="rounded-lg border border-border bg-[hsl(var(--surface-card))] px-4 py-4 text-sm text-foreground">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Product Identifiers */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Handle / ID
          </div>
          <div className="mt-1 text-foreground break-words">
            {product.handle ?? product.externalId ?? 'Not available'}
          </div>
        </div>

        {/* Last synced */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Last synced
          </div>
          <div className="mt-1 text-foreground">{formattedLastSynced}</div>
        </div>

        {/* Meta title */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Meta title
          </div>
          <div className="mt-1 text-foreground break-words">
            {metaTitle ? (
              metaTitle
            ) : (
              <span className="text-muted-foreground italic">Not set</span>
            )}
          </div>
        </div>

        {/* Meta description */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Meta description
          </div>
          <div className="mt-1 text-foreground break-words">
            {metaDescription ? (
              metaDescription
            ) : (
              <span className="text-muted-foreground italic">Not set</span>
            )}
          </div>
        </div>

        {/* Issues by pillar with deep links */}
        <div className="md:col-span-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Issues by category
          </div>
          <div className="mt-2">
            {issuesByPillar && issuesByPillar.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {issuesByPillar.map((pillar) => (
                  <Link
                    key={pillar.pillarId}
                    href={`${workspacePath}?tab=issues&pillar=${pillar.pillarId}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <span>{pillar.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {pillar.count}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-xs">
                No issues detected
              </span>
            )}
          </div>
        </div>

        {/* Alt text coverage */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Alt text coverage
          </div>
          <div className="mt-1 text-foreground">
            <span className="text-muted-foreground italic">
              View in product workspace
            </span>
          </div>
        </div>

        {/* Last optimized */}
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Last optimized
          </div>
          <div className="mt-1 text-foreground">
            <span className="text-muted-foreground italic">Not available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
