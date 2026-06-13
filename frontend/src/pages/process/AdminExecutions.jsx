import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { supervisionAPI } from '../../services/supervisionApi';
import { auditAPI } from '../../services/auditApi';
import { Loader2, Eye, Search, Filter, ClipboardCheck, ShieldCheck, X } from 'lucide-react';
import { softTint } from '../../lib/color';

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
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [exes, procs, sups, auds] = await Promise.all([
          processAPI.listExecutions({ fecha: filterDate || undefined, procesoId: filterProc || undefined }),
          processAPI.listProcesses(),
          supervisionAPI.list().catch(() => []),
          auditAPI.list().catch(() => []),
        ]);
        if (!alive) return;
        setItems(exes); setProcesses(procs);
        const sm = {};
        (sups || []).forEach(s => { sm[s.ejecucion_id] = { id: s.id, codigo: s.codigo, estado: s.estado }; });
        setSupMap(sm);
        const am = {};
        (auds || []).forEach(a => { am[a.ejecucion_id] = { id: a.id, codigo: a.codigo, estado: a.estado }; });
        setAudMap(am);
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Código</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Proceso</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Usuario</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Fecha</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Progreso</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (<tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin ejecuciones</td></tr>)}
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/process/execution/${e.id}`)}>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">{e.codigo_ejecucion}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{e.proceso_nombre}</p>
                    {e.tipo_nombre && (
                      <span
                        className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full"
                        style={{ backgroundColor: softTint(e.tipo_color_fondo, 0.15), color: e.tipo_color_fondo }}
                      >
                        {e.tipo_nombre}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-700">{e.staff_user_name}<p className="text-xs text-slate-400">{e.staff_area_nombre}</p></td>
                  <td className="px-6 py-3 text-sm text-slate-600">{e.fecha} {e.hora_inicio}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 min-w-[150px]">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${e.estado === 'completado' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${e.progreso}%` }}/>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 min-w-[40px] text-right">{e.progreso}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {e.estado === 'completado' ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">Completado</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">En progreso</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
