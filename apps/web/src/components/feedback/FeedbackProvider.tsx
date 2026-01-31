'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type FeedbackVariant = 'success' | 'error' | 'info' | 'warning' | 'limit';

interface FeedbackMessage {
  id: number;
  variant: FeedbackVariant;
  message: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

interface FeedbackContextValue {
  show: (
    variant: FeedbackVariant,
    message: string,
    options?: {
      description?: string;
      actionHref?: string;
      actionLabel?: string;
    }
  ) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showLimit: (message: string, actionHref?: string) => void;
  /**
   * [KAN-86] Show first-loop success feedback.
   * Calm, factual messaging for first-time users completing review → draft → apply.
   */
  showFirstLoopSuccess: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(
  undefined
);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const idRef = useRef(0);

  const removeMessage = useCallback((id: number) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
  }, []);

  const showBase = useCallback(
    (
      variant: FeedbackVariant,
      message: string,
      options?: {
        description?: string;
        actionHref?: string;
        actionLabel?: string;
      }
    ) => {
      idRef.current += 1;
      const id = idRef.current;
      const next: FeedbackMessage = {
        id,
        variant,
        message,
        description: options?.description,
        actionHref: options?.actionHref,
        actionLabel: options?.actionLabel,
      };
      setMessages((prev) => [...prev, next]);

      const duration = variant === 'error' || variant === 'limit' ? 8000 : 5000;
      if (duration > 0 && typeof window !== 'undefined') {
        window.setTimeout(() => removeMessage(id), duration);
      }
    },
    [removeMessage]
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({
      show: (variant, message, options) => showBase(variant, message, options),
      showSuccess: (message) => showBase('success', message),
      showError: (message) => showBase('error', message),
      showInfo: (message) => showBase('info', message),
      showWarning: (message) => showBase('warning', message),
      showLimit: (message, actionHref) =>
        showBase('limit', message, {
          actionHref,
          actionLabel: actionHref ? 'Upgrade' : undefined,
        }),
      /**
       * [KAN-86] Show first-loop success feedback.
       * Calm, factual messaging for first-time users completing review → draft → apply.
       */
      showFirstLoopSuccess: () =>
        showBase('success', 'Applied to Shopify successfully!', {
          description: 'Your store is now updated with your changes.',
        }),
    }),
    [showBase]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackToasts messages={messages} onDismiss={removeMessage} />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

interface FeedbackToastsProps {
  messages: FeedbackMessage[];
  onDismiss: (id: number) => void;
}

function FeedbackToasts({ messages, onDismiss }: FeedbackToastsProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-3 sm:items-end">
        {messages.map((message) => {
          let containerClasses =
            'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-gray-900 text-white';
          let iconColor = 'text-white';

          if (message.variant === 'success') {
            containerClasses =
              'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-green-600 text-white';
            iconColor = 'text-green-100';
          } else if (message.variant === 'error') {
            containerClasses =
              'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-red-600 text-white';
            iconColor = 'text-red-100';
          } else if (
            message.variant === 'warning' ||
            message.variant === 'limit'
          ) {
            containerClasses =
              'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-yellow-600 text-white';
            iconColor = 'text-yellow-100';
          }

          return (
            <div key={message.id} className={containerClasses} role="alert">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className={iconColor}>
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <circle cx="10" cy="10" r="10" />
                      </svg>
                    </span>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{message.message}</p>
                    {message.description && (
                      <p className="mt-1 text-sm opacity-90">
                        {message.description}
                      </p>
                    )}
                    {message.actionHref && (
                      <div className="mt-3">
                        <Link
                          href={message.actionHref}
                          className="inline-flex text-sm font-medium underline"
                        >
                          {message.actionLabel ?? 'View'}
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onDismiss(message.id)}
                      className="inline-flex rounded-md bg-black/0 text-white hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                      <span className="sr-only">Dismiss</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
