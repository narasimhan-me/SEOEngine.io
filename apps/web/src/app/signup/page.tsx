'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Captcha } from '@/components/common/Captcha';

// Sensitive query params that should never appear in URLs
const SENSITIVE_PARAMS = ['password', 'pass', 'pwd', 'confirmPassword', 'email'];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');

  // [SECURITY] Client-side defense-in-depth: sanitize URL if sensitive params detected
  useEffect(() => {
    const hasSensitiveParams = SENSITIVE_PARAMS.some((param) =>
      searchParams.has(param)
    );

    if (hasSensitiveParams) {
      router.replace('/signup?sanitized=1');
      setSecurityMessage('For security, we removed sensitive parameters from the URL. Please enter your information.');
      return;
    }

    // Show message if redirected from middleware sanitization
    if (searchParams.get('sanitized') === '1') {
      setSecurityMessage('For security, we removed sensitive parameters from the URL. Please enter your information.');
      // Clean up the sanitized flag from URL
      router.replace('/signup');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Sign up with CAPTCHA token
      await authApi.signup({ email, password, name: name || undefined, captchaToken });

      // Auto login after signup (no CAPTCHA needed for immediate login after signup)
      const loginResponse = await authApi.login({ email, password });
      setToken(loginResponse.accessToken);
      router.push('/projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create account failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full">
      {/* [DEO-UX-REFRESH-1] Premium branded header */}
      <div className="text-center mb-8">
        {/* Logo/Wordmark */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <svg
            className="h-10 w-10 text-blue-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span className="text-3xl font-bold text-gray-900">EngineO.ai</span>
        </div>
        <p className="text-sm text-gray-500">
          Digital Engine Optimization for AI-Powered Discovery
        </p>
      </div>

      {/* [DEO-UX-REFRESH-1] Premium card styling */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
        {/* Accessible heading */}
        <h1 className="text-2xl font-semibold text-gray-900 text-center mb-6">
          Create your account
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {securityMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded">
              {securityMessage}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name (optional)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Captcha
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !captchaToken}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>

        {/* Sign in link */}
        <div className="text-center mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="max-w-md w-full text-center">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
          </div>
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
