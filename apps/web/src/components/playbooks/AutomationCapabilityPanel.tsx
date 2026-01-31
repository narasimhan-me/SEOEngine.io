'use client';

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
          <span className="text-muted-foreground">🤖</span>
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Automation Available
          </h3>
          {/* [EA-47] Explicit non-execution badge */}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
            Reading only
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This playbook could be automated if you chose to enable it. Automation is optional and always
          under your control.{' '}
          <span className="font-medium">Reading this description does not trigger any action.</span>
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* [EA-47] What it does - using conditional tense */}
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
            <span className="text-muted-foreground">🎯</span>
            What this automation would do
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {automationMeta.whatItDoes}
          </p>
        </div>

        {/* [EA-47] Scope boundaries - using conditional tense */}
        <div className="grid grid-cols-2 gap-3">
          {/* What it would touch */}
          <div className="p-3 rounded-md bg-muted/30 border border-border/50">
            <h4 className="text-xs font-medium text-foreground mb-2">
              Fields that would be affected
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

          {/* [EA-47] What it wouldn't touch */}
          <div className="p-3 rounded-md bg-muted/30 border border-border/50">
            <h4 className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
              <span className="text-muted-foreground">🚫</span>
              Would not touch
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

        {/* [EA-47] Reversibility - conditional tense */}
        <div className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-muted/20">
          <span className="text-muted-foreground flex-shrink-0 mt-0.5">↩️</span>
          <div>
            <p className="text-xs font-medium text-foreground mb-0.5">
              {automationMeta.reversible ? 'Would be reversible' : 'Would not be reversible'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {automationMeta.reversibilityNote}
            </p>
          </div>
        </div>

        {/* [EA-47] Trigger description - conditional tense */}
        <div className="flex items-start gap-3 p-3 rounded-md border border-border/50 bg-muted/20">
          <span className="text-muted-foreground flex-shrink-0 mt-0.5">🛡️</span>
          <div>
            <p className="text-xs font-medium text-foreground mb-0.5">
              How it would run
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {automationMeta.triggerDescription}
            </p>
          </div>
        </div>

        {/* [EA-47] Scope description - conditional tense */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Would target:</span>{' '}
            {automationMeta.scopeDescription}
          </p>
        </div>

        {/* [EA-47] Explicit non-execution reminder */}
        <div className="pt-2 mt-2 border-t border-border/50 bg-slate-50/50 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
          <p className="text-[10px] text-slate-500 text-center">
            This is a description of what automation could do—nothing happens until you explicitly choose to enable it.
          </p>
        </div>
      </div>
    </div>
  );
}
