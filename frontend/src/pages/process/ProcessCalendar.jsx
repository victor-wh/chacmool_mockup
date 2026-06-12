import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, ChevronLeft, ChevronRight, CalendarDays, Clock, Plus, X,
  Repeat, Trash2, Pencil, Filter, Search, Play, Eye, ClipboardCheck,
  AlertTriangle, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { processAPI } from '../../services/processApi';
import { useAuth } from '../../contexts/AuthContext';

const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MES_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS_SEMANA = [
  { v: 0, lbl: 'Lunes' }, { v: 1, lbl: 'Martes' }, { v: 2, lbl: 'Miércoles' },
  { v: 3, lbl: 'Jueves' }, { v: 4, lbl: 'Viernes' }, { v: 5, lbl: 'Sábado' },
  { v: 6, lbl: 'Domingo' },
];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const TIPO_OPTIONS = [
  { v: 'no_repite', lbl: 'No se repite' },
  { v: 'diario', lbl: 'Diariamente' },
  { v: 'laborales', lbl: 'Días laborales (Lun a Vie)' },
  { v: 'semanal', lbl: 'Semanalmente' },
  { v: 'mensual', lbl: 'Mensualmente' },
  { v: 'anual', lbl: 'Anualmente' },
];

// Schedule types con sus colores e íconos. UN solo lugar para cambiar el branding.
const STYPES = [
  { v: 'ejecucion',   lbl: 'Realizar',   short: 'R', color: '#2563EB', soft: '#DBEAFE', text: '#1D4ED8', Icon: Play },
  { v: 'supervision', lbl: 'Supervisar', short: 'S', color: '#D97706', soft: '#FEF3C7', text: '#B45309', Icon: Eye },
  { v: 'auditoria',   lbl: 'Auditar',    short: 'A', color: '#7C3AED', soft: '#EDE9FE', text: '#6D28D9', Icon: ClipboardCheck },
];
const STYPE_MAP = Object.fromEntries(STYPES.map(s => [s.v, s]));

function pad2(n) { return String(n).padStart(2, '0'); }
function fmt(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function calendarGridStart(d) {
  const first = startOfMonth(d);
  const dow = (first.getDay() + 6) % 7; // Mon=0, Sun=6
  return addDays(first, -dow);
}
function calendarGridEnd(d) {
  const last = endOfMonth(d);
  const dow = (last.getDay() + 6) % 7;
  return addDays(last, 6 - dow);
}
function weekStart(d) {
  const dow = (d.getDay() + 6) % 7; // Mon=0
  const r = new Date(d);
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}
function weekEnd(d) { return addDays(weekStart(d), 6); }

export default function ProcessCalendar() {
  const { isAdmin } = useAuth();
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [processes, setProcesses] = useState([]);
  // schedules son TODOS los schedules (los 3 tipos) para mostrarlos en sidebar
  const [schedules, setSchedules] = useState([]);
  // unscheduled depende del tab activo del sidebar
  const [unscheduled, setUnscheduled] = useState([]);
  const [filters, setFilters] = useState({ proceso_id: '', responsable_id: '', mine: false });
  const [soloVencidas, setSoloVencidas] = useState(false);
  // toggles de tipos visibles en el grid
  const [visibleTypes, setVisibleTypes] = useState({ ejecucion: true, supervision: true, auditoria: true });
  // tab activo del sidebar (controla el contexto al crear un nuevo schedule)
  const [sidebarType, setSidebarType] = useState('ejecucion');
  const [search, setSearch] = useState('');
  const [openSchedule, setOpenSchedule] = useState(null); // { proceso, schedule|null, schedule_type }
  const [openDay, setOpenDay] = useState(null); // YYYY-MM-DD
  const [view, setView] = useState('mes'); // 'mes' | 'semana'

  const range = useMemo(() => {
    if (view === 'semana') {
      return { from: fmt(weekStart(cursor)), to: fmt(weekEnd(cursor)) };
    }
    return { from: fmt(calendarGridStart(cursor)), to: fmt(calendarGridEnd(cursor)) };
  }, [cursor, view]);

  const enabledTypes = useMemo(
    () => STYPES.map(s => s.v).filter(v => visibleTypes[v]),
    [visibleTypes],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (enabledTypes.length === 0) {
        setEvents([]);
      } else {
        const ev = await processAPI.listEvents({
          from: range.from, to: range.to,
          procesoId: filters.proceso_id || undefined,
          responsableId: filters.responsable_id || undefined,
          mine: filters.mine || undefined,
          scheduleTypes: enabledTypes,
        });
        setEvents(ev || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [range.from, range.to, filters, enabledTypes]);

  // Carga inicial de catalogos + schedules
  useEffect(() => {
    (async () => {
      try {
        const [s, p, sch] = await Promise.all([
          processAPI.listStaff().catch(() => []),
          processAPI.listProcesses({ activo: true }),
          processAPI.listSchedules(),
        ]);
        setStaffList(s || []);
        setProcesses(p || []);
        setSchedules(sch || []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Carga lista "sin programar" según el tab activo del sidebar
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const u = await processAPI.listProcessesWithoutSchedule(sidebarType).catch(() => []);
        setUnscheduled(u || []);
      } catch (e) { console.error(e); }
    })();
  }, [isAdmin, sidebarType, schedules]);

  // Carga eventos cuando cambian deps. Inlined para evitar regla
  // react-hooks/set-state-in-effect del linter.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (enabledTypes.length === 0) {
        if (alive) { setEvents([]); setLoading(false); }
        return;
      }
      try {
        const ev = await processAPI.listEvents({
          from: range.from, to: range.to,
          procesoId: filters.proceso_id || undefined,
          responsableId: filters.responsable_id || undefined,
          mine: filters.mine || undefined,
          scheduleTypes: enabledTypes,
        });
        if (alive) setEvents(ev || []);
      } catch (e) { console.error(e); }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [range.from, range.to, filters, enabledTypes]);

  const eventsByDate = useMemo(() => {
    const m = {};
    events.forEach(e => {
      if (soloVencidas && e.estado_realizacion !== 'vencida') return;
      (m[e.fecha] = m[e.fecha] || []).push(e);
    });
    return m;
  }, [events, soloVencidas]);

  const overdueCount = useMemo(
    () => events.filter(e => e.estado_realizacion === 'vencida').length,
    [events],
  );

  const refreshSchedules = async () => {
    const sch = await processAPI.listSchedules();
    setSchedules(sch || []);
    load();
  };

  const handleSave = async (procesoId, payload, scheduleType) => {
    await processAPI.upsertSchedule(procesoId, payload, scheduleType);
    setOpenSchedule(null);
    refreshSchedules();
  };
  const handleDelete = async (procesoId, scheduleType) => {
    if (!window.confirm(`¿Quitar la programación de ${STYPE_MAP[scheduleType].lbl}?`)) return;
    await processAPI.deleteSchedule(procesoId, scheduleType);
    setOpenSchedule(null);
    refreshSchedules();
  };

  // Schedules del tipo activo en el sidebar
  const sidebarSchedules = useMemo(
    () => schedules.filter(s => (s.schedule_type || 'ejecucion') === sidebarType),
    [schedules, sidebarType],
  );

  const filteredUnscheduled = unscheduled.filter(p =>
    (p.codigo + ' ' + p.nombre).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in" data-testid="process-calendar-page">
      <header className="mb-5">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
          Calendario de procesos
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Programación de <strong>Realizar</strong>, <strong>Supervisar</strong> y <strong>Auditar</strong> en una sola vista.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* ============ CALENDAR ============ */}
        <div>
          {/* Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor(new Date())} className="text-xs border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5" data-testid="cal-today-btn">
                Hoy
              </button>
              <button
                onClick={() => {
                  if (view === 'semana') setCursor(addDays(cursor, -7));
                  else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
                }}
                data-testid="cal-prev-btn" className="p-1.5 hover:bg-slate-100 rounded-lg">
                <ChevronLeft className="w-4 h-4"/>
              </button>
              <button
                onClick={() => {
                  if (view === 'semana') setCursor(addDays(cursor, 7));
                  else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
                }}
                data-testid="cal-next-btn" className="p-1.5 hover:bg-slate-100 rounded-lg">
                <ChevronRight className="w-4 h-4"/>
              </button>
              <span className="ml-2 text-sm font-semibold text-slate-800 capitalize">
                {view === 'semana' ? formatWeekLabel(cursor) : `${MES_LABELS[cursor.getMonth()]} de ${cursor.getFullYear()}`}
              </span>
            </div>

            {/* View switch Semana / Mes */}
            <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
              {[
                { v: 'semana', lbl: 'Semana' },
                { v: 'mes', lbl: 'Mes' },
              ].map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setView(o.v)}
                  data-testid={`cal-view-${o.v}`}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${view === o.v ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {o.lbl}
                </button>
              ))}
            </div>

            {/* Toggles por tipo de schedule */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STYPES.map(t => {
                const active = visibleTypes[t.v];
                const Icon = t.Icon;
                return (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setVisibleTypes(v => ({ ...v, [t.v]: !v[t.v] }))}
                    data-testid={`cal-toggle-${t.v}`}
                    title={active ? `Ocultar ${t.lbl}` : `Mostrar ${t.lbl}`}
                    className="text-xs px-2.5 py-1.5 rounded-full inline-flex items-center gap-1.5 border transition-colors"
                    style={{
                      background: active ? t.soft : '#fff',
                      borderColor: active ? t.color : '#E2E8F0',
                      color: active ? t.text : '#94A3B8',
                    }}
                  >
                    <Icon className="w-3 h-3"/>
                    {t.lbl}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center flex-wrap gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400"/>
              <select
                value={filters.proceso_id}
                onChange={e => setFilters({ ...filters, proceso_id: e.target.value })}
                className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
                data-testid="cal-filter-process"
              >
                <option value="">Todos los procesos</option>
                {processes.map(p => <option key={p.id} value={p.id}>{p.codigo}</option>)}
              </select>
              {isAdmin && (
                <select
                  value={filters.responsable_id}
                  onChange={e => setFilters({ ...filters, responsable_id: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
                  data-testid="cal-filter-staff"
                >
                  <option value="">Todos los responsables</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.user_name}</option>)}
                </select>
              )}
              {isAdmin && (
                <label className="ml-1 inline-flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={filters.mine} onChange={e => setFilters({ ...filters, mine: e.target.checked })}/>
                  Solo mías
                </label>
              )}
              <span className="text-slate-400 ml-1">{events.length} evento(s)</span>
              {overdueCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSoloVencidas(v => !v)}
                  data-testid="cal-overdue-toggle"
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 border ml-1 transition-colors ${soloVencidas ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                  title="Mostrar sólo eventos vencidos"
                >
                  <AlertTriangle className="w-3 h-3"/>{overdueCount} vencida{overdueCount === 1 ? '' : 's'}
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {DOW_LABELS.map(l => (
                <div key={l} className="text-center text-[11px] font-semibold uppercase text-slate-500 py-2 tracking-wider">{l}</div>
              ))}
            </div>
            {loading ? (
              <div className="p-10 text-center text-slate-400 inline-flex items-center gap-2 w-full justify-center">
                <Loader2 className="w-4 h-4 animate-spin"/>Cargando…
              </div>
            ) : view === 'semana' ? (
              <WeekGrid cursor={cursor} eventsByDate={eventsByDate} onOpenDay={setOpenDay}/>
            ) : (
              <CalendarGrid cursor={cursor} eventsByDate={eventsByDate} onOpenDay={setOpenDay}/>
            )}
          </div>
        </div>

        {/* ============ RIGHT SIDEBAR ============ */}
        <aside className="bg-white border border-slate-200 rounded-2xl p-4 self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
          {/* Tabs por tipo */}
          <div className="flex items-center gap-1 mb-3 bg-slate-50 border border-slate-200 rounded-xl p-1">
            {STYPES.map(t => {
              const active = sidebarType === t.v;
              const Icon = t.Icon;
              return (
                <button
                  key={t.v}
                  onClick={() => setSidebarType(t.v)}
                  data-testid={`cal-sidebar-tab-${t.v}`}
                  className="flex-1 text-xs px-2 py-1.5 rounded-lg inline-flex items-center justify-center gap-1 transition-colors"
                  style={{
                    background: active ? t.color : 'transparent',
                    color: active ? '#fff' : '#475569',
                  }}
                >
                  <Icon className="w-3 h-3"/>
                  {t.lbl}
                </button>
              );
            })}
          </div>

          {isAdmin ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Sin programar</h2>
                <span className="text-xs text-slate-400">{filteredUnscheduled.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Procesos sin <span style={{ color: STYPE_MAP[sidebarType].color }} className="font-semibold">{STYPE_MAP[sidebarType].lbl}</span>. Click → asignar frecuencia.
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar proceso..."
                  className="w-full text-xs border border-slate-200 rounded-lg pl-7 pr-2 py-1.5"
                />
              </div>
              <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
                {filteredUnscheduled.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    {unscheduled.length === 0 ? 'Todos los procesos están programados.' : 'Sin coincidencias.'}
                  </p>
                )}
                {filteredUnscheduled.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setOpenSchedule({ proceso: p, schedule: null, schedule_type: sidebarType })}
                    data-testid={`cal-schedule-process-${p.id}`}
                    className="w-full text-left border border-slate-200 rounded-lg p-2 hover:border-blue-300 hover:bg-blue-50/30 group transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[9px] font-mono px-1 py-0.5 rounded text-white"
                        style={{ background: p.tipo_color_fondo || '#475569' }}
                      >
                        {p.codigo}
                      </span>
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 ml-auto flex-shrink-0"/>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mt-1 line-clamp-2">{p.nombre}</p>
                    {p.area_nombre && <p className="text-[10px] text-slate-400">{p.area_nombre}</p>}
                  </button>
                ))}
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Programados</h2>
                  <span className="text-xs text-slate-400">{sidebarSchedules.length}</span>
                </div>
                <div className="overflow-y-auto max-h-64 space-y-1.5 pr-1">
                  {sidebarSchedules.length === 0 && (
                    <p className="text-xs text-slate-400 py-2 text-center">Aún no hay procesos programados.</p>
                  )}
                  {sidebarSchedules.map(s => (
                    <button
                      key={`${s.proceso_id}-${s.schedule_type}`}
                      onClick={() => setOpenSchedule({
                        proceso: { id: s.proceso_id, codigo: s.proceso_codigo, nombre: s.proceso_nombre, tipo_color_fondo: s.tipo_color_fondo, area_nombre: s.area_nombre },
                        schedule: s,
                        schedule_type: s.schedule_type || 'ejecucion',
                      })}
                      data-testid={`cal-edit-schedule-${s.proceso_id}-${s.schedule_type || 'ejecucion'}`}
                      className="w-full text-left border border-slate-200 rounded-lg p-2 hover:border-blue-300 hover:bg-blue-50/30 group"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded text-white" style={{ background: s.tipo_color_fondo || '#475569' }}>
                          {s.proceso_codigo}
                        </span>
                        <Pencil className="w-3 h-3 text-slate-400 group-hover:text-blue-600 ml-auto flex-shrink-0"/>
                      </div>
                      <p className="text-xs font-medium text-slate-800 mt-1 line-clamp-1">{s.proceso_nombre}</p>
                      <p className="text-[10px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
                        <Repeat className="w-2.5 h-2.5"/>{describeSchedule(s)}
                      </p>
                      {s.responsable_nombre && (
                        <p className="text-[10px] text-slate-400 mt-0.5">→ {s.responsable_nombre}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Mis procesos</h2>
                <span className="text-xs text-slate-400">{sidebarSchedules.length}</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Procesos con <span style={{ color: STYPE_MAP[sidebarType].color }} className="font-semibold">{STYPE_MAP[sidebarType].lbl}</span> asignado a tu nombre.
              </p>
              <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
                {sidebarSchedules.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">No tienes procesos en este calendario.</p>
                )}
                {sidebarSchedules.map(s => (
                  <div key={`${s.proceso_id}-${s.schedule_type}`} className="border border-slate-200 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded text-white" style={{ background: s.tipo_color_fondo || '#475569' }}>
                        {s.proceso_codigo}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mt-1">{s.proceso_nombre}</p>
                    <p className="text-[10px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
                      <Repeat className="w-2.5 h-2.5"/>{describeSchedule(s)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Modals */}
      {openSchedule && (
        <ScheduleModal
          proceso={openSchedule.proceso}
          schedule={openSchedule.schedule}
          scheduleType={openSchedule.schedule_type}
          staffList={staffList}
          onClose={() => setOpenSchedule(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {openDay && (
        <DayModal
          date={openDay}
          events={eventsByDate[openDay] || []}
          onClose={() => setOpenDay(null)}
          onAfterAction={() => { setOpenDay(null); load(); }}
        />
      )}
    </div>
  );
}

// ===========================================================
function formatWeekLabel(d) {
  const s = weekStart(d), e = weekEnd(d);
  const sm = MES_LABELS[s.getMonth()].slice(0, 3);
  const em = MES_LABELS[e.getMonth()].slice(0, 3);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} – ${e.getDate()} ${sm} ${s.getFullYear()}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} ${sm} – ${e.getDate()} ${em} ${s.getFullYear()}`;
  }
  return `${s.getDate()} ${sm} ${s.getFullYear()} – ${e.getDate()} ${em} ${e.getFullYear()}`;
}

// ===========================================================
function WeekGrid({ cursor, eventsByDate, onOpenDay }) {
  const start = weekStart(cursor);
  const days = [];
  for (let i = 0; i < 7; i++) days.push(addDays(start, i));
  const today = fmt(new Date());
  return (
    <div className="grid grid-cols-7">
      {days.map((d, i) => {
        const ds = fmt(d);
        const isToday = ds === today;
        const list = eventsByDate[ds] || [];
        return (
          <div
            key={i}
            data-testid={`cal-day-${ds}`}
            onClick={() => list.length && onOpenDay(ds)}
            className={`min-h-[420px] border-r border-slate-100 p-2 text-xs bg-white ${list.length ? 'cursor-pointer hover:bg-slate-50' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center' : 'text-slate-700'}`}>
                  {d.getDate()}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  {DOW_LABELS[i]}
                </span>
              </div>
              {list.length > 0 && (<span className="text-[10px] text-slate-400">{list.length}</span>)}
            </div>
            <div className="space-y-1">
              {list.map(ev => {
                const st = STYPE_MAP[ev.schedule_type] || STYPE_MAP.ejecucion;
                const overdue = ev.estado_realizacion === 'vencida';
                const done = ev.estado_realizacion === 'completada';
                const bg = overdue ? '#FEE2E2' : (done ? '#DCFCE7' : st.soft);
                const border = overdue ? '#DC2626' : (done ? '#16A34A' : st.color);
                const txt = overdue ? '#991B1B' : (done ? '#166534' : st.text);
                const badgeBg = overdue ? '#DC2626' : (done ? '#16A34A' : st.color);
                return (
                  <div
                    key={ev.id}
                    className="text-[11px] rounded-xl pl-2 pr-2.5 py-1.5 font-medium flex items-start gap-1.5 border relative"
                    style={{
                      background: bg,
                      color: txt,
                      borderColor: border,
                      boxShadow: `inset 4px 0 0 0 ${ev.tipo_color_fondo || '#94A3B8'}`,
                    }}
                    title={`${overdue ? '⚠ VENCIDA · ' : done ? '✓ Completada · ' : ''}[${st.lbl}] ${ev.proceso_codigo} · ${ev.proceso_nombre}${ev.hora ? ` · ${ev.hora}` : ''}${ev.responsable_nombre ? ` · ${ev.responsable_nombre}` : ''}`}
                  >
                    <span
                      className="inline-flex items-center justify-center text-[9px] font-bold rounded-full w-4 h-4 flex-shrink-0 mt-0.5 ml-1"
                      style={{ background: badgeBg, color: '#fff' }}
                    >{st.short}</span>
                    <div className="min-w-0 flex-1">
                      {ev.hora && <div className="opacity-80 text-[10px]">{ev.hora}</div>}
                      <div className="font-mono text-[10px] opacity-90">{ev.proceso_codigo}</div>
                      <div className="leading-tight line-clamp-2">{ev.proceso_nombre}</div>
                      {overdue && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-700">
                          <AlertTriangle className="w-2.5 h-2.5"/>Vencida
                        </div>
                      )}
                      {done && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                          <CheckCircle2 className="w-2.5 h-2.5"/>Realizada
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================
function CalendarGrid({ cursor, eventsByDate, onOpenDay }) {
  const start = calendarGridStart(cursor);
  const end = calendarGridEnd(cursor);
  const days = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
  const today = fmt(new Date());
  return (
    <div className="grid grid-cols-7">
      {days.map((d, i) => {
        const ds = fmt(d);
        const inMonth = d.getMonth() === cursor.getMonth();
        const isToday = ds === today;
        const list = eventsByDate[ds] || [];
        const visible = list.slice(0, 3);
        const more = list.length - visible.length;
        return (
          <div
            key={i}
            data-testid={`cal-day-${ds}`}
            onClick={() => list.length && onOpenDay(ds)}
            className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 text-xs ${inMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-300'} ${list.length ? 'cursor-pointer hover:bg-slate-50' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-semibold ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center' : (inMonth ? 'text-slate-700' : 'text-slate-300')}`}>
                {d.getDate()}
              </span>
              {list.length > 0 && (<span className="text-[9px] text-slate-400">{list.length}</span>)}
            </div>
            <div className="space-y-0.5">
              {visible.map(ev => {
                const st = STYPE_MAP[ev.schedule_type] || STYPE_MAP.ejecucion;
                const overdue = ev.estado_realizacion === 'vencida';
                const done = ev.estado_realizacion === 'completada';
                const bg = overdue ? '#FEE2E2' : (done ? '#DCFCE7' : st.soft);
                const border = overdue ? '#DC2626' : (done ? '#16A34A' : st.color);
                const txt = overdue ? '#991B1B' : (done ? '#166534' : st.text);
                const titlePrefix = overdue ? '⚠ VENCIDA · ' : (done ? '✓ Completada · ' : '');
                return (
                  <div
                    key={ev.id}
                    className={`text-[10px] rounded-full pl-1 pr-2 py-0.5 truncate font-medium flex items-center gap-1 border ${overdue ? 'animate-pulse-subtle' : ''}`}
                    style={{
                      background: bg,
                      color: txt,
                      borderColor: border,
                      boxShadow: `inset 3px 0 0 0 ${ev.tipo_color_fondo || '#94A3B8'}`,
                    }}
                    title={`${titlePrefix}[${st.lbl}] ${ev.proceso_codigo} · ${ev.proceso_nombre}${ev.hora ? ` · ${ev.hora}` : ''}${ev.responsable_nombre ? ` · ${ev.responsable_nombre}` : ''}`}
                  >
                    <span
                      className="inline-flex items-center justify-center text-[8px] font-bold rounded-full w-3 h-3 flex-shrink-0 ml-1"
                      style={{ background: overdue ? '#DC2626' : (done ? '#16A34A' : st.color), color: '#fff' }}
                    >{st.short}</span>
                    {ev.hora && <span className="opacity-80">{ev.hora}</span>}
                    <span className="truncate">{ev.proceso_codigo}</span>
                    {overdue && <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0 text-red-600"/>}
                    {done && <CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0 text-emerald-600"/>}
                  </div>
                );
              })}
              {more > 0 && <div className="text-[10px] text-slate-500 italic">+ {more} más</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================
function describeSchedule(s) {
  if (!s) return '';
  switch (s.tipo) {
    case 'no_repite': return `Único: ${s.fecha_unica || '—'}${s.hora ? ` · ${s.hora}` : ''}`;
    case 'diario': return `Diario${s.hora ? ` · ${s.hora}` : ''}`;
    case 'laborales': return `Lun-Vie${s.hora ? ` · ${s.hora}` : ''}`;
    case 'semanal': {
      const lbl = DIAS_SEMANA.find(d => d.v === s.dia_semana)?.lbl || '—';
      return `Semanal · ${lbl}${s.hora ? ` · ${s.hora}` : ''}`;
    }
    case 'mensual': return `Mensual · día ${s.dia_mes}${s.hora ? ` · ${s.hora}` : ''}`;
    case 'anual': return `Anual · ${s.dia_mes} ${MESES[(s.mes || 1) - 1]}${s.hora ? ` · ${s.hora}` : ''}`;
    default: return '';
  }
}

// ===========================================================
function ScheduleModal({ proceso, schedule, scheduleType, staffList, onClose, onSave, onDelete }) {
  const st = STYPE_MAP[scheduleType] || STYPE_MAP.ejecucion;
  const [form, setForm] = useState({
    tipo: schedule?.tipo || 'no_repite',
    fecha_unica: schedule?.fecha_unica || '',
    dia_semana: schedule?.dia_semana ?? 0,
    dia_mes: schedule?.dia_mes ?? 1,
    mes: schedule?.mes ?? 1,
    hora: schedule?.hora || '',
    responsable_id: schedule?.responsable_id || '',
    activa: schedule?.activa ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (form.tipo === 'no_repite' && !form.fecha_unica) { alert('Selecciona una fecha'); return; }
    setSaving(true);
    try {
      await onSave(proceso.id, {
        tipo: form.tipo,
        fecha_unica: form.tipo === 'no_repite' ? form.fecha_unica : null,
        dia_semana: form.tipo === 'semanal' ? Number(form.dia_semana) : null,
        dia_mes: ['mensual', 'anual'].includes(form.tipo) ? Number(form.dia_mes) : null,
        mes: form.tipo === 'anual' ? Number(form.mes) : null,
        hora: form.hora || null,
        responsable_id: form.responsable_id || null,
        activa: !!form.activa,
      }, scheduleType);
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const Icon = st.Icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative min-h-full flex items-start justify-center p-4 pt-10 pb-10" onClick={e => e.stopPropagation()}>
        <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
          <header
            className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"
            style={{ background: st.soft }}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-slate-500">{proceso.codigo}</p>
              <h3 className="font-semibold text-slate-900 truncate inline-flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                <Icon className="w-4 h-4" style={{ color: st.color }}/>
                {schedule ? 'Editar' : 'Programar'} · <span style={{ color: st.color }}>{st.lbl}</span>
              </h3>
              <p className="text-xs text-slate-600 truncate">{proceso.nombre}</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/60 rounded"><X className="w-4 h-4"/></button>
          </header>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Repetir</label>
              <select
                data-testid="schedule-tipo"
                value={form.tipo}
                onChange={e => set({ tipo: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
              >
                {TIPO_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.lbl}</option>)}
              </select>
            </div>

            {form.tipo === 'no_repite' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Fecha</label>
                <input
                  data-testid="schedule-fecha-unica"
                  type="date"
                  value={form.fecha_unica}
                  onChange={e => set({ fecha_unica: e.target.value })}
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            )}

            {form.tipo === 'semanal' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Día de la semana</label>
                <select
                  value={form.dia_semana}
                  onChange={e => set({ dia_semana: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  {DIAS_SEMANA.map(d => <option key={d.v} value={d.v}>{d.lbl}</option>)}
                </select>
              </div>
            )}

            {(form.tipo === 'mensual' || form.tipo === 'anual') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Día del mes</label>
                  <input
                    type="number" min={1} max={31}
                    value={form.dia_mes}
                    onChange={e => set({ dia_mes: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                {form.tipo === 'anual' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Mes</label>
                    <select
                      value={form.mes}
                      onChange={e => set({ mes: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                      {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Hora (opcional)</label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={e => set({ hora: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Responsable de {st.lbl.toLowerCase()}
                </label>
                <select
                  data-testid="schedule-responsable"
                  value={form.responsable_id}
                  onChange={e => set({ responsable_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="">— Sin responsable —</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.user_name}</option>)}
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activa} onChange={e => set({ activa: e.target.checked })}/>
              <span className="text-sm text-slate-700">Programación activa</span>
            </label>
          </div>

          <footer className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {schedule ? (
              <button
                type="button"
                onClick={() => onDelete(proceso.id, scheduleType)}
                data-testid="schedule-delete-btn"
                className="text-xs text-red-600 hover:bg-red-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5"/>Quitar
              </button>
            ) : <span/>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button
                type="submit"
                disabled={saving}
                data-testid="schedule-save-btn"
                className="text-white rounded-lg px-4 py-1.5 text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50"
                style={{ background: st.color }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Plus className="w-3.5 h-3.5"/>}
                {schedule ? 'Guardar' : 'Programar'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ===========================================================
function DayModal({ date, events, onClose, onAfterAction }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative min-h-full flex items-start justify-center p-4 pt-10 pb-10" onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl">
          <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-500"/>
              <h3 className="font-semibold text-slate-900">{date} · {events.length} evento(s)</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
          </header>
          <div className="p-5 space-y-2 max-h-[70vh] overflow-y-auto">
            {events.map(ev => {
              const st = STYPE_MAP[ev.schedule_type] || STYPE_MAP.ejecucion;
              const Icon = st.Icon;
              const overdue = ev.estado_realizacion === 'vencida';
              const done = ev.estado_realizacion === 'completada';
              const borderColor = overdue ? '#DC2626' : (done ? '#16A34A' : st.color);
              return (
                <div
                  key={ev.id}
                  className={`border rounded-xl p-3 flex items-center gap-3 ${overdue ? 'bg-red-50 border-red-200' : done ? 'bg-emerald-50 border-emerald-200' : 'border-slate-200'}`}
                  style={{ borderLeft: `4px solid ${borderColor}` }}
                >
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded text-white flex-shrink-0"
                    style={{ background: ev.tipo_color_fondo || '#475569' }}
                  >
                    {ev.proceso_codigo}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1 flex-shrink-0"
                    style={{ background: st.soft, color: st.text }}
                  >
                    <Icon className="w-3 h-3"/>{st.lbl}
                  </span>
                  {overdue && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 flex-shrink-0 bg-red-600 text-white">
                      <AlertTriangle className="w-3 h-3"/>VENCIDA
                    </span>
                  )}
                  {done && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1 flex-shrink-0 bg-emerald-600 text-white">
                      <CheckCircle2 className="w-3 h-3"/>REALIZADA
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{ev.proceso_nombre}</p>
                    <p className="text-[11px] text-slate-500 inline-flex items-center gap-2 flex-wrap">
                      {ev.hora && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3"/>{ev.hora}</span>}
                      {ev.responsable_nombre && <span>· {ev.responsable_nombre}</span>}
                      {ev.area_nombre && <span>· {ev.area_nombre}</span>}
                      {done && ev.completada_codigos?.length > 0 && (
                        <span className="text-emerald-700">· {ev.completada_codigos.join(', ')}</span>
                      )}
                    </p>
                  </div>
                  <EventActionButton ev={ev} onAfterAction={onAfterAction}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


// ===========================================================
// Botón de acción para un evento (Realizar / Supervisar / Auditar / Ver).
// Decide texto, destino y handler en función del schedule_type y estado.
// ===========================================================
function EventActionButton({ ev, size = 'md', onAfterAction }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const st = STYPE_MAP[ev.schedule_type] || STYPE_MAP.ejecucion;
  const Icon = st.Icon;
  const done = ev.estado_realizacion === 'completada';
  const completedId = (ev.completada_ids || [])[0] || null;

  const isIcon = size === 'sm';
  const baseClass = `inline-flex items-center justify-center gap-1 font-semibold transition-colors ${
    isIcon
      ? 'w-5 h-5 rounded-full text-[10px]'
      : 'px-3 py-1.5 rounded-lg text-xs'
  }`;

  const handle = async (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (busy) return;
    // 1. Si ya está hecho → ir al registro existente
    if (done && completedId) {
      if (ev.schedule_type === 'ejecucion') navigate(`/process/execution/${completedId}`);
      else if (ev.schedule_type === 'supervision') navigate(`/supervision/${completedId}`);
      else if (ev.schedule_type === 'auditoria') navigate(`/audit/${completedId}`);
      return;
    }
    // 2. Acción según tipo
    if (ev.schedule_type === 'ejecucion') {
      setBusy(true);
      try {
        const exe = await processAPI.createExecution(ev.proceso_id);
        onAfterAction?.();
        navigate(`/process/execution/${exe.id}`);
      } catch (err) {
        alert('Error al iniciar la ejecución: ' + err.message);
        setBusy(false);
      }
    } else if (ev.schedule_type === 'supervision') {
      navigate(`/supervision/new?proceso_id=${ev.proceso_id}`);
    } else if (ev.schedule_type === 'auditoria') {
      navigate(`/audit/new?proceso_id=${ev.proceso_id}`);
    }
  };

  const label = done ? 'Ver' : st.lbl;
  const style = done
    ? { background: '#fff', color: '#0f172a', border: '1px solid #E2E8F0' }
    : { background: st.color, color: '#fff', border: `1px solid ${st.color}` };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      data-testid={`event-action-${ev.schedule_type}-${ev.fecha}`}
      title={done ? `Ver ${st.lbl.toLowerCase()} realizado` : `${st.lbl} ahora`}
      className={`${baseClass} disabled:opacity-50 hover:opacity-90`}
      style={style}
    >
      {busy
        ? <Loader2 className="w-3 h-3 animate-spin"/>
        : done
          ? <Eye className="w-3 h-3"/>
          : <Icon className="w-3 h-3"/>}
      {!isIcon && <span>{label}</span>}
      {!isIcon && !done && <ArrowRight className="w-3 h-3"/>}
    </button>
  );
}
