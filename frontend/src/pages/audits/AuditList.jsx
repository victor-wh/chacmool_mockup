import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditAPI } from '../../services/auditApi';
import { Plus, Loader2, ClipboardCheck, Eye, Trash2, Calendar, Search } from 'lucide-react';

const STATE = {
  borrador:    { label: 'Borrador', cls: 'bg-slate-100 text-slate-700' },
  en_progreso: { label: 'En progreso', cls: 'bg-blue-50 text-blue-700' },
  completada:  { label: 'Completada', cls: 'bg-green-50 text-green-700' },
};

export default function AuditList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await auditAPI.list();
      setItems(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (a) => {
    if (!window.confirm(`¿Eliminar la auditoría "${a.codigo}"?`)) return;
    await auditAPI.remove(a.id);
    load();
  };

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(a =>
      (a.codigo || '').toLowerCase().includes(q) ||
      (a.proceso_nombre || '').toLowerCase().includes(q) ||
      (a.evaluado_nombre || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando auditorías...</div>;
  }

  return (
    <div className="animate-fade-in" data-testid="audit-list-page">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Auditorías</h1>
          <p className="text-slate-500 mt-1">Evaluación de la ejecución de los procesos</p>
        </div>
        <button
          onClick={() => navigate('/audits/new')}
          data-testid="new-audit-btn"
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4"/>Nueva auditoría
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por código, proceso o evaluado..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Código</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Proceso</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Tipo</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Modo</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Evaluado</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Puntaje</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Estado</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Fecha</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-300"/>Aún no hay auditorías
              </td></tr>
            )}
            {filtered.map(a => {
              const st = STATE[a.estado] || STATE.borrador;
              return (
                <tr key={a.id} className="hover:bg-slate-50" data-testid={`audit-row-${a.id}`}>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{a.codigo}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900 line-clamp-1">{a.proceso_nombre}</p>
                    <p className="text-[11px] font-mono text-slate-400">{a.proceso_codigo}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${a.tipo === 'presencial' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {a.tipo === 'presencial' ? 'Presencial' : 'Histórica'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-600 capitalize">{a.modo === 'pasos' ? 'Pasos del proceso' : 'Puntos custom'}</td>
                  <td className="px-6 py-3 text-sm text-slate-700">{a.evaluado_nombre || '—'}</td>
                  <td className="px-6 py-3 text-center">
                    {a.estado === 'completada' ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{a.puntos_obtenidos}/{a.total_puntos}</p>
                        <p className="text-[10px] text-slate-500">{a.porcentaje}%</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">{a.items_evaluados}/{a.total_items}</p>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3"/>{a.fecha}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => navigate(`/audits/${a.id}`)} title="Ver / Continuar" data-testid={`open-audit-${a.id}`} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Eye className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(a)} title="Eliminar" className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
