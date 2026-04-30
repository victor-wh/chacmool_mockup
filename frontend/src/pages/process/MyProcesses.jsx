import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Play, FileText, Loader2, ExternalLink, ListChecks, UserCheck, AlertTriangle, Camera, ArrowRight } from 'lucide-react';
import { stripHtml } from '../../lib/html';

export default function MyProcesses() {
  const [processes, setProcesses] = useState([]);
  const [assignedSteps, setAssignedSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [procs, assigned] = await Promise.all([
          processAPI.listProcesses({ mine: true }),
          processAPI.getMyAssignedSteps().catch(() => []),
        ]);
        setProcesses(procs);
        setAssignedSteps(assigned || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const handleStart = async (procId) => {
    setStarting(procId);
    try {
      const exe = await processAPI.createExecution(procId);
      navigate(`/process/execution/${exe.id}`);
    } catch (e) {
      alert('Error al iniciar: ' + e.message);
      setStarting(null);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando procesos...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Mis Procesos</h1>
        <p className="text-slate-500 mt-1">Procesos activos disponibles en tu área</p>
      </div>

      {/* ---------- Pasos asignados a mí (colaboración) ---------- */}
      {assignedSteps.length > 0 && (
        <section className="mb-10" data-testid="assigned-steps-section">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4"/>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pasos asignados a mí</h2>
              <p className="text-xs text-slate-500">{assignedSteps.length} paso{assignedSteps.length !== 1 ? 's' : ''} pendiente{assignedSteps.length !== 1 ? 's' : ''} en ejecuciones iniciadas por otros colaboradores</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignedSteps.map((a) => (
              <button
                key={a.step_execution_id}
                onClick={() => navigate(`/process/execution/${a.ejecucion_id}`)}
                data-testid={`assigned-step-${a.step_execution_id}`}
                className="bg-white border border-indigo-100 hover:border-indigo-300 rounded-2xl p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-slate-400">{a.codigo_ejecucion}</span>
                  {a.tipo_nombre && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: a.tipo_color_fondo, color: a.tipo_color_texto }}>
                      {a.tipo_nombre}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-1">Proceso</p>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 line-clamp-1">{a.proceso_nombre}</h3>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-indigo-600 font-semibold mb-1">Tu paso</p>
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      {a.paso_orden}
                    </span>
                    {a.paso_nombre}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
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
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Iniciado por <strong className="text-slate-700">{a.iniciado_por}</strong> · {a.fecha}</span>
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-medium group-hover:gap-2 transition-all">
                    Ir a ejecución <ArrowRight className="w-3 h-3"/>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Disponibles</h2>
        <span className="text-xs text-slate-500">· Inicia una nueva ejecución</span>
      </div>

      {processes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay procesos disponibles para tu área.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {processes.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-slate-400">{p.codigo}</span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: p.tipo_color_fondo || '#3B82F6', color: p.tipo_color_texto || '#FFFFFF' }}
                >
                  {p.tipo_nombre || 'Sin tipo'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">{p.nombre}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">{stripHtml(p.descripcion) || 'Sin descripción'}</p>

              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />{p.total_pasos} pasos</span>
                <span>·</span>
                <span>{p.area_nombre || 'Sin área'}</span>
                {p.url_referencia && (
                  <>
                    <span>·</span>
                    <a href={p.url_referencia} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3"/>Wiki
                    </a>
                  </>
                )}
              </div>

              <button
                onClick={() => handleStart(p.id)}
                disabled={starting === p.id || p.total_pasos === 0}
                className="mt-auto w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {starting === p.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
                {p.total_pasos === 0 ? 'Sin pasos definidos' : 'Iniciar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
