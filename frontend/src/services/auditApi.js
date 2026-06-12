const API = process.env.REACT_APP_BACKEND_URL;

const api = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try { const j = await res.json(); msg = j.detail || JSON.stringify(j); } catch (e) { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
};

export const auditAPI = {
  list: () => api('/api/audit'),
  get: (id) => api(`/api/audit/${id}`),
  create: (ejecucion_id) => api('/api/audit', { method: 'POST', body: JSON.stringify({ ejecucion_id }) }),
  update: (id, payload) => api(`/api/audit/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => api(`/api/audit/${id}`, { method: 'DELETE' }),
  updateItem: (id, itemId, payload) =>
    api(`/api/audit/${id}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  eligibleExecutions: () => api('/api/audit/_helpers/eligible-executions'),
};
