'use client';

import type { PlaybookDefinition } from '@/lib/playbooks/playbookDefinitions';
import {
  PLAYBOOK_COMPLEXITY_INFO,
  PLAYBOOK_CATEGORY_INFO,
} from '@/lib/playbooks/playbookDefinitions';
import { AutomationCapabilityPanel } from './AutomationCapabilityPanel';
// [KAN-88: EA-50] Centralized governance narrative
import { GOVERNANCE_MICROCOPY, GOVERNANCE_PHRASES } from '@/lib/governance-narrative';

/**
 * [EA-40: PLAYBOOKS-SHELL-1] Playbook Detail Panel
 * [EA-42] Extended to display automation capability concepts
 * [KAN-88: EA-50] Governance narrative reinforcement
 *
 * Read-only panel displaying full playbook details.
 * Educational content only - no execution capabilities.
 *
 * Trust Contract:
 * - No execute/apply/schedule buttons
 * - Steps are conceptual, not actionable
 * - Purely informational display
 * - Automation info is read-only concepts, not triggers
 */

interface PlaybookDetailPanelProps {
  playbook: PlaybookDefinition;
  onClose: () => void;
}

export function PlaybookDetailPanel({
  playbook,
  onClose,
}: PlaybookDetailPanelProps) {
  const complexityInfo = PLAYBOOK_COMPLEXITY_INFO[playbook.complexity];
  const categoryInfo = PLAYBOOK_CATEGORY_INFO[playbook.category];

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">📖</span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {playbook.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {categoryInfo.label}
                </span>
                <span className="text-muted-foreground">·</span>
                <span
                  className={`
                    inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${
                      playbook.complexity === 'simple'
                        ? 'bg-green-500/10 text-green-600'
                        : playbook.complexity === 'moderate'
                          ? 'bg-yellow-500/10 text-yellow-600'
                          : 'bg-orange-500/10 text-orange-600'
                    }
                  `}
                >
                  {complexityInfo.label}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            aria-label="Close playbook details"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Description */}
        <div>
          <p className="text-sm text-foreground leading-relaxed">
            {playbook.description}
          </p>
        </div>

        {/* Addresses patterns */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Addresses These Patterns
          </h3>
          <ul className="flex flex-wrap gap-2">
            {playbook.addressesPatterns.map((pattern) => (
              <li
                key={pattern}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground"
              >
                {pattern}
              </li>
            ))}
          </ul>
        </div>

        {/* Conceptual Steps */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Conceptual Steps
          </h3>
          <div className="space-y-3">
            {playbook.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="flex items-start gap-3 p-3 rounded-md bg-muted/30"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                  {step.stepNumber}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* When to consider */}
        <div className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/20">
          <span className="text-yellow-500 flex-shrink-0 mt-0.5">💡</span>
          <div>
            <p className="text-xs font-medium text-foreground mb-1">
              When to Consider
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {playbook.whenToConsider}
            </p>
          </div>
        </div>

        {/* [EA-42] Automation capability panel - read-only, no execution affordances */}
        {playbook.automationMeta && (
          <AutomationCapabilityPanel automationMeta={playbook.automationMeta} />
        )}

        {/* Educational note */}
        {/* [KAN-88: EA-50] Governance narrative reinforcement */}
        <div className="flex items-start gap-3 p-3 rounded-md border border-blue-500/20 bg-blue-500/5">
          <span className="text-blue-500 flex-shrink-0 mt-0.5">ℹ️</span>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p>
              This playbook is for educational reference only. The steps describe
              a general approach you can adapt to your specific situation.
            </p>
            <p className="mt-2 font-medium">
              {GOVERNANCE_MICROCOPY.PLAYBOOK.BROWSE_NOTE}. {GOVERNANCE_MICROCOPY.PLAYBOOK.EXECUTION_NOTE}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
