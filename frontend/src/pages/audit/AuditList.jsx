import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Plus, Eye, Trash2, ShieldCheck, ShieldX, Search, CalendarDays,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { auditAPI } from '../../services/auditApi';

const ESTADO_STYLE = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  completada: 'bg-violet-900 text-white border-violet-900',
};

export default function AuditList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const refresh = async () => {
    setLoading(true);
    try { setItems(await auditAPI.list()); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await auditAPI.list();
        if (alive) setItems(r);
      } catch (e) { console.error(e); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const filtered = items.filter(s =>
    (s.codigo + ' ' + s.proceso_codigo + ' ' + s.proceso_nombre + ' ' + (s.evaluado_nombre || ''))
      .toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (s) => {
    if (!window.confirm(`¿Eliminar ${s.codigo}?`)) return;
    try { await auditAPI.remove(s.id); refresh(); } catch (e) { alert(e.message); }
  };

  return (
    <div className="animate-fade-in" data-testid="audit-list-page">
      <header className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Auditoría
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Revisa las ejecuciones y verifica que la supervisión correspondiente se haya realizado.
          </p>
        </div>
        <button
          onClick={() => navigate('/audit/new')}
          data-testid="audit-new-btn"
          className="bg-violet-700 hover:bg-violet-800 text-white rounded-xl px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4"/>Nueva auditoría
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código, proceso, empleado..."
            className="flex-1 text-sm focus:outline-none"
          />
          <span className="text-xs text-slate-400">{filtered.length} de {items.length}</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 inline-flex items-center gap-2 w-full justify-center">
            <Loader2 className="w-4 h-4 animate-spin"/>Cargando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            {items.length === 0 ? 'Aún no hay auditorías. Crea una desde "Nueva auditoría".' : 'Sin coincidencias.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Código</th>
                <th className="px-4 py-2 text-left">Proceso</th>
                <th className="px-4 py-2 text-left">Ejecución</th>
                <th className="px-4 py-2 text-left">Empleado</th>
                <th className="px-4 py-2 text-left">Auditor</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-center">Supervisión</th>
                <th className="px-4 py-2 text-center">Resultado</th>
                <th className="px-4 py-2 text-center">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr
                  key={s.id}
                  className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer"
                  onClick={() => navigate(`/audit/${s.id}`)}
                  data-testid={`audit-row-${s.id}`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{s.codigo}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-[10px] font-mono text-slate-400">{s.proceso_codigo}</p>
                    <p className="font-medium text-slate-800 text-sm">{s.proceso_nombre}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{s.ejecucion_codigo}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.evaluado_nombre || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.auditor_nombre}</td>
                  <td className="px-4 py-2.5 text-slate-500 inline-flex items-center gap-1"><CalendarDays className="w-3 h-3"/>{s.fecha}</td>
                  <td className="px-4 py-2.5 text-center">
                    {s.supervision_realizada ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700" title={s.supervision_codigo || ''}>
                        <CheckCircle2 className="w-3.5 h-3.5"/>{s.supervision_codigo || 'Sí'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        <AlertTriangle className="w-3.5 h-3.5"/>No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {s.estado === 'completada' ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${s.aprobada ? 'text-emerald-700' : 'text-red-600'}`}>
                        {s.aprobada ? <ShieldCheck className="w-3.5 h-3.5"/> : <ShieldX className="w-3.5 h-3.5"/>}
                        {s.porcentaje}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">{s.items_evaluados}/{s.items_total}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ESTADO_STYLE[s.estado] || ''}`}>
                      {s.estado === 'draft' ? 'En curso' : 'Completada'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={e => { e.stopPropagation(); navigate(`/audit/${s.id}`); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Ver">
                        <Eye className="w-4 h-4"/>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(s); }} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Eliminar">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
