import { useEffect, useState, useCallback, Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auditAPI } from '../../services/auditApi';
import { processAPI } from '../../services/processApi';
import {
  Loader2, ArrowLeft, Save, Plus, Trash2, Pencil, Check, X,
  ClipboardCheck, ListChecks, AlertTriangle, Image as ImageIcon,
  ShieldCheck, ShieldX
} from 'lucide-react';
import AuditCorrectivePlan from './AuditCorrectivePlan';

const STATE = {
  borrador:    { label: 'Borrador',    cls: 'bg-slate-100 text-slate-700' },
  en_progreso: { label: 'En progreso', cls: 'bg-blue-50 text-blue-700' },
  completada:  { label: 'Completada',  cls: 'bg-green-50 text-green-700' },
};

export default function AuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [items, setItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStepPicker, setShowStepPicker] = useState(false);
  const [selectedStepIds, setSelectedStepIds] = useState({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ titulo: '', descripcion: '', puntos: 1 });
  const [busyId, setBusyId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ titulo: '', descripcion: '', puntos: 1 });
  const [evidenceModalIdx, setEvidenceModalIdx] = useState(null);

  const load = useCallback(async () => {
    try {
      const a = await auditAPI.get(id);
      setAudit(a);
      const its = await auditAPI.listItems(id);
      setItems(its || []);
      const st = await processAPI.listStaff().catch(() => []);
      setStaffList(st || []);
      if (a.modo === 'pasos' && !a.es_supervision) {
        const s = await processAPI.listSteps(a.proceso_id);
        setSteps(s || []);
        const map = {};
        (its || []).forEach(it => { if (it.paso_id) map[it.paso_id] = true; });
        setSelectedStepIds(map);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const readOnly = audit?.estado === 'completada';

  const importSelectedSteps = async () => {
    const ids = Object.entries(selectedStepIds).filter(([_, v]) => v).map(([k]) => k);
    if (ids.length === 0) { alert('Selecciona al menos un paso'); return; }
    try {
      await auditAPI.createItemsFromSteps(id, ids);
      setShowStepPicker(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const addCustomItem = async () => {
    if (!customForm.titulo.trim()) { alert('Título requerido'); return; }
    try {
      await auditAPI.createItem(id, {
        titulo: customForm.titulo,
        descripcion: customForm.descripcion,
        puntos: parseInt(customForm.puntos, 10) || 1,
        origen: 'custom',
      });
      setCustomForm({ titulo: '', descripcion: '', puntos: 1 });
      setShowCustomForm(false);
      load();
    } catch (e) { alert(e.message); }
  };

  const setCumplido = async (item, value) => {
    setBusyId(item.id);
    try {
      await auditAPI.updateItem(id, item.id, { cumplido: value });
      await load();
    } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  const updateField = async (item_id, patch) => {
    try {
      await auditAPI.updateItem(id, item_id, patch);
      // optimistic refresh
      setItems(prev => prev.map(it => it.id === item_id ? { ...it, ...patch } : it));
    } catch (e) { alert(e.message); }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.titulo}"?`)) return;
    try {
      await auditAPI.deleteItem(id, item.id);
      load();
    } catch (e) { alert(e.message); }
  };

  const startEdit = (it) => {
    setEditingItemId(it.id);
    setEditForm({ titulo: it.titulo, descripcion: it.descripcion || '', puntos: it.puntos });
  };

  const saveEdit = async () => {
    try {
      await auditAPI.updateItem(id, editingItemId, {
        titulo: editForm.titulo,
        descripcion: editForm.descripcion,
        puntos: parseInt(editForm.puntos, 10) || 1,
      });
      setEditingItemId(null);
      load();
    } catch (e) { alert(e.message); }
  };

  const finalize = async () => {
    if (items.length === 0) { alert('Agrega al menos un punto a evaluar'); return; }
    const pendientes = items.filter(i => i.cumplido === null || i.cumplido === undefined);
    if (pendientes.length > 0) {
      if (!window.confirm(`Quedan ${pendientes.length} ítem(s) sin marcar. ¿Finalizar de todos modos?`)) return;
    } else {
      if (!window.confirm('¿Finalizar y completar la auditoría?')) return;
    }
    try {
      await auditAPI.update(id, { estado: 'completada' });
      load();
    } catch (e) { alert(e.message); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando auditoría...</div>;
  }
  if (!audit) {
    return <div className="text-slate-500">Auditoría no encontrada</div>;
  }

  const st = STATE[audit.estado] || STATE.borrador;

  return (
    <div className="animate-fade-in max-w-5xl" data-testid="audit-detail-page">
      <button onClick={() => navigate('/audits')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4"/>Volver al listado
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="w-5 h-5"/>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-slate-400">{audit.codigo}</p>
              <h1 className="text-xl font-semibold text-slate-900 truncate" style={{ fontFamily: 'Outfit' }}>{audit.proceso_nombre}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${audit.tipo === 'presencial' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'}`}>
                  {audit.tipo === 'presencial' ? 'Presencial' : 'Histórica'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {audit.modo === 'pasos' ? 'Pasos del proceso' : 'Puntos custom'}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-semibold uppercase ${st.cls}`}>{st.label}</span>
                <span className="text-slate-500">Evaluador: <strong className="text-slate-700">{audit.evaluador_nombre}</strong></span>
                <span className="text-slate-500">Evaluado: <strong className="text-slate-700">{audit.evaluado_nombre || '—'}</strong></span>
                <span className="text-slate-500">{audit.fecha} · {audit.hora_inicio}{audit.hora_fin ? ` → ${audit.hora_fin}` : ''}</span>
                {audit.ejecucion_codigo && <span className="text-slate-500">Ejecución: <strong className="text-slate-700">{audit.ejecucion_codigo}</strong></span>}
              </div>
            </div>
          </div>
          {/* Score */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400">Puntaje</p>
            <p className="text-2xl font-bold text-slate-900">{audit.puntos_obtenidos}<span className="text-base text-slate-400">/{audit.total_puntos}</span></p>
            <p className="text-xs text-slate-500">{audit.porcentaje}% · {audit.items_evaluados}/{audit.total_items} evaluados</p>
            {audit.criticos_omitidos > 0 && (
              <p className="text-xs text-red-600 font-semibold mt-1 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3"/>{audit.criticos_omitidos} crítico(s) omitido(s)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Aprobada/Reprobada banner cuando está completada */}
      {audit.estado === 'completada' && audit.aprobada !== null && audit.aprobada !== undefined && (
        <div
          className={`rounded-2xl p-4 mb-4 border flex items-center gap-3 ${
            audit.aprobada
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
          data-testid="audit-result-banner"
        >
          {audit.aprobada
            ? <ShieldCheck className="w-8 h-8 text-green-600"/>
            : <ShieldX className="w-8 h-8 text-red-600"/>}
          <div className="flex-1">
            <p className="text-lg font-bold uppercase tracking-wide">{audit.aprobada ? 'Aprobada' : 'Reprobada'}</p>
            <p className="text-xs opacity-80">
              {audit.aprobada
                ? `Cumplimiento ${audit.porcentaje}% (≥70%) y sin pasos críticos omitidos.`
                : audit.porcentaje < 70
                  ? `Cumplimiento ${audit.porcentaje}% por debajo del 70% requerido${audit.criticos_omitidos > 0 ? ` · ${audit.criticos_omitidos} crítico(s) omitido(s)` : ''}.`
                  : `${audit.criticos_omitidos} paso(s) crítico(s) omitido(s) — automatic fail.`}
            </p>
          </div>
        </div>
      )}

      {/* Plan Maestro de Acción Correctiva — sólo si la auditoría está reprobando o tiene críticos omitidos */}
      {audit.items_evaluados > 0 && (audit.porcentaje <= 70 || audit.criticos_omitidos > 0) && (
        <AuditCorrectivePlan
          audit={audit}
          staffList={staffList}
          readOnly={readOnly}
          onSaved={(updated) => setAudit(prev => ({ ...prev, plan_correctivo: updated }))}
        />
      )}

      {/* Items table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
        <div className="bg-emerald-100 border-b border-emerald-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-700"/>
            <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider">Puntos a evaluar</h2>
          </div>
          {!readOnly && !audit.es_supervision && (
            <div className="flex gap-2">
              {audit.modo === 'pasos' && (
                <button onClick={() => setShowStepPicker(true)} data-testid="audit-pick-steps-btn" className="text-xs bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3"/>Importar pasos
                </button>
              )}
              {audit.modo === 'puntos' && (
                <button onClick={() => setShowCustomForm(true)} data-testid="audit-add-custom-btn" className="text-xs bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3"/>Agregar punto
                </button>
              )}
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-emerald-500 text-white">
            <tr>
              <th className="text-left text-[10px] font-semibold uppercase px-2 py-2 w-10">#</th>
              <th className="text-left text-[10px] font-semibold uppercase px-2 py-2">Actividad</th>
              <th className="text-left text-[10px] font-semibold uppercase px-2 py-2">Descripción</th>
              <th className="text-center text-[10px] font-semibold uppercase px-2 py-2 w-16">Evid.</th>
              <th className="text-center text-[10px] font-semibold uppercase px-2 py-2 w-14">Pts</th>
              <th className="text-center text-[10px] font-semibold uppercase px-2 py-2 w-28">Realizado<br/><span className="text-[9px] font-normal opacity-90">(operario)</span></th>
              <th className="text-center text-[10px] font-semibold uppercase px-2 py-2 w-32">Confirmado<br/><span className="text-[9px] font-normal opacity-90">por auditor</span></th>
              {!readOnly && <th className="px-2 py-2 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={readOnly ? 7 : 8} className="text-center py-12 text-slate-400">
                <ListChecks className="w-10 h-10 mx-auto mb-2 text-slate-300"/>
                {audit.es_supervision
                  ? 'Esta supervisión no tiene pasos auditables registrados.'
                  : audit.modo === 'pasos' ? 'Importa pasos del proceso para evaluarlos' : 'Agrega los puntos que deseas evaluar'}
              </td></tr>
            )}
            {items.map((it, idx) => {
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30';
              const isEditing = editingItemId === it.id;
              const showPlan = it.cumplido === false; // dinámico: solo si auditor marca No
              const reportadoChip = it.realizado_reportado === true
                ? { txt: 'Sí', cls: 'bg-green-100 text-green-700' }
                : it.realizado_reportado === false
                  ? { txt: 'No', cls: 'bg-red-100 text-red-700' }
                  : { txt: '—', cls: 'bg-slate-100 text-slate-400' };
              return (
                <Fragment key={it.id}>
                  <tr className={`${rowBg} border-b border-emerald-100 align-top`} data-testid={`audit-item-${it.id}`}>
                    <td className="px-2 py-2 text-center text-xs font-semibold text-slate-700">{it.orden}</td>
                    {isEditing ? (
                      <>
                        <td className="px-2 py-2"><input value={editForm.titulo} onChange={e => setEditForm({ ...editForm, titulo: e.target.value })} className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs"/></td>
                        <td className="px-2 py-2"><input value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs"/></td>
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2 text-center"><input type="number" min={1} value={editForm.puntos} onChange={e => setEditForm({ ...editForm, puntos: e.target.value })} className="w-12 border border-slate-200 rounded px-1 py-1 text-xs text-center"/></td>
                        <td className="px-2 py-2"></td><td className="px-2 py-2"></td>
                        {!readOnly && (
                          <td className="px-2 py-2"><div className="flex justify-end gap-1">
                            <button onClick={saveEdit} className="p-1 hover:bg-emerald-100 rounded text-emerald-700"><Check className="w-3.5 h-3.5"/></button>
                            <button onClick={() => setEditingItemId(null)} className="p-1 hover:bg-slate-100 rounded text-slate-600"><X className="w-3.5 h-3.5"/></button>
                          </div></td>
                        )}
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2">
                          <p className="text-xs font-medium text-slate-900">{it.titulo}</p>
                          {it.es_critico && <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-semibold px-1 rounded bg-red-50 text-red-700"><AlertTriangle className="w-2.5 h-2.5"/>Crítico</span>}
                        </td>
                        <td className="px-2 py-2 text-xs text-slate-600 max-w-xs">
                          {it.descripcion ? (
                            <span dangerouslySetInnerHTML={{ __html: it.descripcion }} className="ck-content-rendered line-clamp-2 block"/>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {it.evidencia ? (
                            <button onClick={() => setEvidenceModalIdx(idx)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs" title="Ver evidencia"><ImageIcon className="w-3.5 h-3.5"/></button>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center text-xs font-semibold text-slate-700">{it.puntos}</td>

                        {/* Realizado (operario) — informativo */}
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${reportadoChip.cls}`}>
                            {reportadoChip.txt}
                          </span>
                        </td>

                        {/* Confirmado (auditor) — input */}
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {!readOnly ? (
                              <>
                                <button
                                  disabled={busyId === it.id}
                                  onClick={() => setCumplido(it, true)}
                                  data-testid={`audit-item-${it.id}-yes`}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${it.cumplido === true ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
                                >Sí</button>
                                <button
                                  disabled={busyId === it.id}
                                  onClick={() => setCumplido(it, false)}
                                  data-testid={`audit-item-${it.id}-no`}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${it.cumplido === false ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                                >No</button>
                              </>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${it.cumplido === true ? 'bg-green-100 text-green-700' : it.cumplido === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                {it.cumplido === true ? 'Sí' : it.cumplido === false ? 'No' : '—'}
                              </span>
                            )}
                          </div>
                          {(it.cumplido === true || it.cumplido === false) && (
                            <p className="text-[10px] text-center text-slate-400 mt-0.5">{it.puntos_obtenidos} pts</p>
                          )}
                        </td>

                        {!readOnly && (
                          <td className="px-2 py-2">
                            <div className="flex justify-end gap-0.5">
                              <button onClick={() => startEdit(it)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Pencil className="w-3 h-3"/></button>
                              <button onClick={() => deleteItem(it)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3 h-3"/></button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>

                  {/* Plan de acción dinámico — solo si auditor marcó "No" */}
                  {showPlan && !isEditing && (
                    <tr className={`${rowBg} border-b border-amber-200`} data-testid={`audit-item-${it.id}-plan`}>
                      <td colSpan={readOnly ? 7 : 8} className="px-4 py-4 bg-amber-50/40">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Plan de acción correctiva</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Desviación detectada</label>
                            {readOnly ? (
                              <p className="text-xs text-slate-700 min-h-[40px] bg-white rounded-lg p-2 border border-slate-200">{it.desviacion || <span className="text-slate-300">—</span>}</p>
                            ) : (
                              <textarea
                                key={`des-${it.id}`}
                                defaultValue={it.desviacion || ''}
                                onBlur={e => e.target.value !== (it.desviacion || '') && updateField(it.id, { desviacion: e.target.value })}
                                rows={2} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs resize-y" placeholder="Describe qué falló..."
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Acción correctiva</label>
                            {readOnly ? (
                              <p className="text-xs text-slate-700 min-h-[40px] bg-white rounded-lg p-2 border border-slate-200">{it.accion_correctiva || <span className="text-slate-300">—</span>}</p>
                            ) : (
                              <textarea
                                key={`acc-${it.id}`}
                                defaultValue={it.accion_correctiva || ''}
                                onBlur={e => e.target.value !== (it.accion_correctiva || '') && updateField(it.id, { accion_correctiva: e.target.value })}
                                rows={2} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs resize-y" placeholder="Cómo se va a corregir..."
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Responsable</label>
                            {readOnly ? (
                              <p className="text-xs text-slate-700 bg-white rounded-lg p-2 border border-slate-200">{it.responsable_nombre || <span className="text-slate-300">—</span>}</p>
                            ) : (
                              <select
                                value={it.responsable_id || ''}
                                onChange={e => updateField(it.id, { responsable_id: e.target.value || null })}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                              >
                                <option value="">— Selecciona responsable —</option>
                                {staffList.map(s => <option key={s.id} value={s.id}>{s.user_name}</option>)}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fecha compromiso</label>
                            {readOnly ? (
                              <p className="text-xs text-slate-700 bg-white rounded-lg p-2 border border-slate-200">{it.fecha_compromiso || <span className="text-slate-300">—</span>}</p>
                            ) : (
                              <input type="date"
                                key={`fec-${it.id}`}
                                defaultValue={it.fecha_compromiso || ''}
                                onChange={e => updateField(it.id, { fecha_compromiso: e.target.value || null })}
                                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"/>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Evidence preview modal */}
      {evidenceModalIdx !== null && items[evidenceModalIdx]?.evidencia && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEvidenceModalIdx(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 truncate">Evidencia · {items[evidenceModalIdx].titulo}</h3>
              <button onClick={() => setEvidenceModalIdx(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto bg-slate-50">
              <img src={items[evidenceModalIdx].evidencia} alt="Evidencia" className="max-w-full h-auto rounded-lg mx-auto"/>
            </div>
          </div>
        </div>
      )}

      {/* Action footer */}
      {!readOnly && items.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={finalize}
            data-testid="audit-finalize-btn"
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-5 py-2.5 font-semibold flex items-center gap-2"
          >
            <Save className="w-4 h-4"/>Finalizar auditoría
          </button>
        </div>
      )}

      {/* Step picker modal */}
      {showStepPicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowStepPicker(false)}>
          <div className="relative min-h-full flex items-start justify-center p-4 pt-10 pb-10" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Importar pasos del proceso</h3>
                <button onClick={() => setShowStepPicker(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {steps.length === 0 ? (
                  <p className="text-sm text-slate-500">El proceso no tiene pasos definidos.</p>
                ) : steps.map(s => (
                  <label key={s.id} className="flex items-start gap-3 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-2">
                    <input
                      type="checkbox"
                      checked={!!selectedStepIds[s.id]}
                      onChange={e => setSelectedStepIds(m => ({ ...m, [s.id]: e.target.checked }))}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{s.orden}. {s.nombre}</p>
                      <p className="text-xs text-slate-500">{s.puntos} pts · {s.requiere_evidencia ? 'requiere evidencia' : 'sin evidencia'}{s.es_critico ? ' · crítico' : ''}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500"/>Reemplazará los pasos previamente importados.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowStepPicker(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
                  <button onClick={importSelectedSteps} data-testid="audit-import-steps-confirm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-1.5 text-sm font-medium">Importar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom item form modal */}
      {showCustomForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCustomForm(false)}>
          <div className="relative min-h-full flex items-start justify-center p-4 pt-10 pb-10" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Agregar punto a evaluar</h3>
                <button onClick={() => setShowCustomForm(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                  <input
                    value={customForm.titulo}
                    onChange={e => setCustomForm({ ...customForm, titulo: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea
                    value={customForm.descripcion}
                    onChange={e => setCustomForm({ ...customForm, descripcion: e.target.value })}
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Puntos *</label>
                  <input
                    type="number" min={1}
                    value={customForm.puntos}
                    onChange={e => setCustomForm({ ...customForm, puntos: e.target.value })}
                    className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setShowCustomForm(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancelar</button>
                <button onClick={addCustomItem} data-testid="audit-add-custom-confirm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-1.5 text-sm font-medium">Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
