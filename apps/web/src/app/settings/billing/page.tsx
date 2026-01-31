'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { billingApi, accountApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    projects: number;
    crawledPages: number;
    automationSuggestionsPerDay: number;
  };
  /** [BILLING-GTM-1] Monthly AI runs quota (null = unlimited) */
  aiQuotaMonthlyRuns: number | null;
}

interface BillingSummary {
  plan: string;
  status: string;
  limits: {
    projects: number;
    crawledPages: number;
    automationSuggestionsPerDay: number;
  };
  usage: {
    projects: number;
  };
  currentPeriodEnd?: string | null;
}

/**
 * [SELF-SERVICE-1] Plan & Billing Page (D3)
 *
 * - Shows current plan + renewal date
 * - Shows included AI quota + current usage vs quota
 * - "Billing handled via Stripe portal; no card details stored"
 * - Role-safe UI: OWNER sees enabled actions, EDITOR/VIEWER see read-only
 */

function BillingSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [pollingForUpdate, setPollingForUpdate] = useState(false);
  // [SELF-SERVICE-1] Account role for owner-only billing actions
  const [accountRole, setAccountRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER'>(
    'OWNER'
  );
  // [SELF-SERVICE-1] [BILLING-GTM-1] AI usage data with trust messaging
  const [aiUsage, setAiUsage] = useState<{
    periodLabel: string;
    totalRuns: number;
    aiUsedRuns: number;
    runsAvoided: number;
    quotaLimit: number | null;
    quotaUsedPercent: number;
    applyInvariantMessage: string;
    reuseMessage: string;
  } | null>(null);

  const feedback = useFeedback();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const pollingStartedRef = useRef(false);
  const warningShownRef = useRef(false);

  // Max poll attempts (10 attempts * 2 seconds = 20 seconds max wait)
  const MAX_POLL_ATTEMPTS = 10;
  const POLL_INTERVAL_MS = 2000;

  const fetchData = useCallback(async () => {
    try {
      const [plansData, summaryData, profileData, aiUsageData] =
        await Promise.all([
          billingApi.getPlans(),
          billingApi.getSummary(),
          accountApi.getProfile(),
          accountApi.getAiUsage(),
        ]);
      setPlans(plansData);
      setSummary(summaryData);
      // [SELF-SERVICE-1] Set account role for role-safe UI
      setAccountRole(profileData.accountRole);
      // [SELF-SERVICE-1] [BILLING-GTM-1] Set AI usage for quota display with trust messaging
      setAiUsage({
        periodLabel: aiUsageData.periodLabel,
        totalRuns: aiUsageData.totalRuns,
        aiUsedRuns: aiUsageData.aiUsedRuns,
        runsAvoided: aiUsageData.runsAvoided,
        quotaLimit: aiUsageData.quotaLimit,
        quotaUsedPercent: aiUsageData.quotaUsedPercent,
        applyInvariantMessage: aiUsageData.applyInvariantMessage,
        reuseMessage: aiUsageData.reuseMessage,
      });
      return summaryData;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load billing data';
      setError(message);
      feedback.showError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [feedback]);

  // Poll for plan update after successful checkout redirect
  const startPollingForPlanUpdate = useCallback(async () => {
    // Prevent multiple polling cycles from being started
    if (pollingStartedRef.current) {
      return;
    }
    pollingStartedRef.current = true;

    setPollingForUpdate(true);
    pollCountRef.current = 0;

    const poll = async () => {
      pollCountRef.current += 1;
      const summaryData = await fetchData();

      // Check if plan has updated from 'free'
      if (summaryData && summaryData.plan !== 'free') {
        // Plan updated successfully
        setPollingForUpdate(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        // Clear processing banner and query params once active
        setSuccess('');
        router.replace('/settings/billing');
        feedback.showSuccess('Your subscription is now active!');
        return;
      }

      // Stop polling after max attempts
      if (pollCountRef.current >= MAX_POLL_ATTEMPTS) {
        setPollingForUpdate(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        // Clear processing banner and query params
        setSuccess('');
        router.replace('/settings/billing');
        // Show warning that plan may take a moment to update (only once)
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          feedback.showWarning(
            'Your subscription is being processed. Please refresh the page in a moment.'
          );
        }
      }
    };

    // First poll immediately
    await poll();

    // Then poll at intervals if still needed
    if (pollCountRef.current < MAX_POLL_ATTEMPTS && pollingStartedRef.current) {
      pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }
  }, [fetchData, feedback, router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Reset refs for clean state if component remounts
      pollingStartedRef.current = false;
      warningShownRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Check for success/canceled from Stripe redirect
    if (searchParams.get('success') === 'true') {
      const message = 'Processing your subscription...';
      setSuccess(message);
      // Start polling for the plan update instead of showing immediate success
      startPollingForPlanUpdate();
    } else if (searchParams.get('canceled') === 'true') {
      const message = 'Checkout was canceled.';
      setError(message);
      feedback.showWarning(message);
      fetchData();
    } else {
      fetchData();
    }
  }, [router, searchParams, fetchData, startPollingForPlanUpdate, feedback]);

  // [SELF-SERVICE-1] Check if user is OWNER for billing actions
  const isOwner = accountRole === 'OWNER';

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return;
    // [SELF-SERVICE-1] Only OWNER can perform billing actions
    if (!isOwner) {
      setError('Only account owners can change billing plans');
      return;
    }

    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      const { url } = await billingApi.createCheckoutSession(planId);
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to start checkout';
      setError(message);
      feedback.showError(message);
      setUpdating(false);
    }
  }

  async function handleManageBilling() {
    // [SELF-SERVICE-1] Only OWNER can access billing portal
    if (!isOwner) {
      setError('Only account owners can manage billing');
      return;
    }

    setError('');
    setUpdating(true);

    try {
      const { url } = await billingApi.createPortalSession();
      // Redirect to Stripe Billing Portal
      window.location.href = url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to open billing portal';
      setError(message);
      feedback.showError(message);
      setUpdating(false);
    }
  }

  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(0)}`;
  }

  function formatLimit(limit: number): string {
    return limit === -1 ? 'Unlimited' : limit.toString();
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const effectivePlanId = summary?.plan ?? 'free';
  const effectiveStatus = summary?.status ?? 'active';

  const currentPlan = plans.find((plan) => plan.id === effectivePlanId) || null;
  const currentPrice = currentPlan?.price ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link href="/settings" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Settings
        </Link>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan & Billing</h1>
      <p className="text-gray-600 mb-6">
        See your current plan, usage, and limits. Change plans anytime—upgrades
        take effect immediately, downgrades at the end of your billing period.
      </p>

      {/* [SELF-SERVICE-1] Role-based access notice */}
      {!isOwner && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 text-sm">
            <strong>Read-only access:</strong> Only account owners can manage
            billing and change plans. Contact your account owner if you need to
            make changes.
          </p>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          {pollingForUpdate && (
            <svg
              className="animate-spin h-4 w-4 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
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
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {success}
        </div>
      )}

      {/* Current Subscription */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Current Plan
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-gray-900 capitalize">
            {effectivePlanId}
          </span>
          {effectivePlanId !== 'free' && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                effectiveStatus === 'active'
                  ? 'bg-green-100 text-green-800'
                  : effectiveStatus === 'canceled'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {effectiveStatus}
            </span>
          )}
        </div>

        {/* Usage Summary */}
        {summary && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Usage</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                Projects: {summary.usage.projects} /{' '}
                {formatLimit(summary.limits.projects)}
              </p>
            </div>
          </div>
        )}

        {/* [SELF-SERVICE-1] [BILLING-GTM-1] AI Usage Quota with Trust Messaging */}
        {aiUsage && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              AI Usage ({aiUsage.periodLabel})
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              {/* [BILLING-GTM-1] Fix: Show aiUsedRuns as numerator, not totalRuns */}
              <p>
                AI runs used: {aiUsage.aiUsedRuns} /{' '}
                {aiUsage.quotaLimit !== null ? aiUsage.quotaLimit : 'Unlimited'}
              </p>
              {/* [BILLING-GTM-1] Show runs avoided via reuse */}
              <p className="text-green-700">
                Runs avoided via reuse: {aiUsage.runsAvoided}
              </p>
              {aiUsage.quotaLimit !== null && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        aiUsage.quotaUsedPercent >= 90
                          ? 'bg-red-500'
                          : aiUsage.quotaUsedPercent >= 70
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(aiUsage.quotaUsedPercent, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {aiUsage.quotaUsedPercent.toFixed(0)}% of monthly quota used
                  </p>
                </div>
              )}
            </div>
            {/* [BILLING-GTM-1] Trust invariant display */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-800 font-medium">
                {aiUsage.applyInvariantMessage}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {aiUsage.reuseMessage}
              </p>
            </div>
            <Link
              href="/settings/ai-usage"
              className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
            >
              View detailed AI usage &rarr;
            </Link>
          </div>
        )}

        {summary?.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mt-4">
            {effectiveStatus === 'canceled'
              ? 'Access until: '
              : 'Next billing date: '}
            {new Date(summary.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}

        {/* Manage Billing Button for paid plans */}
        {effectivePlanId !== 'free' && effectiveStatus === 'active' && (
          <div className="mt-4">
            <button
              onClick={handleManageBilling}
              disabled={updating || !isOwner}
              className={`px-4 py-2 text-sm border rounded-md disabled:opacity-50 ${
                isOwner
                  ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {updating ? 'Processing...' : 'Manage Billing'}
            </button>
            {!isOwner && (
              <p className="text-xs text-gray-500 mt-1">
                Only account owners can manage billing
              </p>
            )}
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Choose the plan that fits your needs
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = effectivePlanId === plan.id;
          const isHigher = !isCurrent && plan.price > currentPrice;
          const isLower = !isCurrent && plan.price < currentPrice;
          // [SELF-SERVICE-1] Disable plan change for non-owners
          const isDisabled = updating || isCurrent || !isOwner;

          const buttonLabel = isCurrent
            ? 'Current Plan'
            : !isOwner
              ? 'Owner Only'
              : updating
                ? 'Processing...'
                : isHigher
                  ? 'Upgrade'
                  : isLower
                    ? 'Downgrade'
                    : 'Change Plan';

          return (
            <div
              key={plan.id}
              className={`bg-white shadow rounded-lg p-6 border-2 flex flex-col justify-between h-full ${
                isCurrent ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {plan.price === 0 ? 'Free' : `${formatPrice(plan.price)}/mo`}
                </p>

                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {formatLimit(plan.limits.projects)} projects
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatLimit(plan.limits.crawledPages)} crawled pages
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatLimit(plan.limits.automationSuggestionsPerDay)}{' '}
                    suggestions/day
                  </p>
                  {/* [BILLING-GTM-1] Monthly AI runs quota */}
                  <p className="text-xs text-gray-500">
                    {plan.aiQuotaMonthlyRuns === null
                      ? 'Unlimited'
                      : plan.aiQuotaMonthlyRuns}{' '}
                    AI runs/month
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (isDisabled) return;
                  handleUpgrade(plan.id);
                }}
                disabled={isDisabled}
                className={`w-full mt-4 px-4 py-2 text-sm rounded-md disabled:opacity-50 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {buttonLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <BillingSettingsContent />
    </Suspense>
  );
}
