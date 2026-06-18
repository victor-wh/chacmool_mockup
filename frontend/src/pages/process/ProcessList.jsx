import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Plus, Eye, Pencil, Trash2, Loader2, FileText, Search, ListChecks, Layers } from 'lucide-react';
import { stripHtml } from '../../lib/html';
import { softTint } from '../../lib/color';

const ALL_TAB = '__all__';
const NO_AREA = '__no_area__';

const DOW_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function describeSchedule(s) {
  if (!s) return '—';
  const hora = s.hora ? ` · ${s.hora}` : '';
  switch (s.tipo) {
    case 'no_repite': return `Único: ${s.fecha_unica || '—'}${hora}`;
    case 'diario':    return `Diario${hora}`;
    case 'laborales': return `Lun-Vie${hora}`;
    case 'semanal': {
      const v = s.dia_semana;
      if (v === null || v === undefined) return `Semanal${hora}`;
      return `${DOW_FULL[v] || '—'}${hora}`;
    }
    case 'mensual': return `Día ${s.dia_mes} de cada mes${hora}`;
    case 'anual':   return `${s.dia_mes} ${MESES[(s.mes || 1) - 1]}${hora}`;
    default: return '—';
  }
}

export default function ProcessList() {
  const [processes, setProcesses] = useState([]);
  const [executionsToday, setExecutionsToday] = useState({});
  const [schedulesMap, setSchedulesMap] = useState({}); // proceso_id -> { ejecucion?, supervision?, auditoria? }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeArea, setActiveArea] = useState(ALL_TAB);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [procs, execs, schedules] = await Promise.all([
        processAPI.listProcesses(),
        processAPI.listExecutions({ fecha: today }),
        processAPI.listSchedules().catch(() => []),
      ]);
      setProcesses(procs);
      const counts = {};
      execs.forEach(e => { counts[e.proceso_id] = (counts[e.proceso_id] || 0) + 1; });
      setExecutionsToday(counts);
      const sm = {};
      (schedules || []).forEach(s => {
        const stype = s.schedule_type || 'ejecucion';
        sm[s.proceso_id] = sm[s.proceso_id] || {};
        sm[s.proceso_id][stype] = s;
      });
      setSchedulesMap(sm);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [procs, execs, schedules] = await Promise.all([
          processAPI.listProcesses(),
          processAPI.listExecutions({ fecha: today }),
          processAPI.listSchedules().catch(() => []),
        ]);
        if (!alive) return;
        setProcesses(procs);
        const counts = {};
        execs.forEach(e => { counts[e.proceso_id] = (counts[e.proceso_id] || 0) + 1; });
        setExecutionsToday(counts);
        const sm = {};
        (schedules || []).forEach(s => {
          const stype = s.schedule_type || 'ejecucion';
          sm[s.proceso_id] = sm[s.proceso_id] || {};
          sm[s.proceso_id][stype] = s;
        });
        setSchedulesMap(sm);
      } catch (e) { console.error(e); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

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
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-900 text-white sticky top-0 z-10">
              <tr>
                <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Código</th>
                <th className="text-left px-2.5 py-2.5 font-semibold min-w-[220px]">Nombre / Tipo</th>
                <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Responsable</th>
                <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Frecuencia Proceso</th>
                <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Supervisión</th>
                <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Frecuencia Auditoría</th>
                <th className="text-center px-2.5 py-2.5 font-semibold whitespace-nowrap">Pasos</th>
                <th className="text-center px-2.5 py-2.5 font-semibold whitespace-nowrap">Hoy</th>
                <th className="text-center px-2.5 py-2.5 font-semibold whitespace-nowrap">Estado</th>
                <th className="sticky right-0 bg-slate-900 text-right px-2.5 py-2.5 font-semibold shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.15)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300"/>Sin procesos en esta área
                </td></tr>
              )}
              {filtered.map(p => {
                const sch = schedulesMap[p.id] || {};
                const respName = sch.ejecucion?.responsable_nombre || '—';
                return (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60 group" data-testid={`process-row-${p.id}`}>
                  <td className="px-2.5 py-1.5 font-mono whitespace-nowrap align-top">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] text-white"
                      style={{ background: p.tipo_color_fondo || '#475569', color: p.tipo_color_texto || '#fff' }}
                    >{p.codigo}</span>
                  </td>
                  <td className="px-2.5 py-1.5 align-top max-w-xs">
                    <p className="font-medium text-slate-800 leading-tight" title={p.nombre}>{p.nombre}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{stripHtml(p.descripcion)}</p>
                    {p.tipo_nombre && (
                      <span
                        className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-1"
                        style={{ backgroundColor: softTint(p.tipo_color_fondo, 0.15), color: p.tipo_color_fondo }}
                      >
                        {p.tipo_nombre}
                      </span>
                    )}
                  </td>
                  <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap align-top">{respName}</td>
                  <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap align-top">{describeSchedule(sch.ejecucion)}</td>
                  <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap align-top">{describeSchedule(sch.supervision)}</td>
                  <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap align-top">{describeSchedule(sch.auditoria)}</td>
                  <td className="px-2.5 py-1.5 text-center font-medium text-slate-700 align-top">{p.total_pasos}</td>
                  <td className="px-2.5 py-1.5 text-center font-medium text-slate-700 align-top">{executionsToday[p.id] || 0}</td>
                  <td className="px-2.5 py-1.5 text-center align-top whitespace-nowrap">
                    {p.activo
                      ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Activo</span>
                      : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactivo</span>}
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-slate-50 px-2.5 py-1.5 align-top shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-end gap-0.5">
                      <button onClick={() => navigate(`/process/admin/processes/${p.id}/info`)} title="Ver" data-testid={`process-info-btn-${p.id}`} className="p-1.5 hover:bg-indigo-50 rounded text-indigo-600"><Eye className="w-4 h-4"/></button>
                      <button onClick={() => navigate(`/process/admin/processes/${p.id}`)} title="Ver pasos" data-testid={`process-steps-btn-${p.id}`} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ListChecks className="w-4 h-4"/></button>
                      <button onClick={() => navigate(`/process/admin/processes/${p.id}/edit`)} title="Editar" className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Pencil className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar" className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
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
