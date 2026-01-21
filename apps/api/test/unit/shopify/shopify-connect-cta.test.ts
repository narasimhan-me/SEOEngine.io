/**
 * Unit tests for Shopify connect CTA helper functions
 * Phase SHOP-UX-CTA-1 – Connect Shopify CTA Fix
 */

// Helper function extracted for testing
function getConnectStoreCtaLabel(storeDomain?: string): string {
  if (storeDomain) {
    return `Connect ${storeDomain}`;
  }
  return 'Connect Shopify';
}

describe('getConnectStoreCtaLabel', () => {
  it('returns "Connect Shopify" when no storeDomain is provided', () => {
    expect(getConnectStoreCtaLabel()).toBe('Connect Shopify');
    expect(getConnectStoreCtaLabel(undefined)).toBe('Connect Shopify');
  });

  it('returns "Connect Shopify" when storeDomain is empty string', () => {
    // Empty string is falsy, so it should fall back to generic label
    expect(getConnectStoreCtaLabel('')).toBe('Connect Shopify');
  });

  it('returns personalized label when storeDomain is provided', () => {
    expect(getConnectStoreCtaLabel('my-store.myshopify.com')).toBe(
      'Connect my-store.myshopify.com'
    );
  });

  it('returns personalized label for short domain', () => {
    expect(getConnectStoreCtaLabel('test')).toBe('Connect test');
  });

  it('handles domain with special characters', () => {
    expect(getConnectStoreCtaLabel('my-store-123.myshopify.com')).toBe(
      'Connect my-store-123.myshopify.com'
    );
  });
});

describe('Shopify OAuth URL construction', () => {
  const API_URL = 'http://localhost:3001';
  const projectId = 'test-project-123';
  const token = 'test-jwt-token';

  function buildShopifyInstallUrl(
    apiUrl: string,
    shop: string,
    projId: string,
    authToken: string
  ): string {
    return `${apiUrl}/shopify/install?shop=${shop}&projectId=${projId}&token=${authToken}`;
  }

  it('constructs correct OAuth URL with all parameters', () => {
    const shopDomain = 'my-store.myshopify.com';
    const url = buildShopifyInstallUrl(API_URL, shopDomain, projectId, token);

    expect(url).toBe(
      'http://localhost:3001/shopify/install?shop=my-store.myshopify.com&projectId=test-project-123&token=test-jwt-token'
    );
  });

  it('includes shop domain without modification', () => {
    const shopDomain = 'test-shop.myshopify.com';
    const url = buildShopifyInstallUrl(API_URL, shopDomain, projectId, token);

    expect(url).toContain(`shop=${shopDomain}`);
  });

  it('handles different API URLs', () => {
    const prodUrl = 'https://api.engineo.ai';
    const shopDomain = 'my-store.myshopify.com';
    const url = buildShopifyInstallUrl(prodUrl, shopDomain, projectId, token);

    expect(url).toStartWith('https://api.engineo.ai/shopify/install?');
  });
});

describe('selectShopifyDomain canonical logic', () => {
  function selectShopifyDomain(
    statusShopDomain?: string,
    projectDomain?: string | null,
    promptValue?: string | null
  ): string | null {
    let domain = (statusShopDomain ?? '') || (projectDomain ?? '');
    if (!domain) {
      domain = (promptValue ?? '').trim();
    }
    if (!domain) {
      return null;
    }
    let formatted = domain.trim();
    formatted = formatted.replace(/^https?:\/\//i, '').split('/')[0];
    if (!formatted.includes('.myshopify.com')) {
      formatted = `${formatted}.myshopify.com`;
    }
    return formatted;
  }

  it('prefers Shopify integration shopDomain when present', () => {
    const domain = selectShopifyDomain(
      'integration-store.myshopify.com',
      'project-store.myshopify.com',
      null
    );
    expect(domain).toBe('integration-store.myshopify.com');
  });

  it('falls back to projectDomain when shopDomain is missing', () => {
    const domain = selectShopifyDomain(
      undefined,
      'project-store.myshopify.com',
      null
    );
    expect(domain).toBe('project-store.myshopify.com');
  });

  it('normalizes projectDomain without myshopify suffix', () => {
    const domain = selectShopifyDomain(undefined, 'raw-project-store', null);
    expect(domain).toBe('raw-project-store.myshopify.com');
  });

  it('normalizes projectDomain with protocol and path', () => {
    const domain = selectShopifyDomain(
      undefined,
      'https://my-store.myshopify.com/products',
      null
    );
    expect(domain).toBe('my-store.myshopify.com');
  });

  it('uses prompted domain when no stored domains are available', () => {
    const domain = selectShopifyDomain(undefined, null, 'prompt-store');
    expect(domain).toBe('prompt-store.myshopify.com');
  });

  it('returns null when no domain is available from any source', () => {
    const domain = selectShopifyDomain(undefined, null, '   ');
    expect(domain).toBeNull();
  });
});

describe('Connect source button state logic', () => {
  interface ConnectButtonState {
    disabled: boolean;
    label: string;
  }

  function getConnectButtonState(
    stepId: string,
    connectingSource: boolean,
    ctaLabel: string
  ): ConnectButtonState {
    const isConnectStep = stepId === 'connect_source';
    const disabled = isConnectStep && connectingSource;
    const label = isConnectStep && connectingSource ? 'Connecting…' : ctaLabel;

    return { disabled, label };
  }

  it('shows normal state when not connecting', () => {
    const state = getConnectButtonState(
      'connect_source',
      false,
      'Connect Shopify'
    );

    expect(state.disabled).toBe(false);
    expect(state.label).toBe('Connect Shopify');
  });

  it('shows loading state when connecting', () => {
    const state = getConnectButtonState(
      'connect_source',
      true,
      'Connect Shopify'
    );

    expect(state.disabled).toBe(true);
    expect(state.label).toBe('Connecting…');
  });

  it('does not affect non-connect steps', () => {
    const state = getConnectButtonState('run_first_crawl', true, 'Run crawl');

    expect(state.disabled).toBe(false);
    expect(state.label).toBe('Run crawl');
  });

  it('preserves personalized label when not connecting', () => {
    const state = getConnectButtonState(
      'connect_source',
      false,
      'Connect my-store.myshopify.com'
    );

    expect(state.disabled).toBe(false);
    expect(state.label).toBe('Connect my-store.myshopify.com');
  });

  it('overrides personalized label when connecting', () => {
    const state = getConnectButtonState(
      'connect_source',
      true,
      'Connect my-store.myshopify.com'
    );

    expect(state.disabled).toBe(true);
    expect(state.label).toBe('Connecting…');
  });
});

// Custom Jest matcher for string prefix
expect.extend({
  toStartWith(received: string, prefix: string) {
    const pass = received.startsWith(prefix);
    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to start with ${prefix}`,
      pass,
    };
  },
});

// Type augmentation for Jest matchers
export {};
declare global {
  namespace jest {
    interface Matchers<R> {
      toStartWith(prefix: string): R;
    }
  }
}
