import { auth } from './firebase';

export function getApiBaseUrl() {
  const raw = (import.meta?.env?.VITE_API_BASE_URL || '').trim()
  if (!raw) return ''
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

export function apiUrl(path) {
  const p = String(path || '').trim()
  if (!p) return p
  if (!p.startsWith('/')) return `${getApiBaseUrl()}/${p}`
  return `${getApiBaseUrl()}${p}`
}

export async function apiFetch(path, options = {}) {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
  }
  return fetch(apiUrl(path), options);
}

export async function fetchGoogleScript(functionName, payload) {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1-V4rL8tniYFG_aG22RKe0y8uHb1n4r-El5V4F_N8VkhoCsObikNGBnX_Yhrv9mDsXA/exec';
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ function: functionName, payload }),
  });
  return response.json();
}

