import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * [SECURITY] Next.js Middleware
 *
 * 1. Auth URL Sanitization:
 *    - Prevents sensitive credentials from appearing in URLs
 *    - Redirects to sanitized URLs (preserving only safe params like `next`)
 *
 * 2. [SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1] Shopify Embedded Frame Headers:
 *    - Adds Content-Security-Policy frame-ancestors UNCONDITIONALLY for all app routes
 *    - Does NOT depend on embedded=1 or host query param (server has no sessionStorage)
 *    - This ensures deep links and hard refreshes inside Shopify iframe never blank
 *    - Allows framing from admin.shopify.com and *.myshopify.com
 */

const SENSITIVE_PARAMS = ['password', 'pass', 'pwd', 'confirmPassword'];

/**
 * [SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1] Add frame-ancestors CSP header unconditionally.
 *
 * Why unconditional?
 * - Server-side middleware cannot access sessionStorage (where host is persisted)
 * - Deep links inside Shopify iframe may not have embedded=1 or host params
 * - Hard refresh on a deep route inside the iframe loses query params
 * - Without CSP header, browser blocks the iframe → blank screen
 *
 * This header is harmless for standalone users (frame-ancestors only affects framing).
 */
function addShopifyFrameHeaders(response: NextResponse): NextResponse {
  // frame-ancestors directive allows Shopify to embed our app
  // self: allow same-origin framing
  // admin.shopify.com: Shopify Admin panel
  // *.myshopify.com: Individual Shopify stores
  const frameAncestors =
    "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;";

  // Get existing CSP or create new one
  const existingCsp = response.headers.get('Content-Security-Policy');

  if (existingCsp) {
    // If CSP exists and doesn't have frame-ancestors, append it
    if (!existingCsp.includes('frame-ancestors')) {
      response.headers.set(
        'Content-Security-Policy',
        `${existingCsp} ${frameAncestors}`
      );
    }
    // If it already has frame-ancestors, leave it alone
  } else {
    // No existing CSP, add frame-ancestors only
    response.headers.set('Content-Security-Policy', frameAncestors);
  }

  // Also remove X-Frame-Options if present (frame-ancestors supersedes it)
  response.headers.delete('X-Frame-Options');

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // [SECURITY] Auth URL Sanitization for /login and /signup
  if (pathname === '/login' || pathname === '/signup') {
    // Check if any sensitive params are present
    const hasSensitiveParams = SENSITIVE_PARAMS.some((param) =>
      searchParams.has(param)
    );

    if (hasSensitiveParams) {
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
      } else {
        // For signup, clear all params (no sensitive data should persist)
        url.search = '';
        url.searchParams.set('sanitized', '1');
      }

      // [SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1] CSP header on redirect responses too
      const redirectResponse = NextResponse.redirect(url, 307);
      return addShopifyFrameHeaders(redirectResponse);
    }
  }

  // Create response (continue to next handler)
  let response = NextResponse.next();

  // [SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1] Add frame headers UNCONDITIONALLY for all app routes
  // This ensures embedded deep links and hard refreshes never blank due to missing CSP
  response = addShopifyFrameHeaders(response);

  return response;
}

// [SHOPIFY-EMBEDDED-SHELL-1-FIXUP-1] Matcher for unconditional CSP injection
// All app routes get frame-ancestors CSP; excludes static assets and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (branding, images, etc.)
     * - api routes (handled separately)
     *
     * All matched routes receive frame-ancestors CSP unconditionally to support
     * Shopify embedded deep links and hard refreshes without blank screens.
     */
    '/((?!_next/static|_next/image|favicon.ico|branding|images|api).*)',
  ],
};
