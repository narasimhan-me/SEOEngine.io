'use client';

import { useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getToken } from '@/lib/auth';

// Session storage keys for Shopify embedded context persistence
const SHOPIFY_HOST_KEY = 'shopify_host';
const SHOPIFY_SHOP_KEY = 'shopify_shop';

// Environment variable for Shopify API key (client ID)
const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY;

/**
 * [SHOPIFY-EMBEDDED-SHELL-1] Detect whether we're in a Shopify embedded context.
 * [SHOPIFY-EMBEDDED-CONTRAST-PASS-1 REVIEW-3] Stored host only counts when in iframe.
 *
 * Embedded context is detected if:
 * - embedded=1 query param is present, OR
 * - host query param is present (Shopify always sends this for embedded apps), OR
 * - (isInIframe AND stored host exists from a prior embedded navigation)
 *
 * This prevents embedded-only styling from leaking into standalone sessions
 * due to stale sessionStorage.shopify_host values.
 */
function useEmbeddedDetection() {
  const searchParams = useSearchParams();
  const [storedHost, setStoredHost] = useState<string | null>(null);
  const [storedShop, setStoredShop] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  // Read from sessionStorage and detect iframe on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStoredHost(sessionStorage.getItem(SHOPIFY_HOST_KEY));
      setStoredShop(sessionStorage.getItem(SHOPIFY_SHOP_KEY));

      // [REVIEW-4] Guarded window.top access; if it throws, treat as cross-origin iframe
      try {
        setIsInIframe(window.self !== window.top);
      } catch {
        // If accessing window.top throws, we're definitely in a cross-origin iframe
        setIsInIframe(true);
      }

      setIsInitialized(true);
    }
  }, []);

  const hostParam = searchParams.get('host');
  const shopParam = searchParams.get('shop');
  const embeddedParam = searchParams.get('embedded');

  // Determine current host (URL param takes precedence over stored)
  const currentHost = hostParam || storedHost;
  const currentShop = shopParam || storedShop;

  // [REVIEW-3] Stored host only enables embedded mode when actually in iframe
  const isEmbedded =
    embeddedParam === '1' || !!hostParam || (isInIframe && !!storedHost);

  // Persist host/shop when present in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (hostParam) {
      sessionStorage.setItem(SHOPIFY_HOST_KEY, hostParam);
      setStoredHost(hostParam);
    }
    if (shopParam) {
      sessionStorage.setItem(SHOPIFY_SHOP_KEY, shopParam);
      setStoredShop(shopParam);
    }
  }, [hostParam, shopParam]);

  return {
    isEmbedded,
    isInitialized,
    isInIframe,
    currentHost,
    currentShop,
    hostParam,
    shopParam,
    embeddedParam,
    storedHost,
    storedShop,
  };
}

/**
 * [SHOPIFY-EMBEDDED-SHELL-1] Loading state while repairing URL or initializing.
 */
function LoadingShopifyContext() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <svg
          className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
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
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-gray-600">Loading Shopify context…</p>
      </div>
    </div>
  );
}

/**
 * [SHOPIFY-EMBEDDED-SHELL-1] Missing host/context fallback.
 * Shown when we're in embedded context but have no host.
 */
function MissingContextFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-amber-200 shadow-sm p-6 text-center">
        <svg
          className="h-12 w-12 text-amber-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Missing Shopify context
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Please reopen the app from Shopify Admin.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

/**
 * [SHOPIFY-EMBEDDED-SHELL-1] Auth required fallback.
 * Shown when user is not authenticated in embedded context.
 */
function AuthRequiredFallback({
  loginUrl: _loginUrl,
  onReconnect,
}: {
  loginUrl: string;
  onReconnect: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
        <svg
          className="h-12 w-12 text-blue-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Connecting to Shopify…
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Please sign in to continue using EngineO.ai with your Shopify store.
        </p>
        <button
          type="button"
          onClick={onReconnect}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reconnect Shopify
        </button>
        <p className="mt-3 text-xs text-gray-500">
          You will be redirected to sign in.
        </p>
      </div>
    </div>
  );
}

/**
 * [SHOPIFY-EMBEDDED-SHELL-1] Bootstrap error fallback.
 * Shown when App Bridge fails to initialize (e.g., missing API key).
 */
function BootstrapErrorFallback({ standaloneUrl }: { standaloneUrl: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-sm p-6 text-center">
        <svg
          className="h-12 w-12 text-red-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to load inside Shopify
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          There was a problem initializing the embedded app. You can continue
          using EngineO.ai in standalone mode.
        </p>
        <a
          href={standaloneUrl}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Open in EngineO.ai
        </a>
      </div>
    </div>
  );
}

/**
 * [SHOPIFY-EMBEDDED-SHELL-1] Shopify Embedded Shell wrapper component.
 *
 * This component:
 * 1. Detects Shopify embedded context (embedded=1, host param, or (in iframe AND stored host))
 * 2. Persists host/shop to sessionStorage for navigation continuity
 * 3. Repairs URLs when host is missing but stored (router.replace)
 * 4. Initializes App Bridge when in embedded context with valid host
 * 5. Shows appropriate fallbacks (never blank) in this order:
 *    - Missing context: "Please reopen from Shopify Admin" + Retry
 *    - Bootstrap error: "Unable to load" + Open in EngineO.ai link [REVIEW-2: before auth check]
 *    - Auth required: "Connecting to Shopify..." + Reconnect button
 */
export function ShopifyEmbeddedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    isEmbedded,
    isInitialized,
    currentHost,
    currentShop,
    hostParam,
    storedHost,
  } = useEmbeddedDetection();

  const [isRepairing, setIsRepairing] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!getToken();
  }, []);

  // Build standalone URL (strip Shopify params)
  // SSR guard: return pathname-only fallback during server render
  const standaloneUrl = useMemo(() => {
    if (typeof window === 'undefined') return pathname;
    const url = new URL(pathname, window.location.origin);
    // Copy non-Shopify params
    searchParams.forEach((value, key) => {
      if (
        !['host', 'shop', 'embedded', 'hmac', 'timestamp', 'locale'].includes(
          key
        )
      ) {
        url.searchParams.set(key, value);
      }
    });
    return url.pathname + (url.search || '');
  }, [pathname, searchParams]);

  // Build return URL for auth (embedded context preserved)
  // SSR guard: return pathname-only fallback during server render
  const buildReturnUrl = useCallback(() => {
    if (typeof window === 'undefined') return pathname;
    const url = new URL(pathname, window.location.origin);
    // Preserve embedded params
    if (currentHost) url.searchParams.set('host', currentHost);
    if (currentShop) url.searchParams.set('shop', currentShop);
    url.searchParams.set('embedded', '1');
    // Copy other non-Shopify-auth params
    searchParams.forEach((value, key) => {
      if (
        !['host', 'shop', 'embedded', 'hmac', 'timestamp', 'locale'].includes(
          key
        )
      ) {
        url.searchParams.set(key, value);
      }
    });
    return url.pathname + url.search;
  }, [pathname, searchParams, currentHost, currentShop]);

  // Login URL (without host to avoid frame issues, but with next for return)
  const loginUrl = useMemo(() => {
    const returnUrl = buildReturnUrl();
    return `/login?next=${encodeURIComponent(returnUrl)}`;
  }, [buildReturnUrl]);

  // Handle auth redirect (top-level navigation via App Bridge or direct)
  const handleAuthRedirect = useCallback(() => {
    // In embedded context, we need top-level redirect
    // For now, use window.top navigation (App Bridge redirect can be added later)
    if (typeof window !== 'undefined' && window.top) {
      try {
        // Try App Bridge redirect if available
        if (window.shopify?.navigate) {
          window.shopify.navigate(loginUrl);
          return;
        }
      } catch {
        // Fall through to direct navigation
      }
      // Direct top-level navigation
      window.top.location.href = window.location.origin + loginUrl;
    }
  }, [loginUrl]);

  // Handle retry (reload current URL)
  const handleRetry = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  // URL repair: if in embedded context with stored host but missing from URL
  useEffect(() => {
    if (!isInitialized || !isEmbedded) return;

    // If we have a stored host but it's not in the URL, repair the URL
    if (storedHost && !hostParam) {
      setIsRepairing(true);

      const url = new URL(window.location.href);
      url.searchParams.set('host', storedHost);
      url.searchParams.set('embedded', '1');
      if (sessionStorage.getItem(SHOPIFY_SHOP_KEY)) {
        url.searchParams.set('shop', sessionStorage.getItem(SHOPIFY_SHOP_KEY)!);
      }

      // Use router.replace to repair URL without adding history entry
      const newPath = url.pathname + url.search;
      router.replace(newPath);

      // Small delay to let the navigation complete
      setTimeout(() => setIsRepairing(false), 100);
    }
  }, [isInitialized, isEmbedded, storedHost, hostParam, router]);

  // Validate App Bridge requirements
  useEffect(() => {
    if (!isEmbedded || !currentHost) return;

    if (!SHOPIFY_API_KEY) {
      setBootstrapError(
        'Missing NEXT_PUBLIC_SHOPIFY_API_KEY environment variable'
      );
    }
  }, [isEmbedded, currentHost]);

  // [SHOPIFY-EMBEDDED-CONTRAST-PASS-1] Keep data-shopify-embedded in sync post-hydration
  // This handles SPA navigations where the layout.tsx init script won't re-run
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isEmbedded) {
      document.documentElement.dataset.shopifyEmbedded = '1';
    } else {
      delete document.documentElement.dataset.shopifyEmbedded;
    }
  }, [isEmbedded]);

  // Not initialized yet - show loading
  if (!isInitialized) {
    return <LoadingShopifyContext />;
  }

  // Not in embedded context - render children normally (standalone mode)
  if (!isEmbedded) {
    return <>{children}</>;
  }

  // In embedded context but repairing URL
  if (isRepairing) {
    return <LoadingShopifyContext />;
  }

  // In embedded context but no host available (and none stored)
  if (!currentHost) {
    return <MissingContextFallback onRetry={handleRetry} />;
  }

  // [REVIEW-2] Bootstrap error (e.g., missing API key) - check BEFORE auth
  // This ensures config errors surface even when user is logged out
  if (bootstrapError) {
    return <BootstrapErrorFallback standaloneUrl={standaloneUrl} />;
  }

  // In embedded context with host but not authenticated
  if (!isAuthenticated) {
    return (
      <AuthRequiredFallback
        loginUrl={loginUrl}
        onReconnect={handleAuthRedirect}
      />
    );
  }

  // All good - render children with App Bridge script
  // Note: App Bridge v4 uses CDN script tag approach, not React provider
  return (
    <>
      {/*
        [SHOPIFY-EMBEDDED-SHELL-1] App Bridge v4 uses CDN script injection.
        The script tag is added in layout.tsx head. Here we just render children.
        App Bridge auto-configures based on shopify-api-key meta tag and host param.
      */}
      {children}
    </>
  );
}

// Extend Window interface for App Bridge global
declare global {
  interface Window {
    shopify?: {
      navigate?: (url: string) => void;
      // Add other App Bridge methods as needed
    };
  }
}
