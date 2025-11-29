import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const authApi = {
  signup: (data: { email: string; password: string; name?: string }) =>
    fetchWithAuth('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchWithAuth('/auth/login', {
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
