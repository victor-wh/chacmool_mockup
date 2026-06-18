import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { supervisionAPI } from '../../services/supervisionApi';
import { auditAPI } from '../../services/auditApi';
import { Loader2, Eye, Search, Filter, ClipboardCheck, ShieldCheck, X } from 'lucide-react';
import { softTint } from '../../lib/color';

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

export default function AdminExecutions() {
  const [params, setParams] = useSearchParams();
  const procFromUrl = params.get('proceso_id') || '';
  const procCodeFromUrl = params.get('proceso_codigo') || '';
  const fechaDesde = params.get('fecha_desde') || '';
  const fechaHasta = params.get('fecha_hasta') || '';
  const clearFilters = () => setParams({});

  const [items, setItems] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const filterProc = procFromUrl;  // derivado de URL params
  const setFilterProc = (val) => {
    const next = new URLSearchParams(params);
    if (val) next.set('proceso_id', val); else next.delete('proceso_id');
    setParams(next);
  };
  const [search, setSearch] = useState('');
  const [supMap, setSupMap] = useState({});
  const [supervising, setSupervising] = useState(null);
  const [audMap, setAudMap] = useState({}); // ejecucion_id -> {id, codigo}
  const [auditing, setAuditing] = useState(null);
  const [schedulesMap, setSchedulesMap] = useState({}); // proceso_id -> { ejecucion?, supervision?, auditoria? }
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [exes, procs, sups, auds, schedules] = await Promise.all([
          processAPI.listExecutions({ fecha: filterDate || undefined, procesoId: filterProc || undefined }),
          processAPI.listProcesses(),
          supervisionAPI.list().catch(() => []),
          auditAPI.list().catch(() => []),
          processAPI.listSchedules().catch(() => []),
        ]);
        if (!alive) return;
        setItems(exes); setProcesses(procs);
        const sm = {};
        (sups || []).forEach(s => { sm[s.ejecucion_id] = { id: s.id, codigo: s.codigo, estado: s.estado }; });
        setSupMap(sm);
        const am = {};
        (auds || []).forEach(a => { am[a.ejecucion_id] = { id: a.id, codigo: a.codigo, estado: a.estado }; });
        setAudMap(am);
        const schMap = {};
        (schedules || []).forEach(s => {
          const stype = s.schedule_type || 'ejecucion';
          schMap[s.proceso_id] = schMap[s.proceso_id] || {};
          schMap[s.proceso_id][stype] = s;
        });
        setSchedulesMap(schMap);
      } catch (e) { console.error(e); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [filterDate, filterProc]);

  const handleSupervise = async (ev, e) => {
    ev.stopPropagation();
    const existing = supMap[e.id];
    if (existing) {
      navigate(`/supervision/${existing.id}`);
      return;
    }
    setSupervising(e.id);
    try {
      const sup = await supervisionAPI.create(e.id);
      navigate(`/supervision/${sup.id}`);
    } catch (err) { alert(err.message); setSupervising(null); }
  };

  const handleAudit = async (ev, e) => {
    ev.stopPropagation();
    const existing = audMap[e.id];
    if (existing) {
      navigate(`/audit/${existing.id}`);
      return;
    }
    setAuditing(e.id);
    try {
      const aud = await auditAPI.create(e.id);
      navigate(`/audit/${aud.id}`);
    } catch (err) { alert(err.message); setAuditing(null); }
  };

  const filtered = items.filter(e => {
    if (fechaDesde && e.fecha && e.fecha < fechaDesde) return false;
    if (fechaHasta && e.fecha && e.fecha > fechaHasta) return false;
    return (e.codigo_ejecucion + e.proceso_nombre + e.staff_user_name).toLowerCase().includes(search.toLowerCase());
  });

  const hasActiveFilter = procFromUrl || fechaDesde || fechaHasta;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Ejecuciones de Procesos</h1>
        <p className="text-slate-500 mt-1">Monitoreo global de ejecuciones</p>
      </div>

      {hasActiveFilter && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-3 flex-wrap" data-testid="active-filter-banner">
          <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Filtro activo:</span>
          {procCodeFromUrl && <span className="text-xs bg-white border border-blue-200 rounded-full px-2 py-0.5 font-mono">{procCodeFromUrl}</span>}
          {fechaDesde && <span className="text-xs text-blue-900">desde {fechaDesde}</span>}
          {fechaHasta && <span className="text-xs text-blue-900">hasta {fechaHasta}</span>}
          <button
            onClick={clearFilters}
            data-testid="clear-filters-btn"
            className="ml-auto text-xs text-blue-900 hover:text-blue-700 inline-flex items-center gap-1"
          >
            <X className="w-3 h-3"/>Quitar filtro
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar código, proceso, usuario..." className="flex-1 bg-transparent text-sm focus:outline-none"/>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400"/>
          <select value={filterProc} onChange={e => setFilterProc(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Todos los procesos</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-2 py-1.5"/>
          {(filterDate || filterProc) && (
            <button onClick={() => { setFilterDate(''); setFilterProc(''); }} className="text-xs text-blue-600 hover:underline">Limpiar</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 min-w-[200px]">Proceso / Tipo</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 min-w-[120px]">% Cumplimiento</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 whitespace-nowrap">Usuario</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 whitespace-nowrap">Fecha</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 whitespace-nowrap">Responsable</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 whitespace-nowrap">Frecuencia Proceso</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 whitespace-nowrap">Supervisión</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 whitespace-nowrap">Frecuencia Auditoría</th>
                <th className="text-left text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5">Estado</th>
                <th className="sticky right-0 bg-slate-50 text-right text-[10px] font-semibold text-slate-500 uppercase px-3 py-2.5 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (<tr><td colSpan={10} className="text-center py-10 text-slate-400">Sin ejecuciones</td></tr>)}
              {filtered.map(e => {
                const sch = schedulesMap[e.proceso_id] || {};
                const respName = sch.ejecucion?.responsable_nombre || '—';
                return (
                <tr key={e.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => navigate(`/process/execution/${e.id}`)}>
                  <td className="px-3 py-2 align-top">
                    <p className="text-[10px] font-mono text-slate-400">{e.codigo_ejecucion}</p>
                    <p className="font-medium text-slate-900 leading-tight">{e.proceso_nombre}</p>
                    {e.tipo_nombre && (
                      <span
                        className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1"
                        style={{ backgroundColor: softTint(e.tipo_color_fondo, 0.15), color: e.tipo_color_fondo }}
                      >
                        {e.tipo_nombre}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${e.estado === 'completado' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${e.progreso}%` }}/>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 min-w-[36px] text-right">{e.progreso}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap align-top">
                    {e.staff_user_name}
                    {e.staff_area_nombre && <p className="text-[10px] text-slate-400">{e.staff_area_nombre}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap align-top">{e.fecha} {e.hora_inicio}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap align-top">{respName}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap align-top">{describeSchedule(sch.ejecucion)}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap align-top">{describeSchedule(sch.supervision)}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap align-top">{describeSchedule(sch.auditoria)}</td>
                  <td className="px-3 py-2 align-top">
                    {e.estado === 'completado' ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Completado</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">En progreso</span>
                    )}
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-slate-50 px-2 py-2 align-top shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-end gap-1.5">
                      {(() => {
                        const sup = supMap[e.id];
                        return (
                          <button
                            onClick={(ev) => handleSupervise(ev, e)}
                            disabled={supervising === e.id}
                            data-testid={`supervise-btn-${e.id}`}
                            title={sup ? `Abrir supervisión ${sup.codigo}` : 'Iniciar supervisión'}
                            className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1 disabled:opacity-50 ${sup ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                          >
                            {supervising === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ClipboardCheck className="w-3.5 h-3.5"/>}
                            {sup ? sup.codigo : 'Supervisión'}
                          </button>
                        );
                      })()}
                      {(() => {
                        const aud = audMap[e.id];
                        return (
                          <button
                            onClick={(ev) => handleAudit(ev, e)}
                            disabled={auditing === e.id}
                            data-testid={`audit-btn-${e.id}`}
                            title={aud ? `Abrir auditoría ${aud.codigo}` : 'Iniciar auditoría'}
                            className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1 disabled:opacity-50 ${aud ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-violet-700 hover:bg-violet-800 text-white'}`}
                          >
                            {auditing === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ShieldCheck className="w-3.5 h-3.5"/>}
                            {aud ? aud.codigo : 'Auditoría'}
                          </button>
                        );
                      })()}
                      <button onClick={(ev) => { ev.stopPropagation(); navigate(`/process/execution/${e.id}`); }} className="text-blue-600 hover:underline text-xs flex items-center gap-1 px-2 py-1">
                        <Eye className="w-3.5 h-3.5"/>Ver
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
