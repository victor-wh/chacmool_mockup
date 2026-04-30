import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, ExternalLink, ArrowUp, ArrowDown, Save, X, AlertTriangle, Camera } from 'lucide-react';

const defaultStep = { nombre: '', descripcion: '', orden: 0, puntos: 1, requiere_evidencia: false, es_critico: false, sistema_consecuencias_id: '' };

export default function ProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proc, setProc] = useState(null);
  const [steps, setSteps] = useState([]);
  const [consequences, setConsequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState(null);
  const [form, setForm] = useState(defaultStep);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s, c] = await Promise.all([processAPI.getProcess(id), processAPI.listSteps(id), processAPI.listConsequences()]);
      setProc(p); setSteps(s); setConsequences(c);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(defaultStep); setEditingStep('new'); };
  const openEdit = (s) => { setEditingStep(s.id); setForm({ ...s, sistema_consecuencias_id: s.sistema_consecuencias_id || '' }); };

  const saveStep = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { alert('El nombre del paso es obligatorio'); return; }
    setSaving(true);
    const payload = { ...form, sistema_consecuencias_id: form.sistema_consecuencias_id || null };
    try {
      if (editingStep === 'new') await processAPI.createStep(id, payload);
      else await processAPI.updateStep(editingStep, payload);
      setEditingStep(null);
      await load();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const removeStep = async (sid) => {
    if (!window.confirm('¿Eliminar este paso?')) return;
    await processAPI.deleteStep(sid);
    load();
  };

  const move = async (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const newOrder = [...steps];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setSteps(newOrder);
    await processAPI.reorderSteps(id, newOrder.map(s => s.id));
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;
  if (!proc) return <div className="text-slate-500">Proceso no encontrado</div>;

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/process/admin/processes')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-4 h-4"/>Volver al listado</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">{proc.codigo}</span>
              {proc.tipo_nombre && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: proc.tipo_color_fondo, color: proc.tipo_color_texto }}>{proc.tipo_nombre}</span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${proc.activo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{proc.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>{proc.nombre}</h1>
            <p className="text-sm text-slate-500 mt-1">{proc.descripcion || 'Sin descripción'}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span>Área: <strong className="text-slate-700">{proc.area_nombre || '—'}</strong></span>
              {proc.url_referencia && (
                <a href={proc.url_referencia} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3"/>Documentación</a>
              )}
            </div>
          </div>
          <button onClick={() => navigate(`/process/admin/processes/${id}/edit`)} className="text-sm border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2"><Pencil className="w-4 h-4"/>Editar proceso</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Pasos del proceso ({steps.length})</h2>
        <button onClick={openNew} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4"/>Añadir Paso</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3 w-12">#</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Nombre</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Pts</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Flags</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Consecuencias</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {steps.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">Sin pasos. Agrega el primero.</td></tr>}
            {steps.map((s, idx) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-center font-semibold text-slate-700">{s.orden}</td>
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{s.nombre}</p>
                  {s.descripcion && <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{s.descripcion}</p>}
                </td>
                <td className="px-4 py-3 text-center text-sm font-medium text-slate-700">{s.puntos}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {s.requiere_evidencia && <span title="Requiere evidencia" className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700"><Camera className="w-3 h-3"/>Evid.</span>}
                    {s.es_critico && <span title="Crítico" className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700"><AlertTriangle className="w-3 h-3"/>Crít.</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{s.sistema_consecuencias_nombre || '—'}</td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded"><ArrowUp className="w-4 h-4"/></button>
                    <button onClick={() => move(idx, 1)} disabled={idx === steps.length - 1} className="p-1.5 hover:bg-slate-100 disabled:opacity-30 rounded"><ArrowDown className="w-4 h-4"/></button>
                    <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Pencil className="w-4 h-4"/></button>
                    <button onClick={() => removeStep(s.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingStep && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditingStep(null)}>
          <form onSubmit={saveStep} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-semibold text-slate-900">{editingStep === 'new' ? 'Nuevo paso' : 'Editar paso'}</h3>
              <button type="button" onClick={() => setEditingStep(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Orden</label>
                  <input type="number" min="0" value={form.orden} onChange={e => setForm({ ...form, orden: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Puntos</label>
                  <input type="number" min="0" value={form.puntos} onChange={e => setForm({ ...form, puntos: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sistema de consecuencias</label>
                <select value={form.sistema_consecuencias_id} onChange={e => setForm({ ...form, sistema_consecuencias_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
                  <option value="">— Ninguno —</option>
                  {consequences.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
                  <span className="text-sm text-slate-700 flex items-center gap-2"><Camera className="w-4 h-4 text-blue-600"/>Requiere evidencia</span>
                  <input type="checkbox" checked={form.requiere_evidencia} onChange={e => setForm({ ...form, requiere_evidencia: e.target.checked })}/>
                </label>
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
                  <span className="text-sm text-slate-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600"/>Es crítico</span>
                  <input type="checkbox" checked={form.es_critico} onChange={e => setForm({ ...form, es_critico: e.target.checked })}/>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100 flex-shrink-0">
              <button type="button" onClick={() => setEditingStep(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
