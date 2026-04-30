import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Plus, Eye, Pencil, Trash2, Loader2, FileText, Search } from 'lucide-react';
import { stripHtml } from '../../lib/html';

export default function ProcessList() {
  const [processes, setProcesses] = useState([]);
  const [executionsToday, setExecutionsToday] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try {
      const procs = await processAPI.listProcesses();
      setProcesses(procs);
      const today = new Date().toISOString().slice(0, 10);
      const execs = await processAPI.listExecutions({ fecha: today });
      const counts = {};
      execs.forEach(e => { counts[e.proceso_id] = (counts[e.proceso_id] || 0) + 1; });
      setExecutionsToday(counts);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar el proceso "${name}"? Esta acción no se puede deshacer.`)) return;
    await processAPI.deleteProcess(id);
    load();
  };

  const filtered = processes.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.codigo || '').toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Procesos</h1>
          <p className="text-slate-500 mt-1">Define y administra los procesos de la organización</p>
        </div>
        <button onClick={() => navigate('/process/admin/processes/new')} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 font-medium flex items-center gap-2">
          <Plus className="w-4 h-4"/>Nuevo Proceso
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"/>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Código</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Nombre</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Área</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Tipo</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Pasos</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Hoy</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Estado</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400"><FileText className="w-10 h-10 mx-auto mb-2 text-slate-300"/>Sin procesos</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-mono text-xs text-slate-500">{p.codigo}</td>
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-400 line-clamp-1 max-w-md">{stripHtml(p.descripcion)}</p>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">{p.area_nombre || '—'}</td>
                <td className="px-6 py-3">
                  {p.tipo_nombre ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: p.tipo_color_fondo, color: p.tipo_color_texto }}>{p.tipo_nombre}</span>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="px-6 py-3 text-center text-sm font-medium text-slate-700">{p.total_pasos}</td>
                <td className="px-6 py-3 text-center text-sm font-medium text-slate-700">{executionsToday[p.id] || 0}</td>
                <td className="px-6 py-3 text-center">
                  {p.activo ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Activo</span> : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactivo</span>}
                </td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => navigate(`/process/admin/processes/${p.id}`)} title="Ver" className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Eye className="w-4 h-4"/></button>
                    <button onClick={() => navigate(`/process/admin/processes/${p.id}/edit`)} title="Editar" className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Pencil className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar" className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
