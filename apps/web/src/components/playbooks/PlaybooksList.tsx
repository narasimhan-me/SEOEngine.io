'use client';

import { useState, useMemo } from 'react';
import { PlaybookCard } from './PlaybookCard';
import { PlaybookDetailPanel } from './PlaybookDetailPanel';
import {
  PLAYBOOK_DEFINITIONS,
  PLAYBOOK_CATEGORY_INFO,
  getPlaybookById,
  type PlaybookCategory,
} from '@/lib/playbooks/playbookDefinitions';

/**
 * [EA-40: PLAYBOOKS-SHELL-1] Playbooks List
 *
 * Main component displaying all available playbooks.
 * Supports category filtering and detail expansion.
 *
 * Trust Contract:
 * - Read-only browsing experience
 * - No execution capabilities
 * - Educational presentation
 */

type FilterCategory = PlaybookCategory | 'all';

export function PlaybooksList() {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(
    null
  );

  const filteredPlaybooks = useMemo(() => {
    if (selectedCategory === 'all') {
      return PLAYBOOK_DEFINITIONS;
    }
    return PLAYBOOK_DEFINITIONS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const selectedPlaybook = selectedPlaybookId
    ? getPlaybookById(selectedPlaybookId)
    : null;

  const handleSelectPlaybook = (playbookId: string) => {
    setSelectedPlaybookId((current) =>
      current === playbookId ? null : playbookId
    );
  };

  const categories: { value: FilterCategory; label: string }[] = [
    { value: 'all', label: 'All Playbooks' },
    { value: 'content', label: PLAYBOOK_CATEGORY_INFO.content.label },
    { value: 'technical', label: PLAYBOOK_CATEGORY_INFO.technical.label },
    { value: 'visibility', label: PLAYBOOK_CATEGORY_INFO.visibility.label },
    { value: 'entities', label: PLAYBOOK_CATEGORY_INFO.entities.label },
  ];

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.value);
              setSelectedPlaybookId(null);
            }}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${
                selectedCategory === cat.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Playbooks grid and detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Playbooks list */}
        <div className="space-y-3">
          {filteredPlaybooks.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No playbooks found in this category.
            </p>
          ) : (
            filteredPlaybooks.map((playbook) => (
              <PlaybookCard
                key={playbook.id}
                playbook={playbook}
                onSelect={handleSelectPlaybook}
                isSelected={selectedPlaybookId === playbook.id}
              />
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-4 h-fit">
          {selectedPlaybook ? (
            <PlaybookDetailPanel
              playbook={selectedPlaybook}
              onClose={() => setSelectedPlaybookId(null)}
            />
          ) : (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select a playbook to view its details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
