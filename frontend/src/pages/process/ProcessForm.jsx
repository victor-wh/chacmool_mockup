import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Loader2, Save, ArrowLeft, AlertTriangle, CalendarClock } from 'lucide-react';
import { RichTextEditor } from '../../components/RichTextEditor';

const DIAS_SEMANA = [
  { v: 0, lbl: 'Lunes' }, { v: 1, lbl: 'Martes' }, { v: 2, lbl: 'Miércoles' },
  { v: 3, lbl: 'Jueves' }, { v: 4, lbl: 'Viernes' }, { v: 5, lbl: 'Sábado' },
  { v: 6, lbl: 'Domingo' },
];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const PROG_DEFAULT = {
  tipo: 'eventual', dia_semana: 0, dia_mes: 1, mes: 1,
  meses_trimestre: [1, 4, 7, 10], hora: '', criticidad: 'medio', activa: true,
};

export default function ProcessForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [types, setTypes] = useState([]);
  const [consequences, setConsequences] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({
    nombre: '', descripcion: '', url_referencia: '',
    area_id: '', tipo_id: '', sistema_consecuencias_id: '',
    activo: true, responsable_id: '', programacion: PROG_DEFAULT,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, t, c, st] = await Promise.all([
          processAPI.listAreas(),
          processAPI.listTypes(),
          processAPI.listConsequences(),
          processAPI.listStaff(),
        ]);
        setAreas(a); setTypes(t); setConsequences(c); setStaffList(st || []);
        if (isEdit) {
          const p = await processAPI.getProcess(id);
          setForm({
            nombre: p.nombre,
            descripcion: p.descripcion || '',
            url_referencia: p.url_referencia || '',
            area_id: p.area_id || '',
            tipo_id: p.tipo_id || '',
            sistema_consecuencias_id: p.sistema_consecuencias_id || '',
            activo: p.activo,
            responsable_id: p.responsable_id || '',
            programacion: { ...PROG_DEFAULT, ...(p.programacion || {}) },
          });
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [id, isEdit]);

  const setProg = (patch) => setForm(f => ({ ...f, programacion: { ...f.programacion, ...patch } }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { alert('El nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const prog = form.programacion;
      const payload = {
        ...form,
        area_id: form.area_id || null,
        tipo_id: form.tipo_id || null,
        sistema_consecuencias_id: form.sistema_consecuencias_id || null,
        responsable_id: form.responsable_id || null,
        programacion: {
          tipo: prog.tipo,
          dia_semana: prog.tipo === 'semanal' ? Number(prog.dia_semana) : null,
          dia_mes: ['mensual', 'trimestral', 'anual'].includes(prog.tipo) ? Number(prog.dia_mes) : null,
          mes: prog.tipo === 'anual' ? Number(prog.mes) : null,
          meses_trimestre: prog.tipo === 'trimestral' ? [1, 4, 7, 10] : null,
          hora: prog.hora || null,
          criticidad: prog.criticidad || 'medio',
          activa: !!prog.activa,
        },
      };
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

  const prog = form.programacion;

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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500"/>Sistema de consecuencias
            <span className="text-xs font-normal text-slate-400">(opcional · aplica a todo el proceso)</span>
          </label>
          <select
            data-testid="process-consequence-select"
            value={form.sistema_consecuencias_id}
            onChange={e => setForm({ ...form, sistema_consecuencias_id: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option value="">— Ninguno —</option>
            {consequences.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Se aplicará automáticamente a todos los pasos del proceso cuando se omitan.
          </p>
        </div>

        {/* ---------- PROGRAMACIÓN ---------- */}
        <div className="border-t border-slate-100 pt-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1 uppercase tracking-wider flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-500"/>Programación periódica
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Define con qué frecuencia se debe ejecutar este proceso y a quién corresponde. Genera ejecuciones programadas automáticamente.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
              <select
                data-testid="process-responsable-select"
                value={form.responsable_id}
                onChange={e => setForm({ ...form, responsable_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="">— Sin responsable —</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.user_name}{s.area_nombre ? ` · ${s.area_nombre}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia</label>
              <select
                data-testid="process-prog-tipo"
                value={prog.tipo}
                onChange={e => setProg({ tipo: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="eventual">Eventual (sin programación)</option>
                <option value="diario">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
                <option value="trimestral">Trimestral (Ene · Abr · Jul · Oct)</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          {prog.tipo !== 'eventual' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {prog.tipo === 'semanal' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Día de la semana</label>
                  <select
                    value={prog.dia_semana ?? 0}
                    onChange={e => setProg({ dia_semana: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {DIAS_SEMANA.map(d => <option key={d.v} value={d.v}>{d.lbl}</option>)}
                  </select>
                </div>
              )}
              {['mensual', 'trimestral', 'anual'].includes(prog.tipo) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Día del mes</label>
                  <input
                    type="number" min={1} max={31}
                    value={prog.dia_mes ?? 1}
                    onChange={e => setProg({ dia_mes: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              )}
              {prog.tipo === 'anual' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mes</label>
                  <select
                    value={prog.mes ?? 1}
                    onChange={e => setProg({ mes: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora (opcional)</label>
                <input
                  type="time"
                  value={prog.hora || ''}
                  onChange={e => setProg({ hora: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Criticidad</label>
                <select
                  value={prog.criticidad || 'medio'}
                  onChange={e => setProg({ criticidad: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="bajo">Bajo</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input type="checkbox" checked={prog.activa} onChange={e => setProg({ activa: e.target.checked })} className="rounded"/>
                <span className="text-sm text-slate-700">Programación activa</span>
              </label>
            </div>
          )}
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
