import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, ChevronLeft, ChevronRight, RefreshCw, CalendarDays, ListIcon,
  PlayCircle, Filter, Clock, CheckCircle2, Circle, AlarmClock,
  X,
} from 'lucide-react';
import { processAPI } from '../../services/processApi';

const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MES_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADO_META = {
  programada: { lbl: 'Programada', cls: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', Icon: Circle },
  iniciada: { lbl: 'Iniciada', cls: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500', Icon: PlayCircle },
  completada: { lbl: 'Completada', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', Icon: CheckCircle2 },
  atrasada: { lbl: 'Atrasada', cls: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500', Icon: AlarmClock },
};

const CRIT_META = {
  alto: 'bg-red-50 text-red-700 border-red-200',
  medio: 'bg-amber-50 text-amber-700 border-amber-200',
  bajo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function fmt(d) { return d.toISOString().slice(0, 10); }

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function calendarGridStart(d) {
  // Lunes = 1, en JS Domingo=0 -> mover a lunes
  const first = startOfMonth(d);
  const dow = (first.getDay() + 6) % 7; // Mon=0 Sun=6
  return addDays(first, -dow);
}
function calendarGridEnd(d) {
  const last = endOfMonth(d);
  const dow = (last.getDay() + 6) % 7;
  return addDays(last, 6 - dow);
}

export default function ProcessSchedule() {
  const navigate = useNavigate();
  const [view, setView] = useState('calendar'); // 'calendar' | 'table'
  const [cursor, setCursor] = useState(new Date()); // mes mostrado
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [filters, setFilters] = useState({ proceso_id: '', responsable_id: '', estado: '', mine: false });
  const [regenerating, setRegenerating] = useState(false);
  const [openDay, setOpenDay] = useState(null); // 'YYYY-MM-DD' -> opens modal with all slots of that day

  const range = useMemo(() => {
    if (view === 'calendar') {
      return { from: fmt(calendarGridStart(cursor)), to: fmt(calendarGridEnd(cursor)) };
    }
    // tabla: mes completo
    return { from: fmt(startOfMonth(cursor)), to: fmt(endOfMonth(cursor)) };
  }, [cursor, view]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await processAPI.listSchedule({
        from: range.from, to: range.to,
        procesoId: filters.proceso_id || undefined,
        responsableId: filters.responsable_id || undefined,
        estado: filters.estado || undefined,
        mine: filters.mine || undefined,
      });
      setSlots(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [range.from, range.to, filters]);

  useEffect(() => {
    (async () => {
      try {
        const [s, p] = await Promise.all([processAPI.listStaff(), processAPI.listProcesses({ activo: true })]);
        setStaffList(s || []);
        setProcesses(p || []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => { load(); }, [load]);

  const slotsByDate = useMemo(() => {
    const m = {};
    slots.forEach(s => {
      (m[s.fecha] = m[s.fecha] || []).push(s);
    });
    return m;
  }, [slots]);

  const regenerate = async () => {
    if (!window.confirm('Regenerar slots para los próximos 3 meses (procesos activos)?')) return;
    setRegenerating(true);
    try {
      const r = await processAPI.regenerateSchedule({ monthsAhead: 3, monthsBack: 1 });
      alert(`Regenerados ${r.slots_creados} slot(s) en ${r.procesos} proceso(s).`);
      load();
    } catch (e) { alert(e.message); }
    setRegenerating(false);
  };

  const startSlot = async (slotId) => {
    if (!window.confirm('Iniciar la ejecución de este proceso programado?')) return;
    try {
      const r = await processAPI.startScheduleSlot(slotId);
      navigate(`/process/admin/executions/${r.ejecucion_id}`);
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="animate-fade-in" data-testid="process-schedule-page">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Programación de procesos
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Calendario y tabla de ejecuciones programadas. Genera ejecuciones automáticamente según la frecuencia configurada en cada proceso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={regenerate}
            disabled={regenerating}
            data-testid="schedule-regenerate-btn"
            className="text-sm bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
            Regenerar
          </button>
        </div>
      </header>

      {/* Toolbar: month nav + view switch + filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg" data-testid="schedule-prev-month">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <span className="px-2 text-sm font-semibold text-slate-700 capitalize min-w-[160px] text-center">
            {MES_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg" data-testid="schedule-next-month">
            <ChevronRight className="w-4 h-4"/>
          </button>
          <button onClick={() => setCursor(new Date())} className="ml-2 text-xs text-blue-600 hover:underline">Hoy</button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="bg-slate-100 rounded-lg p-0.5 inline-flex">
            <button
              onClick={() => setView('calendar')}
              data-testid="schedule-view-calendar"
              className={`px-3 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1 ${view === 'calendar' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              <CalendarDays className="w-3.5 h-3.5"/>Calendario
            </button>
            <button
              onClick={() => setView('table')}
              data-testid="schedule-view-table"
              className={`px-3 py-1 text-xs font-medium rounded-md inline-flex items-center gap-1 ${view === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              <ListIcon className="w-3.5 h-3.5"/>Tabla
            </button>
          </div>
        </div>

        <div className="basis-full pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400"/>
          <select
            value={filters.proceso_id}
            onChange={e => setFilters({ ...filters, proceso_id: e.target.value })}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
            data-testid="schedule-filter-process"
          >
            <option value="">Todos los procesos</option>
            {processes.map(p => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
          </select>
          <select
            value={filters.responsable_id}
            onChange={e => setFilters({ ...filters, responsable_id: e.target.value })}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
            data-testid="schedule-filter-staff"
          >
            <option value="">Todos los responsables</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.user_name}</option>)}
          </select>
          <select
            value={filters.estado}
            onChange={e => setFilters({ ...filters, estado: e.target.value })}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
            data-testid="schedule-filter-estado"
          >
            <option value="">Todos los estados</option>
            <option value="programada">Programada</option>
            <option value="iniciada">Iniciada</option>
            <option value="completada">Completada</option>
            <option value="atrasada">Atrasada</option>
          </select>
          <label className="ml-2 inline-flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={filters.mine} onChange={e => setFilters({ ...filters, mine: e.target.checked })}/>
            Solo mías
          </label>
          {(filters.proceso_id || filters.responsable_id || filters.estado || filters.mine) && (
            <button
              onClick={() => setFilters({ proceso_id: '', responsable_id: '', estado: '', mine: false })}
              className="ml-1 text-blue-600 hover:underline"
            >
              limpiar
            </button>
          )}
          <span className="ml-auto text-slate-400">{slots.length} slot(s)</span>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin"/>Cargando…
        </div>
      )}

      {!loading && view === 'calendar' && (
        <CalendarView
          cursor={cursor}
          slotsByDate={slotsByDate}
          onOpenDay={(date) => setOpenDay(date)}
          onStart={startSlot}
        />
      )}

      {!loading && view === 'table' && (
        <TableView slots={slots} onStart={startSlot} navigate={navigate}/>
      )}

      {/* Modal de día */}
      {openDay && (
        <DayModal
          date={openDay}
          slots={slotsByDate[openDay] || []}
          onClose={() => setOpenDay(null)}
          onStart={startSlot}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ===========================================================
function CalendarView({ cursor, slotsByDate, onOpenDay, onStart }) {
  const start = calendarGridStart(cursor);
  const end = calendarGridEnd(cursor);
  const days = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
  const today = fmt(new Date());

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {DOW_LABELS.map(l => (
          <div key={l} className="text-center text-[11px] font-semibold uppercase text-slate-500 py-2 tracking-wider">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const ds = fmt(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = ds === today;
          const items = slotsByDate[ds] || [];
          const visible = items.slice(0, 3);
          const more = items.length - visible.length;
          return (
            <div
              key={i}
              data-testid={`calendar-day-${ds}`}
              className={`min-h-[120px] border-b border-r border-slate-100 p-1.5 text-xs cursor-pointer hover:bg-slate-50 ${inMonth ? '' : 'bg-slate-50/50 text-slate-300'}`}
              onClick={() => items.length && onOpenDay(ds)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-semibold ${isToday ? 'bg-blue-600 text-white px-1.5 py-0.5 rounded-full' : (inMonth ? 'text-slate-700' : 'text-slate-300')}`}>
                  {d.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="text-[9px] text-slate-400">{items.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {visible.map(s => (
                  <SlotChip key={s.id} slot={s} onStart={onStart} compact />
                ))}
                {more > 0 && (
                  <div className="text-[10px] text-slate-500 italic">+ {more} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================
function TableView({ slots, onStart, navigate }) {
  if (slots.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
        No hay ejecuciones programadas en el rango seleccionado.
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-2 text-left text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Fecha</th>
            <th className="px-4 py-2 text-left text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Proceso</th>
            <th className="px-4 py-2 text-left text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Responsable</th>
            <th className="px-4 py-2 text-left text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Crit.</th>
            <th className="px-4 py-2 text-left text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Estado</th>
            <th className="px-4 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {slots.map(s => {
            const meta = ESTADO_META[s.estado] || ESTADO_META.programada;
            const Icon = meta.Icon;
            return (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50" data-testid={`schedule-row-${s.id}`}>
                <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400"/>
                    <span>{s.fecha}</span>
                    {s.hora && <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Clock className="w-3 h-3"/>{s.hora}</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div>
                    <p className="text-xs font-mono text-slate-400">{s.proceso_codigo}</p>
                    <p className="font-medium text-slate-800">{s.proceso_nombre}</p>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{s.responsable_nombre || <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CRIT_META[s.criticidad] || CRIT_META.medio} uppercase`}>{s.criticidad}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                    <Icon className="w-3 h-3"/>{meta.lbl}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {(s.estado === 'programada' || s.estado === 'atrasada') && (
                    <button
                      onClick={() => onStart(s.id)}
                      data-testid={`schedule-start-${s.id}`}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 inline-flex items-center gap-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5"/>Iniciar
                    </button>
                  )}
                  {s.ejecucion_id && (
                    <button
                      onClick={() => navigate(`/process/admin/executions/${s.ejecucion_id}`)}
                      className="text-xs text-blue-600 hover:underline ml-2"
                    >
                      Ver ejecución
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ===========================================================
function SlotChip({ slot, onStart, compact }) {
  const meta = ESTADO_META[slot.estado] || ESTADO_META.programada;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); }}
      className={`text-[10px] rounded px-1.5 py-0.5 border ${meta.cls} truncate flex items-center gap-1`}
      title={`${slot.proceso_codigo} · ${slot.responsable_nombre} · ${meta.lbl}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} flex-shrink-0`}/>
      <span className="truncate">{compact ? slot.proceso_codigo : slot.proceso_nombre}</span>
      {(slot.estado === 'programada' || slot.estado === 'atrasada') && (
        <button
          onClick={(e) => { e.stopPropagation(); onStart(slot.id); }}
          className="ml-auto opacity-60 hover:opacity-100"
          title="Iniciar"
        >
          <PlayCircle className="w-3 h-3"/>
        </button>
      )}
    </div>
  );
}

// ===========================================================
function DayModal({ date, slots, onClose, onStart, navigate }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative min-h-full flex items-start justify-center p-4 pt-10 pb-10" onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-500"/>
              <h3 className="font-semibold text-slate-900">{date} · {slots.length} ejecución(es) programada(s)</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
          </div>
          <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2">
            {slots.map(s => {
              const meta = ESTADO_META[s.estado] || ESTADO_META.programada;
              const Icon = meta.Icon;
              return (
                <div key={s.id} className="border border-slate-200 rounded-xl p-3 hover:bg-slate-50/50 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-slate-500 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-400">{s.proceso_codigo}{s.hora ? ` · ${s.hora}` : ''}</p>
                    <p className="font-medium text-slate-800 truncate">{s.proceso_nombre}</p>
                    <p className="text-xs text-slate-500">{s.responsable_nombre || 'Sin responsable'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CRIT_META[s.criticidad] || CRIT_META.medio} uppercase`}>{s.criticidad}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.cls}`}>
                    {meta.lbl}
                  </span>
                  <div className="flex flex-col gap-1">
                    {(s.estado === 'programada' || s.estado === 'atrasada') && (
                      <button
                        onClick={() => { onStart(s.id); onClose(); }}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2 py-1 inline-flex items-center gap-1"
                      >
                        <PlayCircle className="w-3 h-3"/>Iniciar
                      </button>
                    )}
                    {s.ejecucion_id && (
                      <button
                        onClick={() => { navigate(`/process/admin/executions/${s.ejecucion_id}`); onClose(); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Ver ejecución
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
