import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Custom API error with optional error code for special handling
 */
export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * Build an ApiError from an API response
 */
function buildApiError(response: Response, body: unknown): ApiError {
  let message: string;
  let code: string | undefined;

  // Try to extract message and code from JSON body
  if (body && typeof body === 'object') {
    const json = body as Record<string, unknown>;
    if (typeof json.message === 'string' && json.message) {
      message = json.message;
    } else if (typeof json.error === 'string' && json.error) {
      message = json.error;
    } else {
      message = getStatusMessage(response.status, response.statusText);
    }
    if (typeof json.code === 'string') {
      code = json.code;
    }
  } else {
    message = getStatusMessage(response.status, response.statusText);
  }

  return new ApiError(message, code);
}

/**
 * Get user-friendly message based on HTTP status
 */
function getStatusMessage(status: number, statusText: string): string {
  if (status === 401 || status === 403) {
    return 'Unauthorized. Please log in again.';
  }
  if (status === 404) {
    return 'Not found. Please check the URL or try again.';
  }
  if (status >= 500) {
    return 'Something went wrong on our side. Please try again.';
  }
  return statusText || 'Request failed. Please try again.';
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw buildApiError(response, body);
  }

  return response.json();
}

/**
 * Fetch without authentication - used for endpoints that don't require JWT
 * (e.g., /auth/2fa/verify which uses tempToken instead)
 */
async function fetchWithoutAuth(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw buildApiError(response, body);
  }

  return response.json();
}

export const authApi = {
  signup: (data: { email: string; password: string; name?: string; captchaToken: string }) =>
    fetchWithoutAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string; captchaToken?: string }) =>
    fetchWithoutAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const usersApi = {
  me: () => fetchWithAuth('/users/me'),
};

export const projectsApi = {
  list: () => fetchWithAuth('/projects'),

  get: (id: string) => fetchWithAuth(`/projects/${id}`),

  overview: (id: string) => fetchWithAuth(`/projects/${id}/overview`),

  deoScore: (id: string) => fetchWithAuth(`/projects/${id}/deo-score`),

  deoSignalsDebug: (id: string) =>
    fetchWithAuth(`/projects/${id}/deo-signals/debug`),

  deoIssues: (id: string) => fetchWithAuth(`/projects/${id}/deo-issues`),

  recomputeDeoScoreSync: (id: string) =>
    fetchWithAuth(`/projects/${id}/deo-score/recompute-sync`, {
      method: 'POST',
    }),

  create: (data: { name: string; domain: string }) =>
    fetchWithAuth('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; domain?: string }) =>
    fetchWithAuth(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth(`/projects/${id}`, {
      method: 'DELETE',
    }),
};

export const integrationsApi = {
  list: (projectId: string) => fetchWithAuth(`/integrations?projectId=${projectId}`),

  create: (data: { projectId: string; type: string; config?: object }) =>
    fetchWithAuth('/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchWithAuth(`/integrations/${id}`, {
      method: 'DELETE',
    }),
};

export const seoScanApi = {
  start: (projectId: string) =>
    fetchWithAuth('/seo-scan/start', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),

  results: (projectId: string) => fetchWithAuth(`/seo-scan/results?projectId=${projectId}`),

  scanProduct: (productId: string) =>
    fetchWithAuth('/seo-scan/product', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),
};

export const aiApi = {
  suggestMetadata: (crawlResultId: string, targetKeywords?: string[]) =>
    fetchWithAuth('/ai/metadata', {
      method: 'POST',
      body: JSON.stringify({ crawlResultId, targetKeywords }),
    }),

  suggestProductMetadata: (productId: string, targetKeywords?: string[]) =>
    fetchWithAuth('/ai/product-metadata', {
      method: 'POST',
      body: JSON.stringify({ productId, targetKeywords }),
    }),
};

export const productsApi = {
  list: (projectId: string) => fetchWithAuth(`/projects/${projectId}/products`),
};

export const shopifyApi = {
  syncProducts: (projectId: string) =>
    fetchWithAuth(`/shopify/sync-products?projectId=${projectId}`, {
      method: 'POST',
    }),

  updateProductSeo: (productId: string, seoTitle: string, seoDescription: string) =>
    fetchWithAuth('/shopify/update-product-seo', {
      method: 'POST',
      body: JSON.stringify({ productId, seoTitle, seoDescription }),
    }),
};

/**
 * Two-Factor Authentication API - for managing 2FA settings (authenticated)
 */
export const twoFactorApi = {
  /** Initialize 2FA setup - returns QR code and otpauth URL */
  setupInit: () =>
    fetchWithAuth('/2fa/setup-init', {
      method: 'POST',
    }),

  /** Enable 2FA after verifying TOTP code */
  enable: (code: string) =>
    fetchWithAuth('/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /** Disable 2FA */
  disable: (code?: string) =>
    fetchWithAuth('/2fa/disable', {
      method: 'POST',
      body: JSON.stringify(code ? { code } : {}),
    }),
};

/**
 * Two-Factor Auth Login API - for 2FA verification during login (unauthenticated)
 */
export const twoFactorAuthApi = {
  /** Verify 2FA code during login - uses tempToken, not JWT */
  verify: (tempToken: string, code: string) =>
    fetchWithoutAuth('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),
};

/**
 * Billing API - for managing subscriptions
 */
export const billingApi = {
  /** Get available subscription plans */
  getPlans: () => fetchWithAuth('/billing/plans'),

  /** Get current user's subscription */
  getSubscription: () => fetchWithAuth('/billing/subscription'),

  /** Subscribe to a plan */
  subscribe: (planId: string) =>
    fetchWithAuth('/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  /** Cancel subscription */
  cancel: () =>
    fetchWithAuth('/billing/cancel', {
      method: 'POST',
    }),
};

/**
 * Admin API - for admin-only operations
 */
export const adminApi = {
  /** Get admin dashboard statistics */
  getStats: () => fetchWithAuth('/admin/stats'),

  /** Get all users with pagination */
  getUsers: (page = 1, limit = 20) =>
    fetchWithAuth(`/admin/users?page=${page}&limit=${limit}`),

  /** Get a single user by ID */
  getUser: (userId: string) => fetchWithAuth(`/admin/users/${userId}`),

  /** Update user role */
  updateUserRole: (userId: string, role: 'USER' | 'ADMIN') =>
    fetchWithAuth(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  /** Update user's subscription (admin override) */
  updateUserSubscription: (userId: string, planId: string) =>
    fetchWithAuth(`/admin/users/${userId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ planId }),
    }),
};

/**
 * Contact API - for public contact form
 */
export const contactApi = {
  /** Submit contact form (public, requires CAPTCHA) */
  submit: (data: { name: string; email: string; message: string; captchaToken: string }) =>
    fetchWithoutAuth('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
