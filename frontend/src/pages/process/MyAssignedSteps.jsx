import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import {
  Loader2, UserCheck, AlertTriangle, Camera, ArrowRight, FileText, Clock
} from 'lucide-react';

const STATUS = {
  0: { label: 'Pendiente', tag: 'bg-slate-100 text-slate-700 border-slate-300' },
  1: { label: 'En progreso', tag: 'bg-blue-50 text-blue-700 border-blue-300' },
};

export default function MyAssignedSteps() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await processAPI.getMyAssignedSteps();
        setItems(data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500" data-testid="assigned-loading"><Loader2 className="w-4 h-4 animate-spin"/>Cargando pasos asignados...</div>;
  }

  return (
    <div className="animate-fade-in" data-testid="my-assigned-steps-page">
      <div className="mb-8 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-5 h-5"/>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Pasos asignados a mí
          </h1>
          <p className="text-slate-500 mt-1">
            Pasos pendientes en ejecuciones iniciadas por otros colaboradores que requieren de tu intervención
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center" data-testid="assigned-empty">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">No tienes pasos asignados pendientes</p>
          <p className="text-xs text-slate-400 mt-1">Cuando otro colaborador necesite tu intervención en un paso, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              {items.length} paso{items.length !== 1 ? 's' : ''} pendiente{items.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Ejecución</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Proceso</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Tu paso</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Iniciado por</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Fecha</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(a => {
                const st = STATUS[a.estado] || STATUS[0];
                return (
                  <tr key={a.step_execution_id} className="hover:bg-slate-50" data-testid={`assigned-row-${a.step_execution_id}`}>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{a.codigo_ejecucion}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 line-clamp-1">{a.proceso_nombre}</p>
                        {a.tipo_nombre && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: a.tipo_color_fondo, color: a.tipo_color_texto }}>
                            {a.tipo_nombre}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex-shrink-0">
                          {a.paso_orden}
                        </span>
                        <span className="text-sm font-medium text-slate-900 line-clamp-1">{a.paso_nombre}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {a.paso_requiere_evidencia && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            <Camera className="w-3 h-3"/>Evidencia
                          </span>
                        )}
                        {a.paso_es_critico && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3"/>Crítico
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${st.tag}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700">{a.iniciado_por}</td>
                    <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3"/>{a.fecha} · {a.hora_inicio}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => navigate(`/process/execution/${a.ejecucion_id}`)}
                        data-testid={`open-execution-${a.ejecucion_id}`}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      >
                        Ir a ejecución<ArrowRight className="w-3.5 h-3.5"/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
