'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { twoFactorAuthApi } from '@/lib/api';
import { setToken } from '@/lib/auth';

// Session storage key for 2FA temp token (must match login page)
const TEMP_2FA_TOKEN_KEY = 'engineo_temp_2fa_token';

// [SHOPIFY-EMBEDDED-SHELL-1] Session storage key for post-auth redirect (must match login page)
const AUTH_NEXT_URL_KEY = 'engineo_auth_next_url';

/**
 * [SHOPIFY-EMBEDDED-SHELL-1] Validate that a next URL is safe to redirect to.
 * Must be a relative path starting with / to prevent open redirect attacks.
 */
function isSafeNextUrl(url: string | null): url is string {
  if (!url) return false;
  // Must be a relative path starting with /
  // Reject protocol-relative URLs (//evil.com) and absolute URLs (https://evil.com)
  return url.startsWith('/') && !url.startsWith('//');
}

export default function TwoFactorPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  useEffect(() => {
    // Get temp token from sessionStorage
    const token = sessionStorage.getItem(TEMP_2FA_TOKEN_KEY);

    if (!token) {
      // No temp token - redirect back to login
      router.push('/login');
      return;
    }

    setTempToken(token);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tempToken) {
      setError('Session expired. Please sign in again.');
      router.push('/login');
      return;
    }

    setLoading(true);

    try {
      const response = await twoFactorAuthApi.verify(tempToken, code);

      // Clear temp token from sessionStorage
      sessionStorage.removeItem(TEMP_2FA_TOKEN_KEY);

      // [SHOPIFY-EMBEDDED-SHELL-1] Get and clear stored next URL
      const storedNextUrl = sessionStorage.getItem(AUTH_NEXT_URL_KEY);
      sessionStorage.removeItem(AUTH_NEXT_URL_KEY);
      const safeNextUrl = isSafeNextUrl(storedNextUrl) ? storedNextUrl : null;

      // Store the final access token
      setToken(response.accessToken);

      // [SHOPIFY-EMBEDDED-SHELL-1] Redirect to stored next if present and safe, else /projects
      router.push(safeNextUrl || '/projects');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid or expired code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    // Clear temp token and stored next URL, then go back to login
    sessionStorage.removeItem(TEMP_2FA_TOKEN_KEY);
    // [SHOPIFY-EMBEDDED-SHELL-1] Clear stored next URL on back to login
    sessionStorage.removeItem(AUTH_NEXT_URL_KEY);
    router.push('/login');
  };

  // Don't render until we've checked for temp token
  if (tempToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">
            EngineO.ai
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-700">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="code" className="sr-only">
              Verification code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="block w-full px-4 py-4 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-3xl tracking-[0.5em] font-mono"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              &larr; Back to login
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Open your authenticator app (Google Authenticator, 1Password, Authy,
            etc.) and enter the 6-digit code for EngineO.ai
          </p>
        </div>
      </div>
    </div>
  );
}
