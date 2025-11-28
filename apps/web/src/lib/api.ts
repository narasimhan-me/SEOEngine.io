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
