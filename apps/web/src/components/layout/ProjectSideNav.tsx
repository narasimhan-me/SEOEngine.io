'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import { useParams, usePathname } from 'next/navigation';

/**
 * [NAV-IA-CONSISTENCY-1] Project navigation with grouped sections.
 * [CENTER-PANE-NAV-REMODEL-1] Demoted to low-emphasis contextual index.
 * [WORK-CANVAS-ARCHITECTURE-LOCK-1] Scoped nav container with "inside this project" visual cue.
 *
 * Styling changes (CENTER-PANE-NAV-REMODEL-1):
 * - Reduced visual weight (lighter typography/contrast, tighter spacing)
 * - Subtle active state: thin accent indicator + readable text (no heavy background blocks)
 * - No icons added
 * - Calm hover state (must not compete with Global Nav)
 *
 * Styling changes (WORK-CANVAS-ARCHITECTURE-LOCK-1):
 * - Distinct container surface (bg-[hsl(var(--surface-card))]) with border
 * - Strengthened active-state: more visible accent bar + font-semibold
 * - No icons or counters/badges added
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
// [CENTER-PANE-NAV-REMODEL-1 FIXUP-1] Added 'media' for correct active-state coverage
const insightsPillarRoutes = [
  'deo',
  'keywords',
  'competitors',
  'backlinks',
  'local',
  'performance',
  'media',
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
      className="w-full max-w-xs flex-shrink-0 md:w-44"
      data-testid="project-sidenav"
    >
      {/* [WORK-CANVAS-ARCHITECTURE-LOCK-1] Distinct container surface: "inside this project" visual cue */}
      {/* Low-emphasis background (surface-card) with border to separate from center content without competing with left rail */}
      <div className="rounded-md border border-border bg-[hsl(var(--surface-card))] p-2">
        {/* [CENTER-PANE-NAV-REMODEL-1] Tighter spacing (space-y-4 instead of space-y-6) */}
        <div className="space-y-4">
        {navSections.map((section) => (
          <div key={section.heading}>
            {/* [CENTER-PANE-NAV-REMODEL-1] Section headings: lighter weight, reduced opacity */}
            <h3 className="px-2 mb-1.5 text-[10px] font-normal text-muted-foreground/60 uppercase tracking-wider">
              {section.heading}
            </h3>
            {/* [CENTER-PANE-NAV-REMODEL-1] Tighter item spacing */}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    {/* [CENTER-PANE-NAV-REMODEL-1] Low-emphasis contextual index styling:
                        - Subtle active state: thin accent bar only, no heavy background block
                        - Lighter inactive text (text-muted-foreground)
                        - Calm hover (transparent bg with slight text emphasis)
                        - Tighter padding (py-1.5 px-2)
                        - Smaller text (text-xs)
                        [WORK-CANVAS-ARCHITECTURE-LOCK-1] Strengthened active-state:
                        - More visible accent bar (bg-primary/70 instead of bg-primary/50)
                        - Font weight increase (font-semibold instead of font-medium)
                        - No icons or counters/badges */}
                    <GuardedLink
                      href={`/projects/${projectId}/${item.path}`}
                      onClick={onNavigate}
                      className={`relative block rounded px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                        active
                          ? 'text-foreground font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-3/5 before:w-0.5 before:rounded-full before:bg-primary/70'
                          : 'text-muted-foreground hover:text-foreground/80'
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
      </div>
    </nav>
  );
}
