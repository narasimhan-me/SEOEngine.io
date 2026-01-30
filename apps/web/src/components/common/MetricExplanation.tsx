'use client';

/**
 * [DASHBOARD-SIGNAL-REWRITE-1] Metric Explanation Component
 * [EA-45] Enhanced with signal category badges and playbook references
 *
 * Displays metric explanations with progressive disclosure:
 * - Inline: Shows label with info icon
 * - Tooltip: Shows "what it measures" on hover
 * - Expanded: Shows full explanation with "why it matters" and interpretation
 *
 * Trust Contract:
 * - Every metric can be understood without external research
 * - Signals are clearly labeled as advisory (observation, guidance, action, automation)
 * - No signal implies obligation or automatic execution
 */

import { useState, useRef, useEffect } from 'react';
import type { MetricDefinition, MetricType, SignalCategory } from '@/lib/dashboard-metrics';

export interface MetricExplanationProps {
  /** Metric definition with all explanation content */
  metric: MetricDefinition;
  /** Current value to show interpretation for (optional) */
  value?: number | null;
  /** Display mode: 'inline' (icon only), 'label' (label + icon), 'full' (expanded) */
  mode?: 'inline' | 'label' | 'full';
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Type indicator pill (Signal vs Recommendation)
 */
function MetricTypePill({ type }: { type: MetricType }) {
  const config = {
    signal: {
      label: 'Observation',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      description: 'What we measured',
    },
    recommendation: {
      label: 'Suggestion',
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-700',
      description: 'What you can do',
    },
  };

  const { label, bgClass, textClass, description } = config[type];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${bgClass} ${textClass}`}
      title={description}
    >
      {label}
    </span>
  );
}

/**
 * [EA-45] Signal Category Badge for clear visual separation
 * Distinguishes between signals, actions, and automation concepts
 */
function SignalCategoryBadge({ category }: { category?: SignalCategory }) {
  if (!category) return null;

  const config: Record<SignalCategory, { label: string; bgClass: string; textClass: string; description: string }> = {
    observation: {
      label: 'Signal',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-600',
      description: 'Advisory measurement - no action required',
    },
    guidance: {
      label: 'Guidance Available',
      bgClass: 'bg-teal-50',
      textClass: 'text-teal-700',
      description: 'Signal with related playbook - explore when ready',
    },
    action: {
      label: 'Action',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-700',
      description: 'User-initiated action available',
    },
    automation: {
      label: 'Automation Concept',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      description: 'System capability - informational only',
    },
  };

  const { label, bgClass, textClass, description } = config[category];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${bgClass} ${textClass}`}
      title={description}
    >
      {label}
    </span>
  );
}

export function MetricExplanation({
  metric,
  value: _value,
  mode = 'label',
  size = 'md',
}: MetricExplanationProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(mode === 'full');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsTooltipVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  // Info icon SVG
  const InfoIcon = () => (
    <svg
      className={`${iconSize} text-gray-400 hover:text-gray-600 transition-colors`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  // Inline mode: just the icon
  if (mode === 'inline') {
    return (
      <div className="relative inline-flex items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsTooltipVisible(!isTooltipVisible)}
          onMouseEnter={() => setIsTooltipVisible(true)}
          onMouseLeave={() => setIsTooltipVisible(false)}
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          aria-label={`Learn more about ${metric.label}`}
          aria-expanded={isTooltipVisible}
        >
          <InfoIcon />
        </button>
        {isTooltipVisible && (
          <div
            ref={tooltipRef}
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-lg bg-gray-900 text-white p-3 text-xs shadow-lg"
          >
            <div className="font-medium mb-1">{metric.label}</div>
            <div className="text-gray-300">{metric.whatItMeasures}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    );
  }

  // Label mode: label with info icon trigger
  if (mode === 'label') {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <span className={`font-medium text-gray-700 ${textSize}`}>
          {metric.label}
        </span>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsTooltipVisible(!isTooltipVisible)}
          onMouseEnter={() => setIsTooltipVisible(true)}
          onMouseLeave={() => setIsTooltipVisible(false)}
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
          aria-label={`Learn more about ${metric.label}`}
          aria-expanded={isTooltipVisible}
        >
          <InfoIcon />
        </button>
        {isTooltipVisible && (
          <div
            ref={tooltipRef}
            role="tooltip"
            className="absolute top-full left-0 mt-2 z-50 w-72 rounded-lg bg-white border border-gray-200 p-3 text-xs shadow-lg"
          >
            <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
              <span className="font-medium text-gray-900">{metric.label}</span>
              <div className="flex items-center gap-1">
                <MetricTypePill type={metric.type} />
                <SignalCategoryBadge category={metric.signalCategory} />
              </div>
            </div>
            <p className="text-gray-600 mb-2">{metric.whatItMeasures}</p>
            {/* [EA-45] Advisory note for trust clarity */}
            {metric.advisoryNote && (
              <p className="text-[10px] text-gray-400 italic mb-2">{metric.advisoryNote}</p>
            )}
            {/* [EA-45] Playbook reference if available */}
            {metric.relatedPlaybookId && (
              <p className="text-[10px] text-teal-600 mb-2">
                Playbook available: Explore guidance when ready
              </p>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
                setIsTooltipVisible(false);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Learn more →
            </button>
          </div>
        )}
        {/* Expanded modal for full details */}
        {isExpanded && mode === 'label' && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{metric.label}</h3>
                  <MetricTypePill type={metric.type} />
                  <SignalCategoryBadge category={metric.signalCategory} />
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">What this measures</h4>
                  <p className="text-gray-600">{metric.whatItMeasures}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Why it matters</h4>
                  <p className="text-gray-600">{metric.whyItMatters}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-1">How to interpret</h4>
                  <p className="text-gray-600">{metric.howToInterpret}</p>
                </div>

                {/* [EA-45] Related playbook guidance reference */}
                {metric.relatedPlaybookId && (
                  <div className="bg-teal-50 border border-teal-100 rounded-md p-2 text-xs text-teal-800">
                    <strong>Guidance available:</strong> A playbook is available for this signal.
                    Explore it when you&apos;re ready to improve this area.
                  </div>
                )}

                {metric.technicalTerm && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      Technical term: <span className="font-mono">{metric.technicalTerm}</span>
                    </span>
                  </div>
                )}

                {metric.dataSource && (
                  <div className="text-xs text-gray-500">
                    Data source: {metric.dataSource}
                  </div>
                )}

                {metric.limitations && (
                  <div className="bg-amber-50 border border-amber-100 rounded-md p-2 text-xs text-amber-800">
                    <strong>Note:</strong> {metric.limitations}
                  </div>
                )}

                {/* [EA-45] Advisory nature statement */}
                {metric.advisoryNote && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 italic">{metric.advisoryNote}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode: always expanded inline
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{metric.label}</h3>
        <MetricTypePill type={metric.type} />
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <h4 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-1">What this measures</h4>
          <p className="text-gray-600">{metric.whatItMeasures}</p>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-1">Why it matters</h4>
          <p className="text-gray-600">{metric.whyItMatters}</p>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-1">How to interpret</h4>
          <p className="text-gray-600">{metric.howToInterpret}</p>
        </div>

        {metric.technicalTerm && (
          <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
            Technical term: <span className="font-mono">{metric.technicalTerm}</span>
          </div>
        )}

        {metric.limitations && (
          <div className="bg-amber-50 border border-amber-100 rounded-md p-2 text-xs text-amber-800">
            <strong>Note:</strong> {metric.limitations}
          </div>
        )}
      </div>
    </div>
  );
}
