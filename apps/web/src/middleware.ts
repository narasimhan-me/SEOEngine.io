import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * [SECURITY] Next.js Middleware for Auth URL Sanitization
 *
 * Prevents sensitive credentials from appearing in URLs by:
 * 1. Detecting password-related query parameters on auth pages
 * 2. Redirecting to sanitized URLs (preserving only safe params like `next`)
 *
 * This prevents credentials from being:
 * - Logged in server access logs
 * - Stored in browser history
 * - Leaked via referrer headers
 * - Visible in analytics/monitoring tools
 */

const SENSITIVE_PARAMS = ['password', 'pass', 'pwd', 'confirmPassword'];

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Check if any sensitive params are present
  const hasSensitiveParams = SENSITIVE_PARAMS.some((param) =>
    searchParams.has(param)
  );

  if (!hasSensitiveParams) {
    return NextResponse.next();
  }

  // Build sanitized URL
  const url = request.nextUrl.clone();

  if (pathname === '/login') {
    // For login, preserve only `next` param if present
    const nextParam = searchParams.get('next');
    url.search = '';
    if (nextParam) {
      url.searchParams.set('next', nextParam);
    }
    // Add a flag so client-side can show security message
    url.searchParams.set('sanitized', '1');
  } else if (pathname === '/signup') {
    // For signup, clear all params (no sensitive data should persist)
    url.search = '';
    url.searchParams.set('sanitized', '1');
  }

  // Use 307 to preserve HTTP method (though auth pages are typically GET)
  return NextResponse.redirect(url, 307);
}

// Only apply middleware to auth pages
export const config = {
  matcher: ['/login', '/signup'],
};
