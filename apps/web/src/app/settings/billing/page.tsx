'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { billingApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

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
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

interface Entitlements {
  plan: string;
  limits: {
    projects: number;
    crawledPages: number;
    automationSuggestionsPerDay: number;
  };
  usage: {
    projects: number;
  };
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

function BillingSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Check for success/canceled from Stripe redirect
    if (searchParams.get('success') === 'true') {
      setSuccess('Subscription updated successfully!');
    } else if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled.');
    }

    fetchData();
  }, [router, searchParams]);

  async function fetchData() {
    try {
      const [plansData, summaryData] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSummary(),
      ]);
      setPlans(plansData);
      setSummary(summaryData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return;

    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      const { url } = await billingApi.createCheckoutSession(planId);
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setUpdating(false);
    }
  }

  async function handleManageBilling() {
    setError('');
    setUpdating(true);

    try {
      const { url } = await billingApi.createPortalSession();
      // Redirect to Stripe Billing Portal
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
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

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
      <p className="text-gray-600 mb-8">Manage your subscription plan</p>

      {/* Status messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Current Subscription */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-gray-900 capitalize">
            {effectivePlanId}
          </span>
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
        </div>

        {/* Usage Summary */}
        {summary && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Usage</h3>
            <div className="text-sm text-gray-600">
              <p>
                Projects: {summary.usage.projects} / {formatLimit(summary.limits.projects)}
              </p>
            </div>
          </div>
        )}

        {summary?.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mt-4">
            {effectiveStatus === 'canceled' ? 'Access until: ' : 'Next billing date: '}
            {new Date(summary.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}

        {/* Manage Billing Button for paid plans */}
        {effectivePlanId !== 'free' && effectiveStatus === 'active' && (
          <button
            onClick={handleManageBilling}
            disabled={updating}
            className="mt-4 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {updating ? 'Processing...' : 'Manage Billing'}
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = effectivePlanId === plan.id;
          const isHigher = !isCurrent && plan.price > currentPrice;
          const isLower = !isCurrent && plan.price < currentPrice;
          const isDisabled = updating || isCurrent;

          const buttonLabel = isCurrent
            ? 'Current Plan'
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
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {plan.price === 0 ? 'Free' : `${formatPrice(plan.price)}/mo`}
                </p>

                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
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
                    {formatLimit(plan.limits.automationSuggestionsPerDay)} suggestions/day
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
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    }>
      <BillingSettingsContent />
    </Suspense>
  );
}
