import { useEffect, useState } from 'react';
import { processAPI } from '../../services/processApi';
import { Loader2, Plus, Pencil, Trash2, X, Save, AlertTriangle } from 'lucide-react';

const LEVELS = [
  { key: 'omision_nivel_1', label: 'Nivel 1 — Leve', color: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
  { key: 'omision_nivel_2', label: 'Nivel 2 — Moderado', color: 'bg-orange-50 border-orange-200 text-orange-900' },
  { key: 'omision_nivel_3', label: 'Nivel 3 — Grave', color: 'bg-red-50 border-red-200 text-red-900' },
  { key: 'omision_nivel_4', label: 'Nivel 4 — Crítico', color: 'bg-red-100 border-red-300 text-red-900' },
];

const defaultForm = { nombre: '', omision_nivel_1: '', omision_nivel_2: '', omision_nivel_3: '', omision_nivel_4: '' };

export default function ConsequenceSystems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    setLoading(true);
    try { setItems(await processAPI.listConsequences()); } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const open = (item = null) => {
    setEditing(item || 'new');
    setForm(item ? { ...item } : defaultForm);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') await processAPI.createConsequence(form);
      else await processAPI.updateConsequence(editing.id, form);
      setEditing(null); load();
    } catch (err) { alert(err.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este sistema?')) return;
    await processAPI.deleteConsequence(id); load();
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Sistemas de Consecuencias</h1>
          <p className="text-slate-500 mt-1">Escala de 4 niveles para omisión de pasos críticos</p>
        </div>
        <button onClick={() => open()} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2.5 font-medium flex items-center gap-2"><Plus className="w-4 h-4"/>Nuevo sistema</button>
      </div>

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">No hay sistemas de consecuencias.</div>
        )}
        {items.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/>{c.nombre}</h3>
              <div className="flex gap-1">
                <button onClick={() => open(c)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><Pencil className="w-4 h-4"/></button>
                <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {LEVELS.map(l => (
                <div key={l.key} className={`border rounded-xl p-3 ${l.color}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1">{l.label}</p>
                  <p className="text-sm whitespace-pre-line">{c[l.key] || <span className="opacity-50 italic">— sin definir —</span>}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true"/>
          <div className="relative min-h-full flex items-center justify-center p-4">
            <form onSubmit={save} onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">{editing === 'new' ? 'Nuevo sistema' : 'Editar sistema'}</h3>
                <button type="button" onClick={() => setEditing(null)} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"/>
                </div>
                {LEVELS.map(l => (
                  <div key={l.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{l.label}</label>
                    <textarea value={form[l.key]} onChange={e => setForm({ ...form, [l.key]: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder={`Consecuencia para ${l.label.toLowerCase()}...`}/>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"><Save className="w-4 h-4"/>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
