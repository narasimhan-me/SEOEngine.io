'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    scansPerMonth: number;
    aiSuggestionsPerMonth: number;
  };
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export default function BillingSettingsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [router]);

  async function fetchData() {
    try {
      const [plansData, subscriptionData] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSubscription(),
      ]);
      setPlans(plansData);
      setSubscription(subscriptionData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      await billingApi.subscribe(planId);
      setSuccess(`Successfully subscribed to ${planId} plan!`);
      // Refresh subscription data
      const subscriptionData = await billingApi.getSubscription();
      setSubscription(subscriptionData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancel() {
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      await billingApi.cancel();
      setSuccess('Subscription canceled. You will retain access until the end of your billing period.');
      // Refresh subscription data
      const subscriptionData = await billingApi.getSubscription();
      setSubscription(subscriptionData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
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
            {subscription?.plan || 'Free'}
          </span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              subscription?.status === 'active'
                ? 'bg-green-100 text-green-800'
                : subscription?.status === 'canceled'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {subscription?.status || 'Active'}
          </span>
        </div>
        {subscription?.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mt-2">
            {subscription.status === 'canceled' ? 'Access until: ' : 'Next billing date: '}
            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}
        {subscription?.plan !== 'free' && subscription?.status === 'active' && (
          <button
            onClick={handleCancel}
            disabled={updating}
            className="mt-4 px-4 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            {updating ? 'Processing...' : 'Cancel Subscription'}
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={`bg-white shadow rounded-lg p-6 border-2 ${
                isCurrent ? 'border-blue-500' : 'border-transparent'
              }`}
            >
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
                  {formatLimit(plan.limits.scansPerMonth)} scans/mo
                </p>
                <p className="text-xs text-gray-500">
                  {formatLimit(plan.limits.aiSuggestionsPerMonth)} AI suggestions/mo
                </p>
              </div>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={updating || isCurrent}
                className={`w-full mt-4 px-4 py-2 text-sm rounded-md disabled:opacity-50 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isCurrent ? 'Current Plan' : updating ? 'Processing...' : 'Select Plan'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
