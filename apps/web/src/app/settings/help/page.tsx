'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

/**
 * [SELF-SERVICE-1] Help Hub (D7)
 * [GTM-ONBOARD-1] First DEO Win restart entry point
 *
 * - Help center link
 * - Contact support entry point
 * - "Report an issue" with context guidance
 * - "Get your first DEO win" onboarding restart
 */
export default function HelpPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
      <p className="text-gray-600 mb-8">
        Get help with EngineO.ai and contact our support team.
      </p>

      <div className="space-y-6">
        {/* Help Center */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Help Center</h2>
              <p className="text-gray-600 mt-1 mb-4">
                Browse our documentation, tutorials, and frequently asked questions.
              </p>
              <a
                href="https://docs.seoengine.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Visit Help Center
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Contact Support</h2>
              <p className="text-gray-600 mt-1 mb-4">
                Need help? Our support team is here to assist you with any questions or issues.
              </p>
              <a
                href="mailto:support@engineo.ai"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Email Support
              </a>
            </div>
          </div>
        </div>

        {/* Report an Issue */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Report an Issue</h2>
              <p className="text-gray-600 mt-1 mb-4">
                Experiencing a bug or unexpected behavior? Let us know so we can fix it.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">When reporting an issue, please include:</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>A clear description of what you expected vs what happened</li>
                  <li>Steps to reproduce the issue</li>
                  <li>The project or page where the issue occurred</li>
                  <li>Any error messages you saw</li>
                  <li>Your browser and operating system</li>
                </ul>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">Over Quota?</h3>
                <p className="text-sm text-yellow-700">
                  If you&apos;re seeing quota-related issues, check your{' '}
                  <a href="/settings/ai-usage" className="underline">AI Usage</a> page first.
                  Consider upgrading your plan or waiting for quota reset.
                </p>
              </div>

              <a
                href="mailto:support@engineo.ai?subject=Bug Report: [Brief Description]"
                className="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md text-orange-700 hover:bg-orange-50"
              >
                Report Issue via Email
              </a>
            </div>
          </div>
        </div>

        {/* [GTM-ONBOARD-1] Get Your First DEO Win (Coming Soon) */}
        <div className="bg-white shadow rounded-lg p-6 border-2 border-gray-200 opacity-75">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900">Get Your First DEO Win</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  Coming Soon
                </span>
              </div>
              <p className="text-gray-600 mt-1 mb-4">
                New to EngineO? Soon you&apos;ll be able to complete your first DEO fix in 5-10 minutes with our guided
                onboarding. We&apos;ll help you identify your highest-impact opportunity and walk
                you through fixing it step by step.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">How it will work:</h3>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Connect your Shopify store (if not already connected)</li>
                  <li>We&apos;ll identify your highest-impact DEO opportunity</li>
                  <li>Preview the AI-powered fix (you control when AI runs)</li>
                  <li>Apply your first fix and celebrate your win!</li>
                </ol>
              </div>

              <a
                href="/projects"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Go to Projects
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <p className="text-sm text-gray-500 mt-2">
                The guided onboarding feature is under development. In the meantime, explore your projects to get started!
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/settings/billing"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Billing & Subscription</h3>
              <p className="text-sm text-gray-500">Manage your plan and payments</p>
            </a>
            <a
              href="/settings/security"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-500">2FA and account security</p>
            </a>
            <a
              href="/settings/preferences"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">Preferences</h3>
              <p className="text-sm text-gray-500">Notification settings</p>
            </a>
            <a
              href="/settings/ai-usage"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900">AI Usage</h3>
              <p className="text-sm text-gray-500">View your AI quota and usage</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
