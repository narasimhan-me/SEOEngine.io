'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi, ApiError } from '@/lib/api';
import { setToken } from '@/lib/auth';

// Lazy load Captcha to avoid loading Turnstile script until needed
const Captcha = lazy(() =>
  import('@/components/common/Captcha').then((m) => ({ default: m.Captcha }))
);

// Session storage key for 2FA temp token
const TEMP_2FA_TOKEN_KEY = 'engineo_temp_2fa_token';

// Sensitive query params that should never appear in URLs
const SENSITIVE_PARAMS = ['password', 'pass', 'pwd', 'email'];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');

  // [SECURITY] Client-side defense-in-depth: sanitize URL if sensitive params detected
  useEffect(() => {
    const hasSensitiveParams = SENSITIVE_PARAMS.some((param) =>
      searchParams.has(param)
    );

    if (hasSensitiveParams) {
      // Build sanitized URL preserving only `next` param
      const nextParam = searchParams.get('next');
      const sanitizedUrl = nextParam ? `/login?next=${encodeURIComponent(nextParam)}&sanitized=1` : '/login?sanitized=1';
      router.replace(sanitizedUrl);
      setSecurityMessage('For security, we removed sensitive parameters from the URL. Please enter your credentials.');
      return;
    }

    // Show message if redirected from middleware sanitization
    if (searchParams.get('sanitized') === '1') {
      setSecurityMessage('For security, we removed sensitive parameters from the URL. Please enter your credentials.');
      // Clean up the sanitized flag from URL
      const nextParam = searchParams.get('next');
      const cleanUrl = nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : '/login';
      router.replace(cleanUrl);
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If CAPTCHA is showing, require it
    if (showCaptcha && !captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.login({
        email,
        password,
        captchaToken: captchaToken || undefined,
      });

      // Check if 2FA is required
      if (response.requires2FA && response.tempToken) {
        // Store temp token in sessionStorage (cleared when tab closes)
        sessionStorage.setItem(TEMP_2FA_TOKEN_KEY, response.tempToken);
        // Redirect to 2FA verification page
        router.push('/2fa');
        return;
      }

      // Normal login (no 2FA)
      setToken(response.accessToken);
      router.push('/projects');
    } catch (err: unknown) {
      // Check if CAPTCHA is now required due to failed attempts
      if (err instanceof ApiError && err.code === 'CAPTCHA_REQUIRED') {
        setShowCaptcha(true);
        setCaptchaToken(null);
      }
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please check your credentials.';
      setError(message);
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
          Sign in
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {showCaptcha && (
            <div className="flex justify-center">
              <Suspense fallback={<div className="text-sm text-gray-500">Loading CAPTCHA...</div>}>
                <Captcha
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </Suspense>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (showCaptcha && !captchaToken)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {/* Sign up link */}
        <div className="text-center mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
        <LoginForm />
      </Suspense>
    </div>
  );
}
