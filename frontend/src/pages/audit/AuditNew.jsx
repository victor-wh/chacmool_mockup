import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, ClipboardCheck, Check, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { auditAPI } from '../../services/auditApi';

const ESTADO_STYLE = {
  completada: 'bg-emerald-100 text-emerald-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-slate-100 text-slate-700',
};

export default function AuditNew() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const procFromUrl = params.get('proceso_id') || '';

  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try { setExecutions(await auditAPI.eligibleExecutions()); } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const procName = useMemo(() => {
    if (!procFromUrl) return '';
    const found = executions.find(e => e.proceso_id === procFromUrl);
    return found?.proceso_nombre || '';
  }, [executions, procFromUrl]);

  const filtered = executions.filter(e => {
    if (procFromUrl && e.proceso_id !== procFromUrl) return false;
    return (e.codigo_ejecucion + ' ' + e.proceso_codigo + ' ' + e.proceso_nombre + ' ' + (e.staff_user_name || ''))
      .toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    if (procFromUrl && filtered.length === 1 && !selected) {
      setSelected(filtered[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procFromUrl, filtered.length]);

  const clearFilter = () => { const n = new URLSearchParams(params); n.delete('proceso_id'); setParams(n); };

  const submit = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const aud = await auditAPI.create(selected);
      navigate(`/audit/${aud.id}`);
    } catch (e) { alert(e.message); setCreating(false); }
  };

  return (
    <div className="animate-fade-in max-w-4xl" data-testid="audit-new-page">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4"/>Volver
      </button>
      <header className="mb-5">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
          Nueva auditoría
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Selecciona la ejecución que vas a auditar. El indicador junto a cada ejecución muestra si ya tiene supervisión completada.
        </p>
      </header>

      {procFromUrl && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 flex-wrap" data-testid="proc-filter-banner">
          <span className="text-xs font-semibold text-violet-900 uppercase tracking-wider">Filtrado por proceso:</span>
          <span className="text-xs bg-white border border-violet-200 rounded-full px-2 py-0.5 text-violet-900">{procName || procFromUrl}</span>
          <button onClick={clearFilter} className="ml-auto text-xs text-violet-900 hover:text-violet-700 inline-flex items-center gap-1">
            <X className="w-3 h-3"/>Quitar filtro
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por proceso o empleado..."
            className="flex-1 text-sm focus:outline-none"
          />
          <span className="text-xs text-slate-400">{filtered.length}</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-slate-400 inline-flex items-center gap-2 w-full justify-center">
            <Loader2 className="w-4 h-4 animate-spin"/>Cargando ejecuciones…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            No hay ejecuciones disponibles. Todas las anteriores ya tienen una auditoría asignada.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {filtered.map(e => {
              const active = selected === e.id;
              return (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e.id)}
                    data-testid={`exec-pick-${e.id}`}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${active ? 'bg-violet-50/60' : ''}`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${active ? 'bg-violet-700 border-violet-700' : 'border-slate-300'}`}>
                      {active && <Check className="w-3 h-3 text-white"/>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400">{e.codigo_ejecucion}</span>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${ESTADO_STYLE[e.estado] || ''}`}>
                          {e.estado === 'en_progreso' ? 'En progreso' : e.estado}
                        </span>
                        <span className="text-[10px] text-slate-400">{e.pasos_completados}/{e.total_pasos} pasos</span>
                        {e.supervision_realizada ? (
                          <span className="text-[10px] font-semibold inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5"/>Supervisión {e.supervision_codigo}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold inline-flex items-center gap-0.5 text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                            <AlertTriangle className="w-2.5 h-2.5"/>Sin supervisión
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">
                        <span className="font-mono text-xs text-slate-500 mr-1">{e.proceso_codigo}</span>
                        {e.proceso_nombre}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Empleado: <strong>{e.staff_user_name || '—'}</strong> · Fecha {e.fecha || '—'}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-600 hover:bg-slate-100 rounded-lg px-4 py-2">
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!selected || creating}
          data-testid="audit-create-btn"
          className="bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium inline-flex items-center gap-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin"/> : <ClipboardCheck className="w-4 h-4"/>}
          Iniciar auditoría
        </button>
      </div>
    </div>
  );
}
