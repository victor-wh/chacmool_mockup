import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import {
  Play, FileText, Loader2, ExternalLink, Layers
} from 'lucide-react';
import { stripHtml } from '../../lib/html';

const ALL_TAB = '__all__';
const NO_AREA = '__no_area__';

export default function MyProcesses() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const [activeArea, setActiveArea] = useState(ALL_TAB);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const procs = await processAPI.listProcesses({ mine: true });
        setProcesses(procs);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const handleStart = async (procId) => {
    setStarting(procId);
    try {
      const exe = await processAPI.createExecution(procId);
      navigate(`/process/execution/${exe.id}`);
    } catch (e) {
      alert('Error al iniciar: ' + e.message);
      setStarting(null);
    }
  };

  const areaTabs = useMemo(() => {
    const map = new Map();
    processes.forEach(p => {
      const key = p.area_id || NO_AREA;
      const name = p.area_nombre || 'Sin área';
      const entry = map.get(key) || { key, name, count: 0 };
      entry.count += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [processes]);

  const filtered = useMemo(() => {
    if (activeArea === ALL_TAB) return processes;
    return processes.filter(p => (p.area_id || NO_AREA) === activeArea);
  }, [processes, activeArea]);

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando procesos...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Mis Procesos</h1>
        <p className="text-slate-500 mt-1">Procesos activos disponibles en tu área</p>
      </div>

      {/* ---------- Procesos disponibles ---------- */}
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-slate-900">Disponibles</h2>
        <p className="text-xs text-slate-500">Selecciona un área para ver los procesos e inicia la ejecución</p>
      </div>

      {/* Área tabs */}
      <div className="border-b border-slate-200 mb-4 overflow-x-auto" data-testid="area-tabs">
        <div className="flex items-end gap-1 min-w-max">
          <AreaTab
            active={activeArea === ALL_TAB}
            onClick={() => setActiveArea(ALL_TAB)}
            icon={<Layers className="w-3.5 h-3.5"/>}
            label="Todas"
            count={processes.length}
            testId="area-tab-all"
          />
          {areaTabs.map(a => (
            <AreaTab
              key={a.key}
              active={activeArea === a.key}
              onClick={() => setActiveArea(a.key)}
              label={a.name}
              count={a.count}
              testId={`area-tab-${a.key}`}
            />
          ))}
        </div>
      </div>

      {processes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay procesos disponibles para tu área.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Código</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Proceso</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Tipo</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase px-6 py-3">Pasos</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Referencia</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300"/>Sin procesos en esta área
                </td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50" data-testid={`my-process-row-${p.id}`}>
                  <td className="px-6 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{p.codigo}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-slate-400 line-clamp-1 max-w-md">{stripHtml(p.descripcion) || 'Sin descripción'}</p>
                  </td>
                  <td className="px-6 py-3">
                    {p.tipo_nombre ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: p.tipo_color_fondo, color: p.tipo_color_texto }}>{p.tipo_nombre}</span>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-3 text-center text-sm font-medium text-slate-700">{p.total_pasos}</td>
                  <td className="px-6 py-3">
                    {p.url_referencia ? (
                      <a
                        href={p.url_referencia}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3"/>Wiki
                      </a>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleStart(p.id)}
                      disabled={starting === p.id || p.total_pasos === 0}
                      data-testid={`start-process-btn-${p.id}`}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      {starting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Play className="w-3.5 h-3.5"/>}
                      {p.total_pasos === 0 ? 'Sin pasos' : 'Iniciar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const AreaTab = ({ active, onClick, icon, label, count, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`px-4 py-2.5 -mb-px border-b-2 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap ${
      active
        ? 'border-slate-900 text-slate-900'
        : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
    }`}
  >
    {icon}
    {label}
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
      {count}
    </span>
  </button>
);
