import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Plus, Eye, Pencil, Trash2, Loader2, FileText, Search, Info, Layers } from 'lucide-react';
import { stripHtml } from '../../lib/html';

const ALL_TAB = '__all__';
const NO_AREA = '__no_area__';

export default function ProcessList() {
  const [processes, setProcesses] = useState([]);
  const [executionsToday, setExecutionsToday] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeArea, setActiveArea] = useState(ALL_TAB);
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

  // Construye la lista de tabs a partir de las áreas presentes en los procesos
  const areaTabs = useMemo(() => {
    const map = new Map();
    processes.forEach(p => {
      const key = p.area_id || NO_AREA;
      const name = p.area_nombre || 'Sin área';
      const entry = map.get(key) || { key, name, count: 0 };
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [processes]);

  const filtered = processes.filter(p => {
    if (activeArea !== ALL_TAB) {
      const key = p.area_id || NO_AREA;
      if (key !== activeArea) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Procesos</h1>
          <p className="text-slate-500 mt-1">Define y administra los procesos de la organización</p>
        </div>
        <button
          onClick={() => navigate('/process/admin/processes/new')}
          data-testid="new-process-btn"
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4"/>Nuevo Proceso
        </button>
      </div>

      {/* Área tabs */}
      <div className="border-b border-slate-200 mb-4 overflow-x-auto" data-testid="area-tabs">
        <div className="flex items-end gap-1 min-w-max">
          <AreaTab
            active={activeArea === ALL_TAB}
            onClick={() => setActiveArea(ALL_TAB)}
            icon={<Layers className="w-3.5 h-3.5"/>}
            label="Todas"
            count={processes.length}
            testId="area-tab-all"
          />
          {areaTabs.map(a => (
            <AreaTab
              key={a.key}
              active={activeArea === a.key}
              onClick={() => setActiveArea(a.key)}
              label={a.name}
              count={a.count}
              testId={`area-tab-${a.key}`}
            />
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Lista */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Código</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Nombre</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Tipo</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Pasos</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Hoy</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Estado</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300"/>Sin procesos en esta área
              </td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50" data-testid={`process-row-${p.id}`}>
                <td className="px-6 py-3 font-mono text-xs text-slate-500">{p.codigo}</td>
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{p.nombre}</p>
                  <p className="text-xs text-slate-400 line-clamp-1 max-w-md">{stripHtml(p.descripcion)}</p>
                </td>
                <td className="px-6 py-3">
                  {p.tipo_nombre ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: p.tipo_color_fondo, color: p.tipo_color_texto }}>{p.tipo_nombre}</span>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
                <td className="px-6 py-3 text-center text-sm font-medium text-slate-700">{p.total_pasos}</td>
                <td className="px-6 py-3 text-center text-sm font-medium text-slate-700">{executionsToday[p.id] || 0}</td>
                <td className="px-6 py-3 text-center">
                  {p.activo ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Activo</span> : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactivo</span>}
                </td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => navigate(`/process/admin/processes/${p.id}/info`)} title="Resumen" data-testid={`process-info-btn-${p.id}`} className="p-1.5 hover:bg-indigo-50 rounded text-indigo-600"><Info className="w-4 h-4"/></button>
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

const AreaTab = ({ active, onClick, icon, label, count, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`px-4 py-2.5 -mb-px border-b-2 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap ${
      active
        ? 'border-slate-900 text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
    }`}
  >
    {icon}
    {label}
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
      {count}
    </span>
  </button>
);
