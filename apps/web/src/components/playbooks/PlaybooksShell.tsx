'use client';

import { PlaybooksList } from './PlaybooksList';

/**
 * [EA-40: PLAYBOOKS-SHELL-1] Playbooks Shell
 * [EA-42] Extended to surface automation concepts without execution
 *
 * Main navigation shell for the Playbooks section.
 * Provides read-only visibility into available playbooks with
 * clear educational framing.
 *
 * Trust Contract:
 * - No execution, automation, or scheduling
 * - Playbooks feel educational, not powerful
 * - Users can browse safely without risk
 * - Viewing triggers no backend mutations
 * - Automation info is conceptual, not actionable
 */

export function PlaybooksShell() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <h1 className="text-2xl font-semibold text-foreground">Playbooks</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Browse common fix strategies and approaches for improving your store's
          discoverability. Playbooks help you understand repeatable patterns
          without committing to any changes.
        </p>
      </div>

      {/* Educational notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
        <span className="text-blue-500 flex-shrink-0 mt-0.5">ℹ️</span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Playbooks are for reference only
          </p>
          <p className="text-sm text-muted-foreground">
            Browsing playbooks is completely safe and will not make any changes
            to your store. Use these as educational guides to understand common
            improvement strategies. Some playbooks show automation capabilities
            — this is informational only. Automation is always optional and
            user-controlled.
          </p>
        </div>
      </div>

      {/* Playbooks list */}
      <PlaybooksList />
    </div>
  );
}
