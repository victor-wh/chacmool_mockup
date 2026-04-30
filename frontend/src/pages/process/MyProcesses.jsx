import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Play, FileText, Loader2, ExternalLink, ListChecks } from 'lucide-react';

export default function MyProcesses() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await processAPI.listProcesses({ mine: true });
        setProcesses(data);
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

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin"/>Cargando procesos...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Mis Procesos</h1>
        <p className="text-slate-500 mt-1">Procesos activos disponibles en tu área</p>
      </div>

      {processes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay procesos disponibles para tu área.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {processes.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-slate-400">{p.codigo}</span>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: p.tipo_color_fondo || '#3B82F6', color: p.tipo_color_texto || '#FFFFFF' }}
                >
                  {p.tipo_nombre || 'Sin tipo'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">{p.nombre}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">{p.descripcion || 'Sin descripción'}</p>

              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />{p.total_pasos} pasos</span>
                <span>·</span>
                <span>{p.area_nombre || 'Sin área'}</span>
                {p.url_referencia && (
                  <>
                    <span>·</span>
                    <a href={p.url_referencia} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3"/>Wiki
                    </a>
                  </>
                )}
              </div>

              <button
                onClick={() => handleStart(p.id)}
                disabled={starting === p.id || p.total_pasos === 0}
                className="mt-auto w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {starting === p.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4"/>}
                {p.total_pasos === 0 ? 'Sin pasos definidos' : 'Iniciar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
