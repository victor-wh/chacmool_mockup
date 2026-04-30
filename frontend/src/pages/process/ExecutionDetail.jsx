import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Loader2, ChevronLeft, ChevronRight, Camera, Save, CheckCircle2, AlertTriangle, Clock, X, Send, Image as ImageIcon, ArrowLeft } from 'lucide-react';

const STATUS = {
  0: { label: 'Pendiente', color: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' },
  1: { label: 'En progreso', color: 'bg-blue-50 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
  2: { label: 'Completado', color: 'bg-green-50 text-green-700 border-green-300', dot: 'bg-green-500' },
  3: { label: 'Error', color: 'bg-red-50 text-red-700 border-red-300', dot: 'bg-red-500' }
};

export default function ExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [exe, st] = await Promise.all([
        processAPI.getExecution(id),
        processAPI.listStepExecutions(id)
      ]);
      setExecution(exe);
      setSteps(st);
      // active = primer paso no completado
      const idx = st.findIndex(s => s.estado !== 2);
      if (idx >= 0) setActiveIdx(idx);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStep = async (patch) => {
    setSaving(true);
    try {
      const updated = await processAPI.updateStepExecution(steps[activeIdx].id, patch);
      const newSteps = [...steps];
      newSteps[activeIdx] = updated;
      setSteps(newSteps);
      // refresh exe
      const exe = await processAPI.getExecution(id);
      setExecution(exe);
    } catch (e) {
      alert('Error: ' + e.message);
    }
    setSaving(false);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('La imagen no debe superar 4MB'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await updateStep({ evidencia: ev.target.result, evidencia_nombre: file.name });
    };
    reader.readAsDataURL(file);
  };

  const goToStep = (i) => {
    if (i < 0 || i >= steps.length) return;
    setActiveIdx(i);
  };

  const markStep = async (estado) => {
    await updateStep({ estado });
    if (estado === 2 && activeIdx < steps.length - 1) {
      setTimeout(() => setActiveIdx(activeIdx + 1), 300);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando ejecución...</div>;
  if (!execution) return <div className="text-slate-500">Ejecución no encontrada</div>;

  const current = steps[activeIdx];
  const isCompleted = execution.estado === 'completado';

  return (
    <div className="animate-fade-in">
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

      {/* main grid: stepper + content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stepper sidebar */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 self-start">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Pasos</h3>
          <ul className="space-y-1">
            {steps.map((s, i) => {
              const st = STATUS[s.estado];
              const isActive = i === activeIdx;
              return (
                <li key={s.id}>
                  <button onClick={() => goToStep(i)} className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-start gap-3 ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                    <span className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5 ${s.estado === 2 ? 'bg-green-500 text-white' : s.estado === 1 ? 'bg-blue-500 text-white' : s.estado === 3 ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {s.estado === 2 ? '✓' : s.estado === 3 ? '!' : (i + 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${isActive ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{s.paso_nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${st.color}`}>{st.label}</span>
                        {s.paso_es_critico && <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">Crítico</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Step content */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6">
          {!current ? (
            <p className="text-slate-500">Sin pasos en este proceso.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Paso {activeIdx + 1} de {steps.length}</p>
                  <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>{current.paso_nombre}</h2>
                  {current.paso_es_critico && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Paso crítico — su omisión genera consecuencias</p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${STATUS[current.estado].color}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS[current.estado].dot}`}/>{STATUS[current.estado].label}
                </span>
              </div>

              {current.paso_descripcion && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 mb-4 whitespace-pre-line">{current.paso_descripcion}</div>
              )}

              {/* Evidencia */}
              {current.paso_requiere_evidencia && (
                <div className="mb-5">
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <Camera className="w-4 h-4"/>Evidencia (imagen) <span className="text-red-500">*</span>
                  </label>
                  {current.evidencia ? (
                    <div className="relative inline-block">
                      <img src={current.evidencia} alt="evidencia" className="max-h-48 rounded-lg border border-slate-200"/>
                      <button onClick={() => updateStep({ evidencia: null, evidencia_nombre: null })} className="absolute top-1 right-1 bg-white/90 hover:bg-white rounded-full p-1 shadow-sm">
                        <X className="w-3 h-3"/>
                      </button>
                      <p className="text-xs text-slate-500 mt-1">{current.evidencia_nombre}</p>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl py-6 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                      <ImageIcon className="w-5 h-5"/>
                      <span>Subir imagen (clic o arrastra)</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])}/>
                    </label>
                  )}
                </div>
              )}

              {/* Comentarios */}
              <div className="mb-5">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Comentarios</label>
                <textarea
                  value={current.comentarios || ''}
                  onChange={e => {
                    const newSteps = [...steps];
                    newSteps[activeIdx] = { ...current, comentarios: e.target.value };
                    setSteps(newSteps);
                  }}
                  onBlur={e => updateStep({ comentarios: e.target.value })}
                  rows={3}
                  placeholder="Notas, observaciones, motivo de error..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                <button onClick={() => markStep(1)} disabled={saving} className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4"/>Marcar en progreso
                </button>
                <button onClick={() => markStep(2)} disabled={saving || (current.paso_requiere_evidencia && !current.evidencia)} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-300 rounded-lg text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4"/>Completar
                </button>
                <button onClick={() => markStep(3)} disabled={saving} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4"/>Marcar error
                </button>
                <button onClick={() => markStep(0)} disabled={saving} className="px-3 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">Resetear</button>
              </div>

              {/* Nav */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                <button onClick={() => goToStep(activeIdx - 1)} disabled={activeIdx === 0} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4"/>Anterior
                </button>
                <span className="text-xs text-slate-400">{saving ? <span className="flex items-center gap-1"><Save className="w-3 h-3 animate-pulse"/>Guardando...</span> : 'Guardado'}</span>
                {activeIdx < steps.length - 1 ? (
                  <button onClick={() => goToStep(activeIdx + 1)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                    Siguiente<ChevronRight className="w-4 h-4"/>
                  </button>
                ) : isCompleted ? (
                  <button onClick={() => navigate('/process/my-executions')} className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                    <Send className="w-4 h-4"/>Finalizar
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Último paso</span>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
