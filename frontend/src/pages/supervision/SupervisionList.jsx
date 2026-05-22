import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Plus, Eye, Trash2, ShieldCheck, ShieldX, Search, CalendarDays,
} from 'lucide-react';
import { supervisionAPI } from '../../services/supervisionApi';

const ESTADO_STYLE = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  completada: 'bg-slate-900 text-white border-slate-900',
};

export default function SupervisionList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await supervisionAPI.list()); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(s =>
    (s.codigo + ' ' + s.proceso_codigo + ' ' + s.proceso_nombre + ' ' + (s.evaluado_nombre || ''))
      .toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (s) => {
    if (!window.confirm(`¿Eliminar ${s.codigo}?`)) return;
    try { await supervisionAPI.remove(s.id); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div className="animate-fade-in" data-testid="supervision-list-page">
      <header className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Supervisión
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Revisa punto por punto las ejecuciones realizadas por los empleados.
          </p>
        </div>
        <button
          onClick={() => navigate('/supervision/new')}
          data-testid="supervision-new-btn"
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4"/>Nueva supervisión
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
            {items.length === 0 ? 'Aún no hay supervisiones. Crea una desde "Nueva supervisión".' : 'Sin coincidencias.'}
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
                  onClick={() => navigate(`/supervision/${s.id}`)}
                  data-testid={`supervision-row-${s.id}`}
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
                      <button onClick={e => { e.stopPropagation(); navigate(`/supervision/${s.id}`); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Ver">
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
