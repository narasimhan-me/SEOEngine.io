'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import { useParams, usePathname } from 'next/navigation';

/**
 * [NAV-IA-CONSISTENCY-1] Project navigation with grouped sections.
 *
 * Sections:
 * - OPERATE: Store Health, Work Queue
 * - ASSETS: Products, Pages, Collections
 * - AUTOMATION: Playbooks
 * - INSIGHTS: Insights (single item, active for all pillar routes)
 * - PROJECT: Project Settings
 *
 * Removed: Overview, Automation (old label), Settings (old label), Content, DEO Overview, pillar items
 */

interface NavItem {
  label: string;
  path: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    heading: 'OPERATE',
    items: [
      { label: 'Store Health', path: 'store-health' },
      { label: 'Work Queue', path: 'work-queue' },
    ],
  },
  {
    heading: 'ASSETS',
    items: [
      { label: 'Products', path: 'products' },
      { label: 'Pages', path: 'assets/pages' },
      { label: 'Collections', path: 'assets/collections' },
      { label: 'Blog posts', path: 'assets/blogs' },
    ],
  },
  {
    heading: 'AUTOMATION',
    items: [{ label: 'Playbooks', path: 'automation' }],
  },
  {
    heading: 'INSIGHTS',
    items: [{ label: 'Insights', path: 'insights' }],
  },
  {
    heading: 'PROJECT',
    items: [{ label: 'Project Settings', path: 'settings' }],
  },
];

// [NAV-IA-CONSISTENCY-1] Pillar routes that should activate the Insights item
const insightsPillarRoutes = [
  'deo',
  'keywords',
  'competitors',
  'backlinks',
  'local',
  'performance',
  'insights',
];

interface ProjectSideNavProps {
  onNavigate?: () => void;
}

export default function ProjectSideNav({ onNavigate }: ProjectSideNavProps) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;

  const isActive = (path: string) => {
    const fullPath = `/projects/${projectId}/${path}`;

    // [NAV-IA-CONSISTENCY-1] Special handling for Insights - active for all pillar routes
    if (path === 'insights') {
      return insightsPillarRoutes.some((pillarPath) => {
        const pillarFullPath = `/projects/${projectId}/${pillarPath}`;
        return (
          pathname === pillarFullPath ||
          pathname.startsWith(`${pillarFullPath}/`)
        );
      });
    }

    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  return (
    <nav
      className="w-full max-w-xs flex-shrink-0 md:w-48"
      data-testid="project-sidenav"
    >
      <div className="space-y-6">
        {navSections.map((section) => (
          <div key={section.heading}>
            {/* [NAV-HIERARCHY-POLISH-1] Section headings: reduced weight vs Global Nav */}
            <h3 className="px-3 mb-2 text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
              {section.heading}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    {/* [NAV-HIERARCHY-POLISH-1] Active state: neutral (no primary color) to demote vs Global Nav */}
                    {/* [UI-POLISH-&-CLARITY-1] Active accent bar + increased inactive contrast */}
                    <GuardedLink
                      href={`/projects/${projectId}/${item.path}`}
                      onClick={onNavigate}
                      className={`relative block rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        active
                          ? 'bg-muted font-medium text-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4/5 before:w-0.5 before:rounded-full before:bg-primary/60'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </GuardedLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
