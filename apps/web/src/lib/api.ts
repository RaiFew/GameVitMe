import { useAuthStore } from '../stores/authStore';

// In development, default to relative path so Vite proxy forwards requests; in production, use VITE_API_URL
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = useAuthStore.getState().token;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Resolves to the parsed response body, with its natural shape preserved: a list
 * endpoint resolves to an array, an object endpoint to that object.
 */
async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    credentials: 'include',
    headers: getHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || error.message || res.statusText || 'Request failed');
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, data?: unknown) => request<T>('POST', url, data),
  put: <T>(url: string, data?: unknown) => request<T>('PUT', url, data),
  delete: <T>(url: string) => request<T>('DELETE', url),
};
