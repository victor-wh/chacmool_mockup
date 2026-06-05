const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handle = async (response) => {
  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const data = await response.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      detail = response.statusText;
    }
    throw new Error(detail);
  }
  if (response.status === 204) return null;
  return response.json();
};

const api = (path, options = {}) =>
  fetch(`${API_URL}${path}`, { ...options, headers: { ...getAuthHeaders(), ...(options.headers || {}) } }).then(handle);

export const processAPI = {
  // Areas
  listAreas: () => api('/api/process/areas'),
  createArea: (data) => api('/api/process/areas', { method: 'POST', body: JSON.stringify(data) }),
  updateArea: (id, data) => api(`/api/process/areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArea: (id) => api(`/api/process/areas/${id}`, { method: 'DELETE' }),

  // Staff
  getMyStaff: () => api('/api/process/staff/me'),
  listStaff: () => api('/api/process/staff'),
  updateStaff: (id, data) => api(`/api/process/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Process Types
  listTypes: () => api('/api/process/types'),
  createType: (data) => api('/api/process/types', { method: 'POST', body: JSON.stringify(data) }),
  updateType: (id, data) => api(`/api/process/types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteType: (id) => api(`/api/process/types/${id}`, { method: 'DELETE' }),

  // Consequences
  listConsequences: () => api('/api/process/consequences'),
  createConsequence: (data) => api('/api/process/consequences', { method: 'POST', body: JSON.stringify(data) }),
  updateConsequence: (id, data) => api(`/api/process/consequences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConsequence: (id) => api(`/api/process/consequences/${id}`, { method: 'DELETE' }),

  // Processes
  listProcesses: ({ areaId, activo, mine } = {}) => {
    const params = new URLSearchParams();
    if (areaId) params.set('area_id', areaId);
    if (activo !== undefined) params.set('activo', activo);
    if (mine) params.set('mine', 'true');
    const q = params.toString();
    return api(`/api/process/processes${q ? `?${q}` : ''}`);
  },
  getProcess: (id) => api(`/api/process/processes/${id}`),
  createProcess: (data) => api('/api/process/processes', { method: 'POST', body: JSON.stringify(data) }),
  updateProcess: (id, data) => api(`/api/process/processes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProcess: (id) => api(`/api/process/processes/${id}`, { method: 'DELETE' }),

  // Steps
  listSteps: (processId) => api(`/api/process/processes/${processId}/steps`),
  createStep: (processId, data) => api(`/api/process/processes/${processId}/steps`, { method: 'POST', body: JSON.stringify(data) }),
  updateStep: (stepId, data) => api(`/api/process/steps/${stepId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStep: (stepId) => api(`/api/process/steps/${stepId}`, { method: 'DELETE' }),
  reorderSteps: (processId, stepIds) => api(`/api/process/processes/${processId}/steps/reorder`, { method: 'POST', body: JSON.stringify({ step_ids: stepIds }) }),

  // Executions
  listExecutions: ({ fecha, procesoId, mine } = {}) => {
    const params = new URLSearchParams();
    if (fecha) params.set('fecha', fecha);
    if (procesoId) params.set('proceso_id', procesoId);
    if (mine) params.set('mine', 'true');
    const q = params.toString();
    return api(`/api/process/executions${q ? `?${q}` : ''}`);
  },
  getExecution: (id) => api(`/api/process/executions/${id}`),
  createExecution: (procesoId) => api('/api/process/executions', { method: 'POST', body: JSON.stringify({ proceso_id: procesoId }) }),
  listStepExecutions: (executionId) => api(`/api/process/executions/${executionId}/steps`),
  updateStepExecution: (stepExecId, data) => api(`/api/process/step-executions/${stepExecId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExecution: (id) => api(`/api/process/executions/${id}`, { method: 'DELETE' }),

  // Stats
  getStats: () => api('/api/process/stats'),

  // ---------- My Assigned Steps (colaboración) ----------
  getMyAssignedSteps: () => api('/api/process/my-assigned-steps'),

  // ---------- Calendar ----------
  // scheduleType: 'ejecucion' | 'supervision' | 'auditoria' (default ejecucion)
  listSchedules: (scheduleType) => {
    const qs = scheduleType ? `?schedule_type=${scheduleType}` : '';
    return api(`/api/calendar/schedules${qs}`);
  },
  getSchedule: (procesoId, scheduleType = 'ejecucion') =>
    api(`/api/calendar/schedules/${procesoId}?schedule_type=${scheduleType}`),
  upsertSchedule: (procesoId, payload, scheduleType = 'ejecucion') =>
    api(`/api/calendar/schedules/${procesoId}?schedule_type=${scheduleType}`, {
      method: 'PUT', body: JSON.stringify(payload),
    }),
  deleteSchedule: (procesoId, scheduleType = 'ejecucion') =>
    api(`/api/calendar/schedules/${procesoId}?schedule_type=${scheduleType}`, { method: 'DELETE' }),
  listEvents: ({ from, to, procesoId, responsableId, mine, scheduleTypes } = {}) => {
    const params = new URLSearchParams({ fecha_desde: from, fecha_hasta: to });
    if (procesoId) params.set('proceso_id', procesoId);
    if (responsableId) params.set('responsable_id', responsableId);
    if (mine) params.set('mine', 'true');
    if (scheduleTypes && scheduleTypes.length) params.set('schedule_types', scheduleTypes.join(','));
    return api(`/api/calendar/events?${params.toString()}`);
  },
  listProcessesWithoutSchedule: (scheduleType = 'ejecucion') =>
    api(`/api/calendar/processes-without-schedule?schedule_type=${scheduleType}`),
  getCalendarMatrix: (year, month) =>
    api(`/api/calendar/matrix?year=${year}&month=${month}`),
};
