import { useAuthStore } from '../stores/authStore';

// In development, use relative path so Vite proxy forwards requests seamlessly (same-origin, preserving cookies)
const BASE_URL = '';

function getHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const token = useAuthStore.getState().token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function transformResponse(json: any, status: number) {
  if (Array.isArray(json)) {
    const arr = [...json] as any;
    arr.data = json;
    arr.status = status;
    return arr;
  }
  if (typeof json === 'object' && json !== null) {
    return {
      ...json,
      data: json.data !== undefined ? json.data : json,
      status,
    };
  }
  return { data: json, status };
}

export const api = {
  get: async (url: string) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      credentials: 'include',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    const json = await res.json().catch(() => ({}));
    return transformResponse(json, res.status);
  },

  post: async (url: string, data?: unknown) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    const json = await res.json().catch(() => ({}));
    return transformResponse(json, res.status);
  },

  put: async (url: string, data?: unknown) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    const json = await res.json().catch(() => ({}));
    return transformResponse(json, res.status);
  },

  delete: async (url: string) => {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    const json = await res.json().catch(() => ({}));
    return transformResponse(json, res.status);
  },
};
