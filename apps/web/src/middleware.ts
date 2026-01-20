import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * [SECURITY] Next.js Middleware
 *
 * 1. Auth URL Sanitization:
 *    - Prevents sensitive credentials from appearing in URLs
 *    - Redirects to sanitized URLs (preserving only safe params like `next`)
 *
 * 2. [SHOPIFY-EMBEDDED-SHELL-1] Shopify Embedded Frame Headers:
 *    - Adds Content-Security-Policy frame-ancestors for embedded context
 *    - Only applied when embedded=1 or host query param is present
 *    - Allows framing from admin.shopify.com and *.myshopify.com
 */

const SENSITIVE_PARAMS = ['password', 'pass', 'pwd', 'confirmPassword'];

/**
 * Check if request is from Shopify embedded context.
 * Embedded context is indicated by embedded=1 or host query param.
 */
function isShopifyEmbedded(searchParams: URLSearchParams): boolean {
  return searchParams.get('embedded') === '1' || searchParams.has('host');
}

/**
 * Add frame-ancestors CSP header for Shopify embedded context.
 * Allows the app to be framed by Shopify Admin and myshopify.com stores.
 */
function addShopifyFrameHeaders(response: NextResponse): NextResponse {
  // frame-ancestors directive allows Shopify to embed our app
  // self: allow same-origin framing
  // admin.shopify.com: Shopify Admin panel
  // *.myshopify.com: Individual Shopify stores
  const frameAncestors = "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;";

  // Get existing CSP or create new one
  const existingCsp = response.headers.get('Content-Security-Policy');

  if (existingCsp) {
    // If CSP exists and doesn't have frame-ancestors, append it
    if (!existingCsp.includes('frame-ancestors')) {
      response.headers.set('Content-Security-Policy', `${existingCsp} ${frameAncestors}`);
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

  // [SHOPIFY-EMBEDDED-SHELL-1] Check for embedded context first
  const isEmbedded = isShopifyEmbedded(searchParams);

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

      // Use 307 to preserve HTTP method (though auth pages are typically GET)
      return NextResponse.redirect(url, 307);
    }
  }

  // Create response (continue to next handler)
  let response = NextResponse.next();

  // [SHOPIFY-EMBEDDED-SHELL-1] Add frame headers for embedded context
  if (isEmbedded) {
    response = addShopifyFrameHeaders(response);
  }

  return response;
}

// Expanded matcher to cover app routes for frame header injection
// Excludes static assets and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (branding, images, etc.)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|branding|images|api).*)',
  ],
};
