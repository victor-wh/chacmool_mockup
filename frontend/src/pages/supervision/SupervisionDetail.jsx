import { useEffect, useState, useCallback, Fragment, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, ShieldCheck, ShieldX, CheckCircle2, Save,
  AlertTriangle, FileWarning, Trash2,
} from 'lucide-react';
import { supervisionAPI } from '../../services/supervisionApi';
import { processAPI } from '../../services/processApi';

const REALIZADO_LBL = {
  0: { lbl: 'Pendiente', cls: 'bg-slate-100 text-slate-600' },
  1: { lbl: 'En progreso', cls: 'bg-amber-100 text-amber-700' },
  2: { lbl: 'Completado', cls: 'bg-emerald-100 text-emerald-700' },
  3: { lbl: 'Error', cls: 'bg-red-100 text-red-700' },
};

export default function SupervisionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sup, setSup] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const debounceRef = useRef({});

  const load = useCallback(async () => {
    try {
      const d = await supervisionAPI.get(id);
      setSup(d);
      setItems(d.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    (async () => {
      try { setStaffList(await processAPI.listStaff()); } catch (e) {}
    })();
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
      // refrescar header (puntaje, items_evaluados)
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
    const v = item.cumplido === value ? null : value; // doble click → reset
    patchItem(item.id, { cumplido: v, ...(v === true ? { desviacion: '', accion_correctiva: '', responsable_id: null, responsable_nombre: '', fecha_compromiso: null } : {}) });
    await saveItem(item.id, { cumplido: v });
  };

  const handlePlanField = (item, field, value) => {
    if (readOnly) return;
    patchItem(item.id, { [field]: value });
    // debounce save
    const key = `${item.id}:${field}`;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      saveItem(item.id, { [field]: value });
    }, 600);
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
    if (!window.confirm(`¿Eliminar ${sup.codigo}? Esta acción no se puede deshacer.`)) return;
    try {
      await supervisionAPI.remove(id);
      navigate('/supervision');
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div className="text-slate-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Cargando…</div>;
  if (!sup) return <div className="text-slate-500">Supervisión no encontrada</div>;

  return (
    <div className="animate-fade-in" data-testid="supervision-detail-page">
      <button onClick={() => navigate('/supervision')} className="text-sm text-slate-500 hover:text-slate-900 mb-3 inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4"/>Volver al listado
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-slate-400">{sup.codigo}</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{sup.proceso_codigo}</span>
              {sup.area_nombre && <span className="text-[10px] text-slate-500">· {sup.area_nombre}</span>}
            </div>
            <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              {sup.proceso_nombre}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 mt-2">
              <span>Auditor: <strong className="text-slate-700">{sup.auditor_nombre}</strong></span>
              <span>Empleado evaluado: <strong className="text-slate-700">{sup.evaluado_nombre || '—'}</strong></span>
              <span>Ejecución: <strong className="text-slate-700 font-mono text-[11px]">{sup.ejecucion_codigo}</strong></span>
              <span>Fecha: <strong className="text-slate-700">{sup.fecha}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Calificación</p>
              <p className="text-2xl font-bold text-slate-900 leading-none mt-0.5" data-testid="supervision-pct">
                {sup.porcentaje}<span className="text-base text-slate-400">%</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {sup.puntaje_obtenido}/{sup.puntaje_total} pts · {sup.items_evaluados}/{sup.items_total} evaluados
              </p>
            </div>
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

        {/* Resultado banner cuando está completada */}
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
            <Save className="w-3 h-3 animate-pulse"/>Guardando…
          </p>
        )}
      </div>

      {/* Tabla principal */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase font-semibold tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left">Actividad</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-center w-32">Realizado</th>
              <th className="px-3 py-2 text-center w-16">Pts</th>
              <th className="px-3 py-2 text-center w-32">¿Cumple?</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => {
              const realMeta = REALIZADO_LBL[it.realizado_estado] || REALIZADO_LBL[0];
              const failed = it.cumplido === false;
              return (
                <Fragment key={it.id}>
                  <tr className={`border-t border-slate-100 ${failed ? 'bg-red-50/40' : ''}`} data-testid={`sup-row-${it.id}`}>
                    <td className="px-3 py-2.5 align-top text-slate-500 font-mono text-xs">{it.orden}</td>
                    <td className="px-3 py-2.5 align-top">
                      <p className="font-medium text-slate-800">{it.titulo}</p>
                      {it.es_critico && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold uppercase text-red-600">
                          <AlertTriangle className="w-3 h-3"/>Crítico
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top text-xs text-slate-600 max-w-[280px]">
                      <div className="line-clamp-3 whitespace-pre-wrap">{it.descripcion || <span className="text-slate-400">—</span>}</div>
                      {it.realizado_comentarios && (
                        <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2">"{it.realizado_comentarios}"</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top text-center">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${realMeta.cls}`}>
                        {realMeta.lbl}
                      </span>
                      {it.realizado_evidencia_nombre && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">📎 {it.realizado_evidencia_nombre}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top text-center text-slate-700 font-medium">{it.puntos}</td>
                    <td className="px-3 py-2.5 align-top text-center">
                      <Checkbox
                        value={it.cumplido}
                        readOnly={readOnly}
                        onChange={(v) => handleCumplido(it, v)}
                        testid={`sup-check-${it.id}`}
                      />
                    </td>
                  </tr>
                  {failed && (
                    <tr className="bg-red-50/40 border-t-0">
                      <td colSpan={6} className="px-3 pb-4 pt-1">
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
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-slate-400 py-10">Esta ejecución no tenía pasos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
  // value: true | false | null
  const base = "flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors";
  return (
    <div className="flex items-center gap-1.5">
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
