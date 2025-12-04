'use client';

import { useState, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, ApiError } from '@/lib/api';
import { setToken } from '@/lib/auth';

// Lazy load Captcha to avoid loading Turnstile script until needed
const Captcha = lazy(() =>
  import('@/components/common/Captcha').then((m) => ({ default: m.Captcha }))
);

// Session storage key for 2FA temp token
const TEMP_2FA_TOKEN_KEY = 'engineo_temp_2fa_token';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            EngineO.ai
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-700">
            Sign in to your EngineO.ai account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
