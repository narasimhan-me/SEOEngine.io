'use client';

import { Bot, Shield, Undo2, Target, Ban } from 'lucide-react';
import type { AutomationCapabilityMeta } from '@/lib/playbooks/playbookDefinitions';

/**
 * [EA-42] Automation Capability Panel
 *
 * Read-only panel displaying what a playbook's automation would do.
 * Educational content only - NO execution affordances.
 *
 * Trust Contract:
 * - No execute, apply, schedule, or enable buttons
 * - Information is passive and read-only
 * - User can understand automation scope without triggering anything
 * - Framed as optional and user-controlled
 */

interface AutomationCapabilityPanelProps {
  automationMeta: AutomationCapabilityMeta;
}

export function AutomationCapabilityPanel({
  automationMeta,
}: AutomationCapabilityPanelProps) {
  return (
    <div
      className="border border-border rounded-lg bg-muted/20 overflow-hidden"
      data-testid="automation-capability-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Automation Available
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This playbook can be automated. Automation is optional and always
          under your control.
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* What it does */}
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            What this automation does
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {automationMeta.whatItDoes}
          </p>
        </div>

        {/* Scope boundaries */}
        <div className="grid grid-cols-2 gap-3">
          {/* What it touches */}
          <div className="p-3 rounded-md bg-muted/30 border border-border/50">
            <h4 className="text-xs font-medium text-foreground mb-2">
              Fields affected
            </h4>
            <ul className="space-y-1">
              {automationMeta.fieldsAffected.map((field) => (
                <li
                  key={field}
                  className="text-xs text-muted-foreground flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-primary/60" />
                  {field}
                </li>
              ))}
            </ul>
          </div>

          {/* What it doesn't touch */}
          <div className="p-3 rounded-md bg-muted/30 border border-border/50">
            <h4 className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Ban className="h-3 w-3 text-muted-foreground" />
              Does not touch
            </h4>
            <ul className="space-y-1">
              {automationMeta.doesNotTouch.map((item) => (
                <li
                  key={item}
                  className="text-xs text-muted-foreground flex items-center gap-1.5"
                >
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Reversibility */}
        <div className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-muted/20">
          <Undo2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground mb-0.5">
              {automationMeta.reversible ? 'Reversible' : 'Not reversible'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {automationMeta.reversibilityNote}
            </p>
          </div>
        </div>

        {/* Trigger description */}
        <div className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-muted/20">
          <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground mb-0.5">
              How it runs
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {automationMeta.triggerDescription}
            </p>
          </div>
        </div>

        {/* Scope description */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Scope:</span>{' '}
            {automationMeta.scopeDescription}
          </p>
        </div>
      </div>
    </div>
  );
}
