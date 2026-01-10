'use client';

import type { WorkQueueTab } from '@/lib/work-queue';

interface WorkQueueTabsProps {
  tabs: { key: WorkQueueTab; label: string }[];
  currentTab?: WorkQueueTab;
  onTabChange: (tab: WorkQueueTab | undefined) => void;
}

/**
 * [WORK-QUEUE-1] Work Queue Tabs Component
 *
 * Tab navigation: Critical | Needs Attention | Pending Approval | Drafts Ready | Applied Recently
 */
export function WorkQueueTabs({ tabs, currentTab, onTabChange }: WorkQueueTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Work Queue Tabs">
        {/* All tab - show when no specific tab is selected */}
        <button
          onClick={() => onTabChange(undefined)}
          className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
            !currentTab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          All
        </button>

        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              currentTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
