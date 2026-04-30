import { useEffect, useState } from 'react';
import { processAPI } from '../../services/processApi';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

export default function ProcessTypes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', color_fondo: '#3B82F6', color_texto: '#FFFFFF' });

  const load = async () => {
    setLoading(true);
    try { setItems(await processAPI.listTypes()); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const open = (item = null) => {
    setEditing(item || 'new');
    setForm(item ? { nombre: item.nombre, color_fondo: item.color_fondo, color_texto: item.color_texto } : { nombre: '', color_fondo: '#3B82F6', color_texto: '#FFFFFF' });
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') await processAPI.createType(form);
      else await processAPI.updateType(editing.id, form);
      setEditing(null); load();
    } catch (err) { alert(err.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este tipo?')) return;
    await processAPI.deleteType(id);
    load();
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Tipos de Proceso</h1>
          <p className="text-slate-500 mt-1">Categorías con colores personalizados para identificar procesos</p>
        </div>
        <button onClick={() => open()} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 font-medium flex items-center gap-2"><Plus className="w-4 h-4"/>Nuevo tipo</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: t.color_fondo, color: t.color_texto }}>{t.nombre}</span>
              <div className="flex gap-1">
                <button onClick={() => open(t)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Pencil className="w-4 h-4"/></button>
                <button onClick={() => remove(t.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div className="flex items-center gap-2">Fondo: <code className="font-mono bg-slate-50 px-1">{t.color_fondo}</code> <span className="w-4 h-4 rounded border border-slate-200" style={{ backgroundColor: t.color_fondo }}/></div>
              <div className="flex items-center gap-2">Texto: <code className="font-mono bg-slate-50 px-1">{t.color_texto}</code> <span className="w-4 h-4 rounded border border-slate-200" style={{ backgroundColor: t.color_texto }}/></div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form onSubmit={save} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{editing === 'new' ? 'Nuevo tipo' : 'Editar tipo'}</h3>
              <button type="button" onClick={() => setEditing(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color de fondo</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color_fondo} onChange={e => setForm({ ...form, color_fondo: e.target.value })} className="w-10 h-10 rounded cursor-pointer"/>
                    <input value={form.color_fondo} onChange={e => setForm({ ...form, color_fondo: e.target.value })} className="flex-1 border border-slate-200 rounded-xl px-2 py-2 text-sm font-mono"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color de texto</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color_texto} onChange={e => setForm({ ...form, color_texto: e.target.value })} className="w-10 h-10 rounded cursor-pointer"/>
                    <input value={form.color_texto} onChange={e => setForm({ ...form, color_texto: e.target.value })} className="flex-1 border border-slate-200 rounded-xl px-2 py-2 text-sm font-mono"/>
                  </div>
                </div>
              </div>
              {/* Live preview */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 mb-2">Vista previa</p>
                <span className="inline-block text-base font-semibold px-4 py-2 rounded-full" style={{ backgroundColor: form.color_fondo, color: form.color_texto }}>{form.nombre || 'Tu tipo aquí'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"><Save className="w-4 h-4"/>Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
