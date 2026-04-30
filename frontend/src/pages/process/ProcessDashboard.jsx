import { useEffect, useState } from 'react';
import { processAPI } from '../../services/processApi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Loader2, Activity, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export default function ProcessDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setStats(await processAPI.getStats()); } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando estadísticas...</div>;

  const KPIS = [
    { label: 'Total ejecuciones', value: stats.total_executions, icon: Activity, color: 'bg-blue-50 text-blue-700' },
    { label: 'Promedio cumplimiento', value: `${stats.avg_compliance}%`, icon: TrendingUp, color: 'bg-green-50 text-green-700' },
    { label: 'Ejecuciones hoy', value: stats.executions_today, icon: CheckCircle2, color: 'bg-violet-50 text-violet-700' },
    { label: 'Pasos críticos omitidos', value: stats.critical_omitted, icon: AlertTriangle, color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Dashboard · Process</h1>
        <p className="text-slate-500 mt-1">Vista general del cumplimiento de procesos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPIS.map((k, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon className="w-5 h-5"/>
            </div>
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por área */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Procesos ejecutados por área</h3>
          {stats.by_area.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.by_area}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/>
                <XAxis dataKey="area" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false}/>
                <Tooltip/>
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cumplimiento por proceso (horizontal) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">% Cumplimiento por proceso</h3>
          {stats.by_process.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Sin datos aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.by_process} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0"/>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }}/>
                <YAxis type="category" dataKey="proceso" tick={{ fontSize: 11 }} width={120}/>
                <Tooltip formatter={v => `${v}%`}/>
                <Bar dataKey="cumplimiento" radius={[0, 6, 6, 0]}>
                  {stats.by_process.map((d, i) => (
                    <Cell key={i} fill={d.cumplimiento >= 80 ? '#10B981' : d.cumplimiento >= 50 ? '#F59E0B' : '#EF4444'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pasos más omitidos */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Pasos omitidos más frecuentes</h3>
          {stats.most_omitted_steps.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Aún no hay pasos omitidos registrados — ¡bien hecho!</p>
          ) : (
            <ul className="space-y-2">
              {stats.most_omitted_steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="w-7 h-7 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-700">{s.paso}</span>
                  <span className="text-sm font-semibold text-red-600">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
