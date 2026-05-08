import { useState, useEffect, useRef } from 'react';
import {
  AlertOctagon, Search, ListChecks, ClipboardList,
  Calendar, Target, ShieldCheck, ChevronDown, ChevronUp, Save,
} from 'lucide-react';
import { auditAPI } from '../../services/auditApi';

const EMPTY = {
  descripcion_desviacion: '',
  causa_raiz: { porque_1: '', porque_2: '', porque_3: '', porque_4: '', porque_5: '', resultado: '' },
  accion_correctiva: '',
  plan_implementacion: { que: '', quien_id: '', quien_nombre: '', cuando: '', como_validar: '' },
  resultado_esperado: '',
  evaluacion_eficacia: { fecha_verificacion: '', evidencias: '', problema_recurrio: null, comentarios: '' },
};

function deepMerge(base, patch) {
  if (!patch) return base;
  const out = { ...base };
  Object.keys(patch).forEach(k => {
    if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) {
      out[k] = { ...(base[k] || {}), ...patch[k] };
    } else {
      out[k] = patch[k];
    }
  });
  return out;
}

export default function AuditCorrectivePlan({ audit, staffList, readOnly, onSaved }) {
  const [open, setOpen] = useState(true);
  const [plan, setPlan] = useState(deepMerge(EMPTY, audit.plan_correctivo));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setPlan(deepMerge(EMPTY, audit.plan_correctivo));
  }, [audit.id, audit.plan_correctivo]);

  const persist = async (next) => {
    if (readOnly) return;
    setSaving(true);
    try {
      const updated = await auditAPI.updatePlanCorrectivo(audit.id, next);
      setSavedAt(new Date());
      if (onSaved) onSaved(updated);
    } catch (e) {
      // fallback: alert al usuario
      // eslint-disable-next-line no-alert
      alert(`No se pudo guardar el plan correctivo: ${e.message}`);
    }
    setSaving(false);
  };

  const setField = (path, value) => {
    setPlan(prev => {
      const next = { ...prev };
      if (path.length === 1) {
        next[path[0]] = value;
      } else {
        next[path[0]] = { ...(prev[path[0]] || {}), [path[1]]: value };
      }
      // debounced persist
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (path.length === 1) {
          persist({ [path[0]]: value });
        } else {
          persist({ [path[0]]: { ...(prev[path[0]] || {}), [path[1]]: value } });
        }
      }, 600);
      return next;
    });
  };

  const motivos = [];
  if ((audit.porcentaje || 0) <= 70) motivos.push(`cumplimiento ${audit.porcentaje}% ≤ 70%`);
  if ((audit.criticos_omitidos || 0) > 0) motivos.push(`${audit.criticos_omitidos} crítico(s) omitido(s)`);

  return (
    <div
      className="bg-white border-2 border-red-300 rounded-2xl mb-4 overflow-hidden shadow-sm"
      data-testid="audit-corrective-plan"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-gradient-to-r from-red-50 via-red-50 to-amber-50 px-5 py-3 flex items-center justify-between gap-3 hover:from-red-100 transition-colors"
        data-testid="audit-corrective-plan-toggle"
      >
        <div className="flex items-center gap-3 text-left">
          <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-red-800">
              Plan maestro de acción correctiva
            </p>
            <p className="text-[11px] text-red-600/80">
              Requerido por: {motivos.join(' · ') || 'auditoría reprobada'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-red-700">
          {saving && <span className="text-amber-700">Guardando…</span>}
          {!saving && savedAt && <span className="text-emerald-700">Guardado</span>}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="p-5 space-y-5">
          {/* 1. Descripción de la desviación */}
          <Section icon={<Search className="w-4 h-4" />} index="1" title="Describe la desviación o hallazgo">
            <Textarea
              testid="cp-desviacion"
              value={plan.descripcion_desviacion}
              readOnly={readOnly}
              placeholder='Sé específico. Ej: "Se detectó que 4 cotizaciones fueron enviadas al cliente sin autorización del supervisor."'
              onChange={v => setField(['descripcion_desviacion'], v)}
              rows={3}
            />
          </Section>

          {/* 2. Causa raíz - 5 porqués */}
          <Section icon={<ListChecks className="w-4 h-4" />} index="2" title="Investiga la causa raíz (5 Porqués)">
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <input
                    type="text"
                    data-testid={`cp-porque-${n}`}
                    value={plan.causa_raiz[`porque_${n}`] || ''}
                    onChange={e => setField(['causa_raiz', `porque_${n}`], e.target.value)}
                    readOnly={readOnly}
                    placeholder={`¿Por qué ${n === 1 ? 'ocurrió la desviación' : 'pasó eso'}?`}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-red-300 focus:ring-1 focus:ring-red-200"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                Causa raíz identificada
              </label>
              <Textarea
                testid="cp-causa-raiz-resultado"
                value={plan.causa_raiz.resultado}
                onChange={v => setField(['causa_raiz', 'resultado'], v)}
                readOnly={readOnly}
                placeholder='Ej: "Falta de capacitación y proceso mal comunicado."'
                rows={2}
              />
            </div>
          </Section>

          {/* 3. Acción correctiva */}
          <Section icon={<Target className="w-4 h-4" />} index="3" title="Acción correctiva (elimina la causa)">
            <Textarea
              testid="cp-accion-correctiva"
              value={plan.accion_correctiva}
              onChange={v => setField(['accion_correctiva'], v)}
              readOnly={readOnly}
              placeholder='No corrijas solo el error puntual, corrige lo que lo generó. Ej: "Establecer procedimiento formal, capacitar al personal y crear checklist con firma del supervisor."'
              rows={3}
            />
          </Section>

          {/* 4. Plan de implementación */}
          <Section icon={<ClipboardList className="w-4 h-4" />} index="4" title="Plan de implementación">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="¿Qué se hará?">
                <Textarea
                  testid="cp-plan-que"
                  value={plan.plan_implementacion.que}
                  onChange={v => setField(['plan_implementacion', 'que'], v)}
                  readOnly={readOnly}
                  rows={2}
                  placeholder='Ej: "Crear instructivo y formato de validación."'
                />
              </Field>
              <Field label="¿Quién lo hará? (Responsable)">
                {readOnly ? (
                  <p className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
                    {plan.plan_implementacion.quien_nombre || <span className="text-slate-400">—</span>}
                  </p>
                ) : (
                  <select
                    data-testid="cp-plan-quien"
                    value={plan.plan_implementacion.quien_id || ''}
                    onChange={e => setField(['plan_implementacion', 'quien_id'], e.target.value || null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">— Selecciona responsable —</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.user_name}</option>)}
                  </select>
                )}
              </Field>
              <Field label="¿Cuándo se hará?">
                <input
                  type="date"
                  data-testid="cp-plan-cuando"
                  value={plan.plan_implementacion.cuando || ''}
                  onChange={e => setField(['plan_implementacion', 'cuando'], e.target.value || null)}
                  readOnly={readOnly}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
              <Field label="¿Cómo se validará?">
                <Textarea
                  testid="cp-plan-como"
                  value={plan.plan_implementacion.como_validar}
                  onChange={v => setField(['plan_implementacion', 'como_validar'], v)}
                  readOnly={readOnly}
                  rows={2}
                  placeholder='Ej: "Revisión por auditor interno y prueba con 5 usuarios."'
                />
              </Field>
            </div>
          </Section>

          {/* 5. Resultado esperado */}
          <Section icon={<ShieldCheck className="w-4 h-4" />} index="5" title="Resultado esperado">
            <Textarea
              testid="cp-resultado-esperado"
              value={plan.resultado_esperado}
              onChange={v => setField(['resultado_esperado'], v)}
              readOnly={readOnly}
              placeholder='Ej: "0% de cotizaciones sin aprobación en próxima auditoría."'
              rows={2}
            />
          </Section>

          {/* 6. Evaluación de eficacia */}
          <Section icon={<Calendar className="w-4 h-4" />} index="6" title="Evaluación de eficacia (seguimiento)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Fecha de verificación">
                <input
                  type="date"
                  data-testid="cp-eval-fecha"
                  value={plan.evaluacion_eficacia.fecha_verificacion || ''}
                  onChange={e => setField(['evaluacion_eficacia', 'fecha_verificacion'], e.target.value || null)}
                  readOnly={readOnly}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </Field>
              <Field label="¿El problema volvió a ocurrir?">
                <div className="flex gap-2">
                  {[
                    { v: false, lbl: 'No (eficaz)', cls: 'green' },
                    { v: true,  lbl: 'Sí (recurrente)', cls: 'red' },
                    { v: null,  lbl: 'Sin verificar', cls: 'slate' },
                  ].map(opt => {
                    const active = plan.evaluacion_eficacia.problema_recurrio === opt.v;
                    return (
                      <button
                        key={String(opt.v)}
                        type="button"
                        disabled={readOnly}
                        onClick={() => setField(['evaluacion_eficacia', 'problema_recurrio'], opt.v)}
                        data-testid={`cp-eval-recurrio-${opt.v === null ? 'null' : opt.v}`}
                        className={`flex-1 px-2 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          active
                            ? opt.cls === 'green'
                              ? 'bg-green-500 border-green-500 text-white'
                              : opt.cls === 'red'
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-slate-500 border-slate-500 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.lbl}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div className="md:col-span-2">
                <Field label="Evidencias documentadas">
                  <Textarea
                    testid="cp-eval-evidencias"
                    value={plan.evaluacion_eficacia.evidencias}
                    onChange={v => setField(['evaluacion_eficacia', 'evidencias'], v)}
                    readOnly={readOnly}
                    rows={2}
                    placeholder="Listas de verificación, capturas, indicadores, links a archivos…"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Comentarios adicionales">
                  <Textarea
                    testid="cp-eval-comentarios"
                    value={plan.evaluacion_eficacia.comentarios}
                    onChange={v => setField(['evaluacion_eficacia', 'comentarios'], v)}
                    readOnly={readOnly}
                    rows={2}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {!readOnly && (
            <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <Save className="w-3 h-3" />
              <span>Los cambios se guardan automáticamente.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, index, title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <header className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
          {index}
        </span>
        <span className="text-red-600">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
          {title}
        </h3>
      </header>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function Textarea({ value, onChange, rows = 2, placeholder, readOnly, testid }) {
  if (readOnly) {
    return (
      <p className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 whitespace-pre-wrap min-h-[44px]">
        {value || <span className="text-slate-400">—</span>}
      </p>
    );
  }
  return (
    <textarea
      data-testid={testid}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y focus:border-red-300 focus:ring-1 focus:ring-red-200"
    />
  );
}
