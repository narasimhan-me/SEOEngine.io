'use client';

/**
 * [EA-43: AUTOMATION-INTENT-CONFIRMATION-1] Explicit Intent Confirmation Modal
 *
 * This modal enforces deliberate, explicit confirmation before any automation can execute.
 * Trust Contract:
 * - No automation may execute without explicit user confirmation
 * - No silent or implicit confirmation—requires deliberate user action
 * - No one-click execution—confirmation is a distinct, conscious step
 * - Impact is clearly restated before user can confirm
 * - User must explicitly acknowledge responsibility before automation runs
 *
 * Design System: v1.5
 * EIC Version: 1.5
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@/components/icons';

export interface AutomationIntentConfirmationProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler when user cancels (closes modal without confirming) */
  onCancel: () => void;
  /** Handler when user confirms intent (proceed with automation) */
  onConfirm: () => void;
  /** What the automation will do (impact statement) */
  impactStatement: string;
  /** Number of items/assets affected */
  affectedCount: number;
  /** Type of assets affected (e.g., "products", "pages", "collections") */
  assetType: string;
  /** Specific action being performed (e.g., "update SEO titles", "apply AI-generated descriptions") */
  actionDescription: string;
  /** Target system (e.g., "Shopify") */
  targetSystem?: string;
  /** Whether confirmation is in progress (loading state) */
  isConfirming?: boolean;
}

/**
 * Modal component for explicit automation intent confirmation.
 * Requires users to:
 * 1. Read the impact statement
 * 2. Check a responsibility acknowledgement checkbox
 * 3. Type a confirmation phrase
 * 4. Click the confirm button (separate from checkbox)
 */
export function AutomationIntentConfirmationModal({
  isOpen,
  onCancel,
  onConfirm,
  impactStatement,
  affectedCount,
  assetType,
  actionDescription,
  targetSystem = 'Shopify',
  isConfirming = false,
}: AutomationIntentConfirmationProps) {
  const [acknowledgedResponsibility, setAcknowledgedResponsibility] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Required confirmation phrase
  const CONFIRMATION_PHRASE = 'APPLY';

  // Check if all confirmation requirements are met
  const canConfirm =
    acknowledgedResponsibility &&
    confirmationText.toUpperCase() === CONFIRMATION_PHRASE &&
    !isConfirming;

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAcknowledgedResponsibility(false);
      setConfirmationText('');
    }
  }, [isOpen]);

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isConfirming) {
        onCancel();
      }
    };

    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirming, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isConfirming) {
        onCancel();
      }
    },
    [isConfirming, onCancel]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intent-confirmation-title"
      data-testid="automation-intent-confirmation-modal"
    >
      <div
        ref={modalRef}
        className="relative mx-4 w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--warning-background))]">
              <Icon
                name="status.warning"
                size={24}
                className="text-[hsl(var(--warning-foreground))]"
              />
            </div>
            <h2
              id="intent-confirmation-title"
              className="text-lg font-semibold text-foreground"
            >
              Confirm Automation Execution
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="Close confirmation dialog"
            data-testid="intent-confirmation-close"
          >
            <Icon name="nav.close" size={20} />
          </button>
        </div>

        {/* Impact Statement */}
        <div
          className="mb-4 rounded-lg border border-[hsl(var(--warning-foreground)/0.2)] bg-[hsl(var(--warning-background))] p-4"
          data-testid="intent-confirmation-impact"
        >
          <h3 className="mb-2 text-sm font-medium text-[hsl(var(--warning-foreground))]">
            What will happen:
          </h3>
          <p className="text-sm text-foreground">{impactStatement}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{affectedCount}</strong> {assetType} affected
            </span>
            <span>
              Target: <strong className="text-foreground">{targetSystem}</strong>
            </span>
          </div>
        </div>

        {/* Action Description */}
        <div className="mb-4 rounded border border-border bg-[hsl(var(--surface-raised))] p-3">
          <p className="text-sm text-foreground">
            <strong>Action:</strong> {actionDescription}
          </p>
        </div>

        {/* Responsibility Acknowledgement Checkbox */}
        <label
          className="mb-4 flex items-start gap-3 rounded border border-border p-3 hover:bg-muted/50"
          data-testid="intent-confirmation-responsibility"
        >
          <input
            type="checkbox"
            checked={acknowledgedResponsibility}
            onChange={(e) => setAcknowledgedResponsibility(e.target.checked)}
            disabled={isConfirming}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground">
            I understand that this automation will make changes to my {assetType} in {targetSystem}.
            I accept responsibility for reviewing and approving these changes.
          </span>
        </label>

        {/* Confirmation Text Input */}
        <div className="mb-6">
          <label
            htmlFor="confirmation-text"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Type <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">APPLY</code> to confirm:
          </label>
          <input
            id="confirmation-text"
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isConfirming}
            placeholder="Type APPLY to confirm"
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            data-testid="intent-confirmation-text-input"
            autoComplete="off"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            data-testid="intent-confirmation-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="intent-confirmation-confirm"
            aria-describedby="confirm-requirements"
          >
            {isConfirming ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Executing...
              </>
            ) : (
              'Confirm and Execute'
            )}
          </button>
        </div>

        {/* Screen reader hint for requirements */}
        <p id="confirm-requirements" className="sr-only">
          To confirm, you must check the responsibility acknowledgement checkbox and type APPLY in the
          confirmation field.
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to manage automation intent confirmation flow.
 * Returns state and handlers for the confirmation modal.
 */
export function useAutomationIntentConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const pendingConfirmRef = useRef<(() => Promise<void>) | null>(null);

  const requestConfirmation = useCallback((onConfirmed: () => Promise<void>) => {
    pendingConfirmRef.current = onConfirmed;
    setIsOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    pendingConfirmRef.current = null;
    setIsOpen(false);
    setIsConfirming(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmRef.current) return;

    setIsConfirming(true);
    try {
      await pendingConfirmRef.current();
    } finally {
      pendingConfirmRef.current = null;
      setIsOpen(false);
      setIsConfirming(false);
    }
  }, []);

  return {
    isOpen,
    isConfirming,
    requestConfirmation,
    handleCancel,
    handleConfirm,
  };
}
