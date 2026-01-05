'use client';

import { GuardedLink } from '@/components/navigation/GuardedLink';
import { useParams, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Activity,
  Package,
  FileText,
  Library,
  LineChart,
  Globe,
  Tags,
  PenTool,
  Image,
  Search,
  Swords,
  Link,
  MapPin,
  Cpu,
  Bot,
  Settings,
  LucideIcon
} from 'lucide-react';

/**
 * Project navigation items aligned with the DEO pillar-centric model.
 * Order reflects the canonical pillar hierarchy while maintaining existing routes.
 *
 * [STORE-HEALTH-1.0] Store Health is the primary landing page for projects.
 * [ASSETS-PAGES-1] Assets section groups Products, Pages, and Collections.
 */

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: 'Store Health', path: 'store-health', icon: LayoutDashboard }, // [STORE-HEALTH-1.0] Primary landing
  { label: 'Work Queue', path: 'work-queue', icon: ListTodo }, // [WORK-QUEUE-1] Unified action bundle queue
  { label: 'Overview', path: 'overview', icon: Activity },
  // [ASSETS-PAGES-1] Assets section
  { label: 'Products', path: 'products', icon: Package },
  { label: 'Pages', path: 'assets/pages', icon: FileText }, // [ASSETS-PAGES-1] Pages asset list
  { label: 'Collections', path: 'assets/collections', icon: Library }, // [ASSETS-PAGES-1] Collections asset list
  { label: 'Insights', path: 'insights', icon: LineChart }, // [INSIGHTS-1] Read-only analytics
  { label: 'DEO Overview', path: 'deo', icon: Globe },
  { label: 'Metadata', path: 'metadata', icon: Tags },
  { label: 'Content', path: 'content', icon: PenTool },
  { label: 'Media', path: 'media', icon: Image },
  { label: 'Search & Intent', path: 'keywords', icon: Search },
  { label: 'Competitors', path: 'competitors', icon: Swords },
  { label: 'Off-site Signals', path: 'backlinks', icon: Link },
  { label: 'Local Discovery', path: 'local', icon: MapPin },
  // Technical Indexability pillar (using existing performance route)
  { label: 'Technical', path: 'performance', icon: Cpu },
  { label: 'Automation', path: 'automation', icon: Bot },
  { label: 'Settings', path: 'settings', icon: Settings },
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
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  return (
    <nav className="w-full max-w-xs flex-shrink-0 md:w-48">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <GuardedLink
                href={`/projects/${projectId}/${item.path}`}
                onClick={onNavigate}
                className={`group flex items-center rounded px-3 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${active
                  ? 'bg-signal/10 text-signal shadow-[0_0_10px_rgba(102,252,241,0.1)]'
                  : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                  }`}
              >
                <Icon className={`mr-2.5 h-4 w-4 flex-shrink-0 transition-colors ${active ? 'text-signal' : 'text-muted-foreground/70 group-hover:text-foreground'}`} />
                {item.label}
              </GuardedLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
