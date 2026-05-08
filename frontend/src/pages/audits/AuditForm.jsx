import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditAPI } from '../../services/auditApi';
import { processAPI } from '../../services/processApi';
import { Loader2, ArrowLeft, ArrowRight, Save, ClipboardCheck } from 'lucide-react';

/**
 * Crear nueva auditoría (wizard de 1 paso): selección de proceso + tipo + modo.
 * Al guardar se redirige al detalle donde se definen items y se evalúa.
 */
export default function AuditForm() {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [form, setForm] = useState({
    proceso_id: '',
    tipo: 'presencial',
    ejecucion_id: '',
    modo: 'pasos',
    evaluado_id: '',
    comentarios: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([processAPI.listProcesses(), processAPI.listStaff()]);
        setProcesses((p || []).filter(x => x.activo));
        setStaffList(s || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (form.tipo !== 'historica' || !form.proceso_id) { setExecutions([]); return; }
    (async () => {
      try {
        const list = await auditAPI.executionsByProcess(form.proceso_id);
        setExecutions(list || []);
      } catch (e) { console.error(e); }
    })();
  }, [form.tipo, form.proceso_id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.proceso_id) { alert('Selecciona el proceso a auditar'); return; }
    if (form.tipo === 'historica' && !form.ejecucion_id) { alert('Selecciona la ejecución pasada a auditar'); return; }
    if (form.tipo === 'presencial' && !form.evaluado_id) { alert('Selecciona el staff a evaluar'); return; }
    setSaving(true);
    try {
      const payload = {
        proceso_id: form.proceso_id,
        tipo: form.tipo,
        modo: form.modo,
        comentarios: form.comentarios,
        ejecucion_id: form.tipo === 'historica' ? form.ejecucion_id : null,
        evaluado_id: form.tipo === 'presencial' ? form.evaluado_id : null,
      };
      const a = await auditAPI.create(payload);
      navigate(`/audits/${a.id}`);
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando...</div>;
  }

  return (
    <div className="animate-fade-in max-w-2xl" data-testid="audit-form-page">
      <button onClick={() => navigate('/audits')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="w-4 h-4"/>Volver al listado
      </button>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5"/>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>Nueva auditoría</h1>
          <p className="text-slate-500 text-sm mt-1">Define qué proceso vas a auditar y cómo lo harás. Después podrás definir los puntos a evaluar y registrar resultados.</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Proceso *</label>
          <select
            value={form.proceso_id}
            onChange={e => setForm({ ...form, proceso_id: e.target.value, ejecucion_id: '' })}
            data-testid="audit-process-select"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option value="">— Selecciona el proceso —</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de auditoría *</label>
          <div className="grid grid-cols-2 gap-3">
            <RadioCard
              testId="audit-type-presencial"
              active={form.tipo === 'presencial'}
              onClick={() => setForm({ ...form, tipo: 'presencial' })}
              title="Presencial"
              desc="Evalúas en vivo a un colaborador mientras ejecuta el proceso."
              accent="amber"
            />
            <RadioCard
              testId="audit-type-historica"
              active={form.tipo === 'historica'}
              onClick={() => setForm({ ...form, tipo: 'historica' })}
              title="Histórica"
              desc="Auditas una ejecución pasada del proceso."
              accent="indigo"
            />
          </div>
        </div>

        {form.tipo === 'presencial' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Staff evaluado *</label>
            <select
              value={form.evaluado_id}
              onChange={e => setForm({ ...form, evaluado_id: e.target.value })}
              data-testid="audit-evaluado-select"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
            >
              <option value="">— Selecciona el colaborador —</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.user_name}{s.area_nombre ? ` · ${s.area_nombre}` : ''}</option>)}
            </select>
          </div>
        )}

        {form.tipo === 'historica' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ejecución pasada *</label>
            <select
              value={form.ejecucion_id}
              onChange={e => setForm({ ...form, ejecucion_id: e.target.value })}
              data-testid="audit-execution-select"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
              disabled={!form.proceso_id}
            >
              <option value="">{form.proceso_id ? '— Selecciona la ejecución —' : 'Primero selecciona un proceso'}</option>
              {executions.map(e => (
                <option key={e.id} value={e.id}>
                  {e.codigo_ejecucion} · {e.fecha} · {e.staff_user_name} ({e.estado})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">El staff evaluado se autocompleta con quien ejecutó el proceso.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Modo de evaluación *</label>
          <div className="grid grid-cols-2 gap-3">
            <RadioCard
              testId="audit-modo-pasos"
              active={form.modo === 'pasos'}
              onClick={() => setForm({ ...form, modo: 'pasos' })}
              title="Cada paso del proceso"
              desc="Marca qué pasos vas a evaluar. Usa los puntos definidos del proceso."
              accent="emerald"
            />
            <RadioCard
              testId="audit-modo-puntos"
              active={form.modo === 'puntos'}
              onClick={() => setForm({ ...form, modo: 'puntos' })}
              title="Puntos personalizados"
              desc="Redacta tus propios puntos a evaluar y asígnales valor."
              accent="purple"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios (opcional)</label>
          <textarea
            value={form.comentarios}
            onChange={e => setForm({ ...form, comentarios: e.target.value })}
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            placeholder="Notas iniciales para esta auditoría..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => navigate('/audits')} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl">Cancelar</button>
          <button
            type="submit"
            disabled={saving}
            data-testid="audit-form-save"
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowRight className="w-4 h-4"/>}
            Crear y continuar
          </button>
        </div>
      </form>
    </div>
  );
}

const RadioCard = ({ active, onClick, title, desc, accent = 'slate', testId }) => {
  const accentMap = {
    amber: 'bg-amber-50 text-amber-700 border-amber-300',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    purple: 'bg-purple-50 text-purple-700 border-purple-300',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`text-left p-3 rounded-xl border-2 transition-all ${active ? accentMap[accent] : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs mt-1 opacity-80">{desc}</p>
    </button>
  );
};
