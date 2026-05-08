import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auditAPI } from '../../services/auditApi';
import { processAPI } from '../../services/processApi';
import {
  Loader2, ArrowLeft, Save, Plus, Trash2, Pencil, Check, X,
  ClipboardCheck, ListChecks, AlertTriangle
} from 'lucide-react';

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
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStepPicker, setShowStepPicker] = useState(false);
  const [selectedStepIds, setSelectedStepIds] = useState({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ titulo: '', descripcion: '', puntos: 1 });
  const [busyId, setBusyId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ titulo: '', descripcion: '', puntos: 1 });

  const load = useCallback(async () => {
    try {
      const a = await auditAPI.get(id);
      setAudit(a);
      const its = await auditAPI.listItems(id);
      setItems(its || []);
      if (a.modo === 'pasos') {
        const s = await processAPI.listSteps(a.proceso_id);
        setSteps(s || []);
        // Pre-mark already imported steps
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
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
        <div className="bg-emerald-100 border-b border-emerald-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-700"/>
            <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider">Puntos a evaluar</h2>
          </div>
          {!readOnly && (
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

        <table className="w-full">
          <thead className="bg-emerald-500 text-white">
            <tr>
              <th className="text-left text-xs font-semibold uppercase px-4 py-2 w-16">Paso</th>
              <th className="text-left text-xs font-semibold uppercase px-4 py-2">Título</th>
              <th className="text-left text-xs font-semibold uppercase px-4 py-2">Descripción</th>
              <th className="text-center text-xs font-semibold uppercase px-4 py-2 w-24">Puntos</th>
              <th className="text-center text-xs font-semibold uppercase px-4 py-2 w-44">Realizado correctamente</th>
              {!readOnly && <th className="px-4 py-2 w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={readOnly ? 5 : 6} className="text-center py-12 text-slate-400">
                <ListChecks className="w-10 h-10 mx-auto mb-2 text-slate-300"/>
                {audit.modo === 'pasos' ? 'Importa pasos del proceso para evaluarlos' : 'Agrega los puntos que deseas evaluar'}
              </td></tr>
            )}
            {items.map((it, idx) => {
              const isEvaluated = it.cumplido === true || it.cumplido === false;
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30';
              const isEditing = editingItemId === it.id;
              return (
                <tr key={it.id} className={`${rowBg} border-b border-emerald-100`} data-testid={`audit-item-${it.id}`}>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{it.orden}</td>
                  {isEditing ? (
                    <>
                      <td className="px-4 py-3"><input value={editForm.titulo} onChange={e => setEditForm({ ...editForm, titulo: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1 text-sm"/></td>
                      <td className="px-4 py-3"><input value={editForm.descripcion} onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1 text-sm"/></td>
                      <td className="px-4 py-3 text-center"><input type="number" min={1} value={editForm.puntos} onChange={e => setEditForm({ ...editForm, puntos: e.target.value })} className="w-16 border border-slate-200 rounded px-2 py-1 text-sm text-center"/></td>
                      <td className="px-4 py-3 text-center"></td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1">
                        <button onClick={saveEdit} className="p-1.5 hover:bg-emerald-100 rounded text-emerald-700"><Check className="w-4 h-4"/></button>
                        <button onClick={() => setEditingItemId(null)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><X className="w-4 h-4"/></button>
                      </div></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{it.titulo}</p>
                        {it.origen === 'paso' && <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">desde paso del proceso</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                        {it.descripcion ? (
                          <span dangerouslySetInnerHTML={{ __html: it.descripcion }} className="ck-content-rendered line-clamp-2"/>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">{it.puntos}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {!readOnly ? (
                            <>
                              <button
                                disabled={busyId === it.id}
                                onClick={() => setCumplido(it, true)}
                                data-testid={`audit-item-${it.id}-yes`}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors ${it.cumplido === true ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
                              >Sí</button>
                              <button
                                disabled={busyId === it.id}
                                onClick={() => setCumplido(it, false)}
                                data-testid={`audit-item-${it.id}-no`}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors ${it.cumplido === false ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                              >No</button>
                            </>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${it.cumplido === true ? 'bg-green-100 text-green-700' : it.cumplido === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                              {it.cumplido === true ? 'Sí' : it.cumplido === false ? 'No' : 'Sin evaluar'}
                            </span>
                          )}
                          {isEvaluated && <span className="text-[10px] text-slate-400">{it.puntos_obtenidos} pts</span>}
                        </div>
                      </td>
                      {!readOnly && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => startEdit(it)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Pencil className="w-3.5 h-3.5"/></button>
                            <button onClick={() => deleteItem(it)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
