import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Loader2, Eye, Search, Filter } from 'lucide-react';

export default function AdminExecutions() {
  const [items, setItems] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterProc, setFilterProc] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [exes, procs] = await Promise.all([
        processAPI.listExecutions({ fecha: filterDate || undefined, procesoId: filterProc || undefined }),
        processAPI.listProcesses(),
      ]);
      setItems(exes); setProcesses(procs);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterDate, filterProc]);

  const filtered = items.filter(e => (e.codigo_ejecucion + e.proceso_nombre + e.staff_user_name).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Ejecuciones de Procesos</h1>
        <p className="text-slate-500 mt-1">Monitoreo global de ejecuciones</p>
      </div>

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
                    {e.tipo_nombre && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: e.tipo_color_fondo, color: e.tipo_color_texto }}>{e.tipo_nombre}</span>}
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
                    <button onClick={(ev) => { ev.stopPropagation(); navigate(`/process/execution/${e.id}`); }} className="text-blue-600 hover:underline text-sm flex items-center gap-1"><Eye className="w-4 h-4"/>Ver</button>
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
