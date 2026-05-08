const API_BASE = process.env.REACT_APP_BACKEND_URL;

const headers = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const handle = async (res) => {
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text)?.detail || msg; } catch (_) { /* ignore */ }
    throw new Error(typeof msg === 'string' ? msg : 'Error');
  }
  return res.status === 204 ? null : res.json();
};

const api = (path, init = {}) => fetch(`${API_BASE}${path}`, { headers: headers(), ...init }).then(handle);

export const auditAPI = {
  // CRUD audits
  list: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null && v !== '')).toString();
    return api(`/api/audits${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api(`/api/audits/${id}`),
  create: (payload) => api('/api/audits', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => api(`/api/audits/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => api(`/api/audits/${id}`, { method: 'DELETE' }),

  // Items
  listItems: (audit_id) => api(`/api/audits/${audit_id}/items`),
  createItem: (audit_id, payload) => api(`/api/audits/${audit_id}/items`, { method: 'POST', body: JSON.stringify(payload) }),
  createItemsFromSteps: (audit_id, paso_ids) =>
    api(`/api/audits/${audit_id}/items/from-steps`, { method: 'POST', body: JSON.stringify({ paso_ids }) }),
  updateItem: (audit_id, item_id, payload) =>
    api(`/api/audits/${audit_id}/items/${item_id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteItem: (audit_id, item_id) => api(`/api/audits/${audit_id}/items/${item_id}`, { method: 'DELETE' }),

  // Helpers
  executionsByProcess: (proceso_id) => api(`/api/audits/_helpers/executions-by-process/${proceso_id}`),
};
