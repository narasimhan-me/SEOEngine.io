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
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.heading}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <GuardedLink
                      href={`/projects/${projectId}/${item.path}`}
                      onClick={onNavigate}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? 'border-l-2 border-primary bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
