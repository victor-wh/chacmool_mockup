import { useEffect, useState, useCallback, Fragment, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CheckCircle2, AlertTriangle, X, Camera, FileText,
  Image as ImageIcon, Info, ShieldCheck, ShieldX, FileWarning, Trash2, Check,
  ChevronDown, ChevronUp, MessageSquare,
} from 'lucide-react';
import { supervisionAPI } from '../../services/supervisionApi';
import { processAPI } from '../../services/processApi';

const REALIZADO = {
  0: { label: 'Pendiente', bar: 'bg-slate-400', tag: 'bg-slate-100 text-slate-600 border-slate-300' },
  1: { label: 'En progreso', bar: 'bg-blue-500', tag: 'bg-blue-50 text-blue-700 border-blue-300' },
  2: { label: 'Completado', bar: 'bg-green-500', tag: 'bg-green-50 text-green-700 border-green-300' },
  3: { label: 'Error', bar: 'bg-red-500', tag: 'bg-red-50 text-red-700 border-red-300' },
};

export default function SupervisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sup, setSup] = useState(null);
  const [items, setItems] = useState([]);
  const [stepExecMap, setStepExecMap] = useState({}); // paso_id -> stepExec (evidencia)
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [evidenceIdx, setEvidenceIdx] = useState(null);
  const [detailsIdx, setDetailsIdx] = useState(null);
  const [expandedAll, setExpandedAll] = useState(false);
  const debounceRef = useRef({});

  const load = useCallback(async () => {
    try {
      const d = await supervisionAPI.get(id);
      setSup(d);
      setItems(d.items || []);
      // Cargar step_executions de la ejecución original para tener acceso a evidencias
      try {
        const stepExecs = await processAPI.listStepExecutions(d.ejecucion_id);
        const m = {};
        (stepExecs || []).forEach(se => { m[se.paso_id] = se; });
        setStepExecMap(m);
      } catch (e) { /* ignore */ }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    (async () => { try { setStaffList(await processAPI.listStaff()); } catch (e) {} })();
    load();
  }, [load]);

  const readOnly = sup?.estado === 'completada';

  const patchItem = (itemId, patch) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...patch } : it));
  };

  const saveItem = async (itemId, patch) => {
    setSaving(true);
    try {
      await supervisionAPI.updateItem(id, itemId, patch);
      const d = await supervisionAPI.get(id);
      setSup(d);
      setItems(prev => prev.map(it => {
        const fresh = (d.items || []).find(i => i.id === it.id);
        return fresh || it;
      }));
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const handleCumplido = async (item, value) => {
    if (readOnly) return;
    const v = item.cumplido === value ? null : value;
    patchItem(item.id, { cumplido: v, ...(v === true ? { desviacion: '', accion_correctiva: '', responsable_id: null, responsable_nombre: '', fecha_compromiso: null } : {}) });
    await saveItem(item.id, { cumplido: v });
  };

  const markAllYes = async () => {
    if (readOnly) return;
    const pending = items.filter(it => it.cumplido !== true);
    if (pending.length === 0) return;
    if (!window.confirm(`Marcar ${pending.length} paso(s) como cumplido. ¿Continuar?`)) return;
    setSaving(true);
    try {
      // Optimistic UI: ponemos todo como Sí
      setItems(prev => prev.map(it => ({
        ...it,
        cumplido: true,
        desviacion: '', accion_correctiva: '',
        responsable_id: null, responsable_nombre: '', fecha_compromiso: null,
      })));
      // Backend en paralelo
      await Promise.all(pending.map(it => supervisionAPI.updateItem(id, it.id, { cumplido: true })));
      // Refrescar header (puntaje/aprobada)
      const d = await supervisionAPI.get(id);
      setSup(d); setItems(d.items || []);
    } catch (e) {
      alert(e.message);
      load();
    }
    setSaving(false);
  };

  const handlePlanField = (item, field, value) => {
    if (readOnly) return;
    patchItem(item.id, { [field]: value });
    const key = `${item.id}:${field}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => saveItem(item.id, { [field]: value }), 600);
  };

  const handleResponsable = async (item, staffId) => {
    patchItem(item.id, { responsable_id: staffId || null });
    await saveItem(item.id, { responsable_id: staffId || null });
  };

  const finalize = async () => {
    const pendientes = items.filter(i => i.cumplido === null || i.cumplido === undefined);
    if (pendientes.length > 0) {
      if (!window.confirm(`Hay ${pendientes.length} punto(s) sin marcar. ¿Completar de todos modos?`)) return;
    } else if (!window.confirm('¿Marcar esta supervisión como completada?')) return;
    setCompleting(true);
    try {
      await supervisionAPI.update(id, { estado: 'completada' });
      load();
    } catch (e) { alert(e.message); }
    setCompleting(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar ${sup.codigo}?`)) return;
    try {
      await supervisionAPI.remove(id);
      navigate('/supervision');
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando supervisión...</div>;
  if (!sup) return <div className="text-slate-500">Supervisión no encontrada</div>;

  const evidenceItem = evidenceIdx !== null ? items[evidenceIdx] : null;
  const evidenceStepExec = evidenceItem ? stepExecMap[evidenceItem.paso_id] : null;
  const detailsItem = detailsIdx !== null ? items[detailsIdx] : null;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto" data-testid="supervision-detail-page">
      <button onClick={() => navigate('/supervision')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4"/>Volver al listado
      </button>

      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1 flex-wrap">
              <span>{sup.codigo}</span>
              <span className="text-slate-300">·</span>
              <span>{sup.proceso_codigo}</span>
              {sup.area_nombre && <span className="text-slate-500">· {sup.area_nombre}</span>}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sup.estado === 'completada' ? 'bg-slate-900 text-white border-slate-900' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                {sup.estado === 'completada' ? 'Completada' : 'En curso'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>{sup.proceso_nombre}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Empleado: <strong className="text-slate-700">{sup.evaluado_nombre || '—'}</strong>
              {' · '}Auditor: <strong className="text-slate-700">{sup.auditor_nombre}</strong>
              {' · '}{sup.fecha}
              {' · '}Ejec. <span className="font-mono text-[11px]">{sup.ejecucion_codigo}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={finalize}
                disabled={completing}
                data-testid="supervision-finalize-btn"
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
              >
                {completing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                Confirmar supervisión
              </button>
            )}
            <button onClick={handleDelete} className="text-red-600 hover:bg-red-50 rounded-lg p-2" title="Eliminar">
              <Trash2 className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* Calificación bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${sup.aprobada === false ? 'bg-red-500' : (sup.porcentaje >= 70 ? 'bg-emerald-500' : 'bg-amber-500')}`}
              style={{ width: `${sup.porcentaje}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-900 min-w-[60px] text-right" data-testid="supervision-pct">{sup.porcentaje}%</span>
          <span className="text-xs text-slate-500 whitespace-nowrap">{sup.puntaje_obtenido}/{sup.puntaje_total} pts · {sup.items_evaluados}/{sup.items_total}</span>
        </div>

        {sup.estado === 'completada' && sup.aprobada !== null && sup.aprobada !== undefined && (
          <div
            className={`mt-4 rounded-xl p-3 border flex items-center gap-3 ${sup.aprobada ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}
            data-testid="supervision-result-banner"
          >
            {sup.aprobada
              ? <ShieldCheck className="w-6 h-6 text-green-600"/>
              : <ShieldX className="w-6 h-6 text-red-600"/>}
            <div className="flex-1 text-sm">
              <p className="font-bold uppercase tracking-wide">{sup.aprobada ? 'Aprobada' : 'Reprobada'}</p>
              <p className="text-xs opacity-80">
                {sup.aprobada
                  ? `${sup.porcentaje}% (≥70%) y sin puntos críticos omitidos.`
                  : sup.porcentaje < 70
                    ? `${sup.porcentaje}% por debajo del 70% requerido${sup.criticos_omitidos > 0 ? ` · ${sup.criticos_omitidos} crítico(s) omitido(s)` : ''}.`
                    : `${sup.criticos_omitidos} punto(s) crítico(s) omitido(s).`}
              </p>
            </div>
          </div>
        )}
        {saving && (
          <p className="text-[11px] text-amber-700 inline-flex items-center gap-1 mt-2">
            <Loader2 className="w-3 h-3 animate-spin"/>Guardando…
          </p>
        )}
      </div>

      {/* Steps list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pasos a supervisar</h2>
            {items.length > 0 && (
              <button
                onClick={() => setExpandedAll(v => !v)}
                data-testid="supervision-toggle-all-details"
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                {expandedAll ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
                {expandedAll ? 'Ocultar comentarios y evidencias' : 'Ver comentarios y evidencias'}
              </button>
            )}
            {!readOnly && items.some(i => i.cumplido !== true) && (
              <button
                onClick={markAllYes}
                disabled={saving}
                data-testid="supervision-mark-all-yes"
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5"/>Marcar todos como Sí
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {items.filter(i => i.cumplido === true).length} cumplen · {items.filter(i => i.cumplido === false).length} no cumplen · {items.filter(i => i.cumplido === null || i.cumplido === undefined).length} pendientes
          </span>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((it, i) => {
            const realMeta = REALIZADO[it.realizado_estado] || REALIZADO[0];
            const failed = it.cumplido === false;
            const passed = it.cumplido === true;
            const stepExec = stepExecMap[it.paso_id];
            const hasEvidence = Boolean(stepExec?.evidencia || (stepExec?.evidencias?.length > 0));
            const canViewEvidence = hasEvidence || it.es_critico;

            return (
              <Fragment key={it.id}>
                <li className={`group transition-colors ${failed ? 'bg-red-50/40' : passed ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-4 px-6 py-4">
                    {/* Status icon (from execution) */}
                    <div className="flex-shrink-0">
                      {it.realizado_estado === 2 ? (
                        <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center"><Check className="w-4 h-4"/></div>
                      ) : it.realizado_estado === 3 ? (
                        <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center"><X className="w-4 h-4"/></div>
                      ) : it.realizado_estado === 1 ? (
                        <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center">{it.orden}</div>
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-slate-300 text-slate-400 text-xs font-semibold flex items-center justify-center">{it.orden}</div>
                      )}
                    </div>

                    {/* Step name + badges */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{it.titulo}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${realMeta.tag}`}>
                          {realMeta.label}
                        </span>
                        {it.es_critico && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                            <AlertTriangle className="w-3 h-3"/>Crítico
                          </span>
                        )}
                        {hasEvidence && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            <ImageIcon className="w-3 h-3"/>Adjunto
                          </span>
                        )}
                        {it.realizado_comentarios && (
                          <span className="text-[10px] text-slate-500 italic line-clamp-1 max-w-[200px]">"{it.realizado_comentarios}"</span>
                        )}
                      </div>
                    </div>

                    {/* Pts */}
                    <div className="flex-shrink-0 text-center w-10">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">Pts</p>
                      <p className="text-base font-semibold text-slate-900">{it.puntos}</p>
                    </div>

                    {/* Cumple? checkbox */}
                    <div className="flex-shrink-0 w-24">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 text-center mb-1">¿Cumple?</p>
                      <Checkbox
                        value={it.cumplido}
                        readOnly={readOnly}
                        onChange={(v) => handleCumplido(it, v)}
                        testid={`sup-check-${it.id}`}
                      />
                    </div>

                    {/* Evidence button + Info — fixed width slot so columns align */}
                    <div className="flex-shrink-0 flex items-center gap-1 w-20 justify-end">
                      {canViewEvidence ? (
                        <button
                          onClick={() => setEvidenceIdx(i)}
                          title={hasEvidence ? "Ver evidencia" : "Ver detalles (paso crítico)"}
                          data-testid={`sup-evidence-${it.id}`}
                          className={`p-2 rounded-lg transition-colors ${hasEvidence ? 'text-blue-600 hover:bg-blue-50' : 'text-red-600 hover:bg-red-50'}`}
                        >
                          {hasEvidence ? <ImageIcon className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                        </button>
                      ) : (
                        <span className="w-8 h-8 inline-block" aria-hidden="true"/>
                      )}
                      <button
                        onClick={() => setDetailsIdx(i)}
                        title="Ver detalles"
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <Info className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>

                  {/* Comentarios + evidencias inline (cuando expandedAll) */}
                  {expandedAll && (it.realizado_comentarios || (stepExec?.evidencias?.length > 0) || stepExec?.evidencia) && (
                    <div className="px-6 pb-4" data-testid={`sup-expanded-${it.id}`}>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                        {it.realizado_comentarios && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 inline-flex items-center gap-1">
                              <MessageSquare className="w-3 h-3"/>Comentarios del operario
                            </p>
                            <p className="text-sm text-slate-700 whitespace-pre-line bg-white border border-slate-100 rounded-lg px-3 py-2">{it.realizado_comentarios}</p>
                          </div>
                        )}
                        {(stepExec?.evidencias?.length > 0 || stepExec?.evidencia) && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 inline-flex items-center gap-1">
                              <ImageIcon className="w-3 h-3"/>Evidencias adjuntas
                              {(stepExec.evidencias?.length || (stepExec.evidencia ? 1 : 0)) > 0 && (
                                <span className="text-slate-400 normal-case font-normal">({stepExec.evidencias?.length || 1})</span>
                              )}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {(stepExec.evidencias?.length > 0
                                ? stepExec.evidencias
                                : [{ data: stepExec.evidencia, nombre: stepExec.evidencia_nombre }]
                              ).map((ev, ix) => (
                                <a key={ix} href={ev.data} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 bg-white hover:opacity-90">
                                  <img src={ev.data} alt={ev.nombre || `evidencia-${ix + 1}`} className="w-full h-24 object-cover"/>
                                  {ev.nombre && <p className="text-[10px] text-slate-500 truncate px-1.5 py-0.5 border-t border-slate-100">{ev.nombre}</p>}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Plan de acción inline */}
                  {failed && (
                    <div className="px-6 pb-4">
                      <div className="bg-white border border-red-200 rounded-xl p-3" data-testid={`sup-plan-${it.id}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700 mb-2 inline-flex items-center gap-1">
                          <FileWarning className="w-3 h-3"/>Plan de acción correctiva
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Field label="Desviación">
                            <textarea
                              data-testid={`sup-plan-desviacion-${it.id}`}
                              value={it.desviacion || ''}
                              onChange={e => handlePlanField(it, 'desviacion', e.target.value)}
                              readOnly={readOnly}
                              rows={2}
                              placeholder="¿Qué se desvió?"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200"
                            />
                          </Field>
                          <Field label="Acción correctiva">
                            <textarea
                              data-testid={`sup-plan-accion-${it.id}`}
                              value={it.accion_correctiva || ''}
                              onChange={e => handlePlanField(it, 'accion_correctiva', e.target.value)}
                              readOnly={readOnly}
                              rows={2}
                              placeholder="¿Qué hacer para corregir?"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200"
                            />
                          </Field>
                          <Field label="Responsable">
                            {readOnly ? (
                              <p className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-slate-50">{it.responsable_nombre || <span className="text-slate-400">—</span>}</p>
                            ) : (
                              <select
                                data-testid={`sup-plan-responsable-${it.id}`}
                                value={it.responsable_id || ''}
                                onChange={e => handleResponsable(it, e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                              >
                                <option value="">— Seleccionar —</option>
                                {staffList.map(s => <option key={s.id} value={s.id}>{s.user_name}</option>)}
                              </select>
                            )}
                          </Field>
                          <Field label="Fecha compromiso">
                            <input
                              type="date"
                              data-testid={`sup-plan-fecha-${it.id}`}
                              value={it.fecha_compromiso || ''}
                              onChange={e => handlePlanField(it, 'fecha_compromiso', e.target.value || null)}
                              readOnly={readOnly}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              </Fragment>
            );
          })}
          {items.length === 0 && (
            <li className="px-6 py-10 text-center text-slate-400 text-sm">Esta ejecución no tenía pasos.</li>
          )}
        </ul>
      </div>

      {/* ---------- EVIDENCE MODAL ---------- */}
      {evidenceItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setEvidenceIdx(null)}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true"/>
          <div className="relative min-h-full flex items-start justify-center p-4 pt-10 pb-10">
            <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Paso {evidenceItem.orden} de {items.length}</p>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    {evidenceStepExec?.evidencia ? <Camera className="w-4 h-4 text-blue-600"/> : <AlertTriangle className="w-4 h-4 text-red-600"/>}
                    {evidenceItem.titulo}
                  </h3>
                </div>
                <button onClick={() => setEvidenceIdx(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
              </div>
              <div className="p-5 space-y-4">
                {evidenceItem.es_critico && (
                  <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"/>
                    <span>Este paso es crítico. Su omisión genera consecuencias según el sistema configurado.</span>
                  </div>
                )}
                {evidenceItem.descripcion && (
                  <div
                    className="ck-content-rendered bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700"
                    dangerouslySetInnerHTML={{ __html: evidenceItem.descripcion }}
                  />
                )}
                {evidenceStepExec?.evidencias?.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">
                      Evidencias adjuntas por el operario ({evidenceStepExec.evidencias.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {evidenceStepExec.evidencias.map((ev, ix) => (
                        <a key={ix} href={ev.data} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 bg-slate-50 hover:opacity-90">
                          <img src={ev.data} alt={ev.nombre || `evidencia-${ix + 1}`} className="w-full h-40 object-cover"/>
                          {ev.nombre && <p className="text-[10px] text-slate-500 truncate px-1.5 py-1 bg-white border-t border-slate-100">{ev.nombre}</p>}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : evidenceStepExec?.evidencia ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Evidencia adjunta por el operario</p>
                    <img src={evidenceStepExec.evidencia} alt="evidencia" className="w-full max-h-96 object-contain rounded-lg border border-slate-200 bg-slate-50"/>
                    <p className="text-xs text-slate-500 truncate">{evidenceStepExec.evidencia_nombre}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic bg-slate-50 border border-slate-100 rounded-xl p-3">
                    Este paso no tiene evidencia adjunta.
                  </p>
                )}
                {evidenceStepExec?.comentarios && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Comentarios del operario</p>
                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 whitespace-pre-line">{evidenceStepExec.comentarios}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
                <button onClick={() => setEvidenceIdx(null)} className="text-sm px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- DETAILS MODAL ---------- */}
      {detailsItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setDetailsIdx(null)}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true"/>
          <div className="relative min-h-full flex items-start justify-center p-4 pt-10 pb-10">
            <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md my-8">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Paso {detailsItem.orden} de {items.length}</p>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500"/>Detalles del paso
                  </h3>
                </div>
                <button onClick={() => setDetailsIdx(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Nombre</p>
                  <p className="text-sm font-medium text-slate-900">{detailsItem.titulo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Descripción</p>
                  {detailsItem.descripcion ? (
                    <div className="ck-content-rendered text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: detailsItem.descripcion }}/>
                  ) : (
                    <p className="text-sm text-slate-400 italic">— sin descripción —</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Puntos</p>
                    <p className="text-base font-semibold text-slate-900">{detailsItem.puntos}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Realizado</p>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${REALIZADO[detailsItem.realizado_estado].tag}`}>
                      {REALIZADO[detailsItem.realizado_estado].label}
                    </span>
                  </div>
                </div>
                {detailsItem.es_critico && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3 h-3"/>Paso crítico
                  </span>
                )}
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
                <button onClick={() => setDetailsIdx(null)} className="text-sm px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Checkbox({ value, onChange, readOnly, testid }) {
  const base = "inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer transition-colors min-w-[40px]";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange(true)}
        data-testid={`${testid}-yes`}
        className={`${base} ${value === true ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200'}`}
      >
        Sí
      </button>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange(false)}
        data-testid={`${testid}-no`}
        className={`${base} ${value === false ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200'}`}
      >
        No
      </button>
    </div>
  );
}
