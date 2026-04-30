import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import {
  Loader2, Camera, CheckCircle2, AlertTriangle, X, ArrowLeft,
  Image as ImageIcon, Info, Send, RotateCcw, Circle, Check, FileText
} from 'lucide-react';

const STATUS = {
  0: { label: 'Pendiente', bar: 'bg-slate-400', tag: 'bg-slate-100 text-slate-600 border-slate-300' },
  1: { label: 'En progreso', bar: 'bg-blue-500', tag: 'bg-blue-50 text-blue-700 border-blue-300' },
  2: { label: 'Completado', bar: 'bg-green-500', tag: 'bg-green-50 text-green-700 border-green-300' },
  3: { label: 'Error', bar: 'bg-red-500', tag: 'bg-red-50 text-red-700 border-red-300' },
};

export default function ExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evidenceModalIdx, setEvidenceModalIdx] = useState(null);  // index del paso para evidencia
  const [detailsModalIdx, setDetailsModalIdx] = useState(null);    // index del paso para ver detalles
  const [updatingId, setUpdatingId] = useState(null);              // id del step exec en proceso

  const load = useCallback(async () => {
    try {
      const [exe, st] = await Promise.all([
        processAPI.getExecution(id),
        processAPI.listStepExecutions(id),
      ]);
      setExecution(exe);
      setSteps(st);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const refreshExecution = async () => {
    const exe = await processAPI.getExecution(id);
    setExecution(exe);
  };

  const updateStep = async (stepExecId, patch) => {
    setUpdatingId(stepExecId);
    try {
      const updated = await processAPI.updateStepExecution(stepExecId, patch);
      setSteps(prev => prev.map(s => s.id === stepExecId ? updated : s));
      await refreshExecution();
      return updated;
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Click sobre un paso: si requiere evidencia abrir modal, sino toggle estado
  const handleStepClick = (idx) => {
    const s = steps[idx];
    if (!s) return;
    if (s.paso_requiere_evidencia) {
      setEvidenceModalIdx(idx);
    } else {
      // Toggle 0 <-> 2
      const newState = s.estado === 2 ? 0 : 2;
      updateStep(s.id, { estado: newState });
    }
  };

  const handleEvidenceUpload = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('La imagen no debe superar 4MB'); return; }
    const idx = evidenceModalIdx;
    const target = steps[idx];
    if (!target) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const updated = await updateStep(target.id, {
        evidencia: ev.target.result,
        evidencia_nombre: file.name,
        estado: 2,
      });
      if (updated) setEvidenceModalIdx(null);
    };
    reader.readAsDataURL(file);
  };

  const removeEvidence = async (idx) => {
    const target = steps[idx];
    await updateStep(target.id, { evidencia: null, evidencia_nombre: null, estado: 0 });
  };

  const markError = async (idx) => {
    const target = steps[idx];
    await updateStep(target.id, { estado: 3 });
  };

  const resetStep = async (idx) => {
    const target = steps[idx];
    await updateStep(target.id, { estado: 0, evidencia: null, evidencia_nombre: null });
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando ejecución...</div>;
  if (!execution) return <div className="text-slate-500">Ejecución no encontrada</div>;

  const isCompleted = execution.estado === 'completado';
  const evidenceStep = evidenceModalIdx !== null ? steps[evidenceModalIdx] : null;
  const detailsStep = detailsModalIdx !== null ? steps[detailsModalIdx] : null;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4"/>Volver
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
              <span>{execution.codigo_ejecucion}</span>
              {execution.tipo_nombre && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: execution.tipo_color_fondo, color: execution.tipo_color_texto }}>
                  {execution.tipo_nombre}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>{execution.proceso_nombre}</h1>
            <p className="text-sm text-slate-500 mt-1">{execution.staff_user_name} · {execution.fecha} · iniciado {execution.hora_inicio}{execution.hora_fin ? ` · finalizado ${execution.hora_fin}` : ''}</p>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1.5 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4"/>Completado
            </span>
          )}
        </div>

        {/* progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${execution.progreso}%` }}/>
          </div>
          <span className="text-sm font-semibold text-slate-900 min-w-[60px] text-right">{execution.progreso}%</span>
          <span className="text-xs text-slate-500">{execution.pasos_completados}/{execution.total_pasos}</span>
        </div>
      </div>

      {/* Steps list (centered, single column) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pasos</h2>
          <span className="text-xs text-slate-400">Click para marcar · {steps.filter(s => s.paso_requiere_evidencia).length} requieren evidencia</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {steps.map((s, i) => {
            const st = STATUS[s.estado];
            const isUpdating = updatingId === s.id;
            return (
              <li key={s.id} className="group hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 px-6 py-4">
                  {/* check icon (clickable) */}
                  <button
                    onClick={() => handleStepClick(i)}
                    disabled={isUpdating}
                    className="flex-shrink-0"
                    title={s.paso_requiere_evidencia ? 'Subir evidencia' : (s.estado === 2 ? 'Marcar pendiente' : 'Marcar completado')}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-7 h-7 text-slate-400 animate-spin"/>
                    ) : s.estado === 2 ? (
                      <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors">
                        <Check className="w-4 h-4"/>
                      </div>
                    ) : s.estado === 3 ? (
                      <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                        <X className="w-4 h-4"/>
                      </div>
                    ) : s.estado === 1 ? (
                      <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center hover:bg-blue-600 transition-colors">
                        {i + 1}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-slate-300 text-slate-400 text-xs font-semibold flex items-center justify-center group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                        {i + 1}
                      </div>
                    )}
                  </button>

                  {/* clickable name area */}
                  <button onClick={() => handleStepClick(i)} disabled={isUpdating} className="flex-1 text-left min-w-0">
                    <p className={`text-sm font-medium ${s.estado === 2 ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {s.paso_nombre}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${st.tag}`}>{st.label}</span>
                      {s.paso_requiere_evidencia && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          <Camera className="w-3 h-3"/>Evidencia
                        </span>
                      )}
                      {s.paso_es_critico && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3"/>Crítico
                        </span>
                      )}
                      {s.evidencia && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                          <ImageIcon className="w-3 h-3"/>Adjunto
                        </span>
                      )}
                    </div>
                  </button>

                  {/* secondary actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setDetailsModalIdx(i)}
                      title="Ver detalles"
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      <Info className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {steps.length === 0 && (
            <li className="px-6 py-10 text-center text-slate-400 text-sm">Sin pasos definidos.</li>
          )}
        </ul>

        {/* footer */}
        {isCompleted && (
          <div className="px-6 py-4 bg-green-50 border-t border-green-100 flex items-center justify-between">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5"/>Ejecución completada
            </p>
            <button onClick={() => navigate('/process/my-executions')} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl px-4 py-2 flex items-center gap-2">
              <Send className="w-4 h-4"/>Finalizar y notificar
            </button>
          </div>
        )}
      </div>

      {/* ---------- EVIDENCE MODAL ---------- */}
      {evidenceStep && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setEvidenceModalIdx(null)}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true"/>
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Paso {evidenceModalIdx + 1} de {steps.length}</p>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600"/>{evidenceStep.paso_nombre}
                  </h3>
                </div>
                <button onClick={() => setEvidenceModalIdx(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
              </div>

              <div className="p-5 space-y-4">
                {evidenceStep.paso_es_critico && (
                  <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                    <span>Este paso es crítico. Su omisión genera consecuencias según el sistema configurado.</span>
                  </div>
                )}

                {evidenceStep.paso_descripcion && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-line">
                    {evidenceStep.paso_descripcion}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Evidencia (imagen) <span className="text-red-500">*</span></label>
                  {evidenceStep.evidencia ? (
                    <div className="space-y-2">
                      <img src={evidenceStep.evidencia} alt="evidencia" className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-slate-50"/>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 truncate">{evidenceStep.evidencia_nombre}</span>
                        <button onClick={() => removeEvidence(evidenceModalIdx)} className="text-red-600 hover:underline flex items-center gap-1">
                          <X className="w-3 h-3"/>Quitar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl py-10 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      <ImageIcon className="w-8 h-8"/>
                      <span>Haz clic para subir o arrastra una imagen</span>
                      <span className="text-xs text-slate-400">PNG, JPG · máx 4MB</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleEvidenceUpload(e.target.files?.[0])}/>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-5 border-t border-slate-100">
                <button onClick={() => markError(evidenceModalIdx)} disabled={updatingId === evidenceStep.id} className="text-sm px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4"/>Marcar error
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => resetStep(evidenceModalIdx)} disabled={updatingId === evidenceStep.id} className="text-sm px-3 py-2 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center gap-2">
                    <RotateCcw className="w-4 h-4"/>Resetear
                  </button>
                  <button onClick={() => setEvidenceModalIdx(null)} className="text-sm px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-2">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- DETAILS MODAL ---------- */}
      {detailsStep && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setDetailsModalIdx(null)}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true"/>
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md my-8">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Paso {detailsModalIdx + 1} de {steps.length}</p>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500"/>Detalles del paso
                  </h3>
                </div>
                <button onClick={() => setDetailsModalIdx(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Nombre</p>
                  <p className="text-sm font-medium text-slate-900">{detailsStep.paso_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{detailsStep.paso_descripcion || <span className="text-slate-400 italic">— sin descripción —</span>}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Puntos</p>
                    <p className="text-base font-semibold text-slate-900">{detailsStep.paso_puntos}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Estado</p>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS[detailsStep.estado].tag}`}>
                      <Circle className={`w-2 h-2 fill-current ${STATUS[detailsStep.estado].bar.replace('bg-', 'text-')}`}/>{STATUS[detailsStep.estado].label}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailsStep.paso_requiere_evidencia && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      <Camera className="w-3 h-3"/>Requiere evidencia
                    </span>
                  )}
                  {detailsStep.paso_es_critico && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                      <AlertTriangle className="w-3 h-3"/>Paso crítico
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
                <button onClick={() => setDetailsModalIdx(null)} className="text-sm px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg">Cerrar</button>
                {detailsStep.paso_requiere_evidencia && (
                  <button onClick={() => { setDetailsModalIdx(null); setEvidenceModalIdx(detailsModalIdx); }} className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2">
                    <Camera className="w-4 h-4"/>Subir evidencia
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
