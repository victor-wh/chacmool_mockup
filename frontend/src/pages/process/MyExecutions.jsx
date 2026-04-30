import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Loader2, Eye, Clock, CheckCircle2 } from 'lucide-react';

export default function MyExecutions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await processAPI.listExecutions({ mine: true });
        setItems(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const calcDur = (e) => {
    if (!e.hora_fin) return '—';
    const [h1, m1] = e.hora_inicio.split(':').map(Number);
    const [h2, m2] = e.hora_fin.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) return '—';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Mis Ejecuciones</h1>
        <p className="text-slate-500 mt-1">Historial de procesos ejecutados</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Código</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Proceso</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Fecha</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Progreso</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Duración</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aún no has ejecutado ningún proceso.</td></tr>
            )}
            {items.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/process/execution/${e.id}`)}>
                <td className="px-6 py-3 font-mono text-xs text-slate-500">{e.codigo_ejecucion}</td>
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{e.proceso_nombre}</p>
                  {e.tipo_nombre && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: e.tipo_color_fondo, color: e.tipo_color_texto }}>{e.tipo_nombre}</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">{e.fecha} {e.hora_inicio}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 min-w-[150px]">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${e.estado === 'completado' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${e.progreso}%` }}/>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 min-w-[40px] text-right">{e.progreso}%</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">{calcDur(e)}</td>
                <td className="px-6 py-3">
                  {e.estado === 'completado' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200"><CheckCircle2 className="w-3 h-3"/>Completado</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3 h-3"/>En progreso</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <button onClick={(ev) => { ev.stopPropagation(); navigate(`/process/execution/${e.id}`); }} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                    <Eye className="w-4 h-4"/>Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
