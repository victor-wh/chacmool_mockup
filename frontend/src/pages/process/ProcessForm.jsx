import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { RichTextEditor } from '../../components/RichTextEditor';

export default function ProcessForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ nombre: '', descripcion: '', url_referencia: '', area_id: '', tipo_id: '', activo: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, t] = await Promise.all([processAPI.listAreas(), processAPI.listTypes()]);
        setAreas(a); setTypes(t);
        if (isEdit) {
          const p = await processAPI.getProcess(id);
          setForm({ nombre: p.nombre, descripcion: p.descripcion || '', url_referencia: p.url_referencia || '', area_id: p.area_id || '', tipo_id: p.tipo_id || '', activo: p.activo });
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { alert('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const payload = { ...form, area_id: form.area_id || null, tipo_id: form.tipo_id || null };
      if (isEdit) {
        await processAPI.updateProcess(id, payload);
        navigate(`/process/admin/processes/${id}`);
      } else {
        const p = await processAPI.createProcess(payload);
        navigate(`/process/admin/processes/${p.id}`);
      }
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;

  return (
    <div className="animate-fade-in max-w-3xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4"/>Volver
      </button>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>{isEdit ? 'Editar Proceso' : 'Nuevo Proceso'}</h1>
        <p className="text-slate-500 mt-1">{isEdit ? 'Actualiza la información del proceso' : 'Define la metadata. Los pasos se gestionan en el detalle.'}</p>
      </div>

      <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre <span className="text-red-500">*</span></label>
          <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Ej. Apertura de tienda"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
          <RichTextEditor
            testId="process-description-editor"
            value={form.descripcion}
            onChange={(html) => setForm({ ...form, descripcion: html })}
            placeholder="Describe el propósito y alcance del proceso..."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Área</label>
            <select value={form.area_id} onChange={e => setForm({ ...form, area_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
              <option value="">— Sin área —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select value={form.tipo_id} onChange={e => setForm({ ...form, tipo_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white">
              <option value="">— Sin tipo —</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">URL de referencia</label>
          <input value={form.url_referencia} onChange={e => setForm({ ...form, url_referencia: e.target.value })} placeholder="https://wiki.empresa.com/..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"/>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} className="rounded"/>
          <span className="text-sm text-slate-700">Proceso activo (visible para empleados)</span>
        </label>

        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}{isEdit ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
