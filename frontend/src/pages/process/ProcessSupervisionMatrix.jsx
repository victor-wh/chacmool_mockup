import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Loader2, ChevronLeft, ChevronRight, Search, CheckCircle2, AlertTriangle,
  Download, Filter,
} from 'lucide-react';
import { processAPI } from '../../services/processApi';

const MES_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const CRITICIDAD_STYLES = {
  Alta:  { bg: '#FEE2E2', color: '#B91C1C' },
  Media: { bg: '#FEF3C7', color: '#B45309' },
  Baja:  { bg: '#DCFCE7', color: '#15803D' },
  '—':   { bg: '#F1F5F9', color: '#64748B' },
};

export default function ProcessSupervisionMatrix() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1..12
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [critFilter, setCritFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await processAPI.getCalendarMatrix(year, month);
      setData(res);
    } catch (e) { console.error(e); setData(null); }
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  };

  const areaOptions = useMemo(() => {
    const set = new Set((data?.rows || []).map(r => r.area_nombre).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows || [];
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (areaFilter && r.area_nombre !== areaFilter) return false;
      if (critFilter && r.criticidad !== critFilter) return false;
      if (q) {
        const blob = `${r.codigo} ${r.nombre} ${r.area_nombre} ${r.responsable_nombre}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, areaFilter, critFilter]);

  const totals = useMemo(() => {
    const weeks = data?.weeks || [];
    return weeks.map((w, idx) => {
      let req = 0, hechas = 0, completadas = 0;
      filteredRows.forEach(r => {
        const ws = r.weeks[idx];
        if (!ws) return;
        if (ws.supervision_requerida) req += 1;
        if (ws.supervision_realizada) hechas += 1;
        if (ws.supervision_completada) completadas += 1;
      });
      return { ...w, req, hechas, completadas };
    });
  }, [filteredRows, data]);

  const exportCsv = () => {
    if (!data) return;
    const weekHeaders = data.weeks.map(w => w.label);
    const head = ['Nomenclatura', 'Proceso', 'Área', 'Responsable', 'Frecuencia Proceso',
      'Criticidad', 'Supervisión', 'Frecuencia Auditoría', ...weekHeaders];
    const lines = [head.join(',')];
    filteredRows.forEach(r => {
      const wcells = r.weeks.map(w =>
        !w.supervision_requerida ? '' :
          (w.supervision_completada ? 'Completada' :
            w.supervision_realizada ? 'En curso' : 'Pendiente')
      );
      const row = [r.codigo, r.nombre, r.area_nombre, r.responsable_nombre,
        r.frecuencia_proceso, r.criticidad, r.frecuencia_supervision,
        r.frecuencia_auditoria, ...wcells]
        .map(x => `"${(x ?? '').toString().replaceAll('"', '""')}"`).join(',');
      lines.push(row);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matriz-supervision-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" data-testid="supervision-matrix-page">
      <header className="mb-5 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Matriz de supervisión
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Vista mensual: frecuencias por proceso y estado de supervisión por semana.
          </p>
        </div>
        <div className="inline-flex items-center gap-2">
          <button
            onClick={exportCsv}
            data-testid="matrix-export-csv"
            className="text-xs border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5"/>Exportar CSV
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => { const t = new Date(); setYear(t.getFullYear()); setMonth(t.getMonth() + 1); }}
            data-testid="matrix-today-btn"
            className="text-xs border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5">
            Hoy
          </button>
          <button onClick={prevMonth} data-testid="matrix-prev-btn" className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <button onClick={nextMonth} data-testid="matrix-next-btn" className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="w-4 h-4"/>
          </button>
          <span className="ml-2 text-sm font-semibold text-slate-800 capitalize">
            {MES_LABELS[month - 1]} de {year}
          </span>
        </div>

        <div className="ml-auto flex items-center flex-wrap gap-2 text-xs">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
            <input
              data-testid="matrix-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 w-44"
            />
          </div>
          <Filter className="w-3.5 h-3.5 text-slate-400"/>
          <select
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            data-testid="matrix-area-filter"
          >
            <option value="">Todas las áreas</option>
            {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={critFilter}
            onChange={e => setCritFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            data-testid="matrix-crit-filter"
          >
            <option value="">Toda criticidad</option>
            {['Alta', 'Media', 'Baja'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-slate-400 ml-1">{filteredRows.length} proceso(s)</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 inline-flex items-center gap-2 w-full justify-center">
              <Loader2 className="w-4 h-4 animate-spin"/>Cargando…
            </div>
          ) : !data || filteredRows.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Sin procesos para mostrar.</div>
          ) : (
            <table className="w-full text-xs" data-testid="matrix-table">
              <thead className="bg-slate-900 text-white sticky top-0 z-10">
                <tr>
                  <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Nomenclatura</th>
                  <th className="text-left px-2.5 py-2.5 font-semibold">Proceso</th>
                  <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Área</th>
                  <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Responsable</th>
                  <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Frecuencia Proceso</th>
                  <th className="text-center px-2.5 py-2.5 font-semibold whitespace-nowrap">Criticidad</th>
                  <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Supervisión</th>
                  <th className="text-left px-2.5 py-2.5 font-semibold whitespace-nowrap">Frecuencia Auditoría</th>
                  {data.weeks.map(w => (
                    <th
                      key={w.label}
                      className="text-center px-1.5 py-2.5 font-semibold whitespace-nowrap"
                      title={`${w.start} → ${w.end}`}
                    >
                      {w.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => {
                  const critStyle = CRITICIDAD_STYLES[r.criticidad] || CRITICIDAD_STYLES['—'];
                  return (
                    <tr
                      key={r.proceso_id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                      data-testid={`matrix-row-${r.codigo}`}
                    >
                      <td className="px-2.5 py-1.5 font-mono whitespace-nowrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] text-white"
                          style={{ background: r.tipo_color_fondo || '#475569', color: r.tipo_color_texto || '#fff' }}
                        >{r.codigo}</span>
                      </td>
                      <td className="px-2.5 py-1.5 max-w-xs">
                        <span className="text-slate-800 font-medium" title={r.nombre}>{r.nombre}</span>
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">{r.area_nombre || '—'}</td>
                      <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">{r.responsable_nombre || '—'}</td>
                      <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">{r.frecuencia_proceso}</td>
                      <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: critStyle.bg, color: critStyle.color }}
                        >{r.criticidad}</span>
                      </td>
                      <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">{r.frecuencia_supervision}</td>
                      <td className="px-2.5 py-1.5 text-slate-700 whitespace-nowrap">{r.frecuencia_auditoria}</td>
                      {r.weeks.map((w, wi) => <WeekCell key={wi} w={w}/>)}
                    </tr>
                  );
                })}
                {/* Totales por semana */}
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-700">
                  <td className="px-2.5 py-2 whitespace-nowrap" colSpan={8}>Resumen del mes</td>
                  {totals.map((t, idx) => (
                    <td key={idx} className="px-1.5 py-2 text-center text-[10px] whitespace-nowrap">
                      <span className="text-emerald-600">{t.completadas}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-600">{t.req}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#FEE2E2', border: '1px solid #FCA5A5' }}/>
          Supervisión requerida (pendiente)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300"/>
          Iniciada (draft)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-400"/>
          Completada · "Se ejecuta"
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-50 border border-slate-200"/>
          No requerida esta semana
        </span>
      </div>
    </div>
  );
}

function WeekCell({ w }) {
  if (!w.supervision_requerida && !w.supervision_realizada) {
    return <td className="px-1.5 py-1.5 text-center text-slate-300 bg-slate-50/40 border-l border-slate-100">·</td>;
  }
  let bg = '#FEE2E2', border = '#FCA5A5', label = '', color = '#991B1B', Icon = AlertTriangle;
  if (w.supervision_completada) {
    bg = '#DCFCE7'; border = '#86EFAC'; color = '#15803D'; label = 'Se ejecuta'; Icon = CheckCircle2;
  } else if (w.supervision_realizada) {
    bg = '#FEF3C7'; border = '#FCD34D'; color = '#92400E'; label = 'En curso'; Icon = Loader2;
  } else {
    label = '';
  }
  return (
    <td
      className="px-1.5 py-1.5 text-center text-[10px] font-semibold whitespace-nowrap border-l border-slate-100"
      style={{ background: bg, color, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}
      title={`${w.label} · ${w.start} → ${w.end}${w.supervision_count ? ` · ${w.supervision_count} supervisión(es)` : ''}`}
    >
      {label ? (
        <span className="inline-flex items-center gap-1 justify-center">
          <Icon className="w-3 h-3"/>{label}
        </span>
      ) : null}
    </td>
  );
}
