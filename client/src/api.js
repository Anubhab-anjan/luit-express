const base = import.meta.env.VITE_API_URL || '/api';

export const getUser = () => JSON.parse(localStorage.getItem('luit_user') || 'null');
export const saveSession = ({ user, token }) => {
  localStorage.setItem('luit_user', JSON.stringify(user));
  localStorage.setItem('luit_token', token);
};
export const clearSession = () => {
  localStorage.removeItem('luit_user');
  localStorage.removeItem('luit_token');
};

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('luit_token');
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const duration = (a, b) => {
  const m = Math.round((new Date(b) - new Date(a)) / 60000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};
