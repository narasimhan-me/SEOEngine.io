'use client';

import type { WorkQueueTab } from '@/lib/work-queue';

interface WorkQueueTabsProps {
  tabs: { key: WorkQueueTab; label: string }[];
  currentTab?: WorkQueueTab;
  onTabChange: (tab: WorkQueueTab | undefined) => void;
}

/**
 * [WORK-QUEUE-1] Work Queue Tabs Component
 * [NAV-HIERARCHY-POLISH-1] Token-only styling - entity tabs as view switchers
 *
 * Tab navigation: Critical | Needs Attention | Pending Approval | Drafts Ready | Applied Recently
 */
export function WorkQueueTabs({
  tabs,
  currentTab,
  onTabChange,
}: WorkQueueTabsProps) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex space-x-8" aria-label="Work Queue Tabs">
        {/* All tab - show when no specific tab is selected */}
        <button
          onClick={() => onTabChange(undefined)}
          className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            !currentTab
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          }`}
        >
          All
        </button>

        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              currentTab === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
