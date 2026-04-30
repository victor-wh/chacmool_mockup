import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import {
  Loader2, ArrowLeft, ExternalLink, Camera, AlertTriangle,
  FileText, ListChecks, Info, Award, Hash
} from 'lucide-react';

export default function ProcessInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proc, setProc] = useState(null);
  const [steps, setSteps] = useState([]);
  const [consequencesMap, setConsequencesMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, s, c] = await Promise.all([
          processAPI.getProcess(id),
          processAPI.listSteps(id),
          processAPI.listConsequences(),
        ]);
        setProc(p);
        setSteps(s || []);
        const map = {};
        (c || []).forEach(x => { map[x.id] = x; });
        setConsequencesMap(map);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-500" data-testid="process-info-loading">
      <Loader2 className="w-4 h-4 animate-spin"/>Cargando resumen...
    </div>
  );

  if (!proc) return (
    <div className="text-slate-500" data-testid="process-info-not-found">Proceso no encontrado.</div>
  );

  const totalPuntos = steps.reduce((sum, s) => sum + (s.puntos || 0), 0);
  const criticosCount = steps.filter(s => s.es_critico).length;
  const evidenciaCount = steps.filter(s => s.requiere_evidencia).length;

  return (
    <div className="animate-fade-in max-w-4xl" data-testid="process-info-page">
      <button
        onClick={() => navigate('/process/admin/processes')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
        data-testid="process-info-back-btn"
      >
        <ArrowLeft className="w-4 h-4"/>Volver al listado
      </button>

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-3 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${proc.activo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {proc.activo ? 'Activo' : 'Inactivo'}
          </span>
          {proc.area_nombre && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {proc.area_nombre}
            </span>
          )}
          {proc.tipo_nombre && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: proc.tipo_color_fondo || '#f1f5f9',
                color: proc.tipo_color_texto || '#334155'
              }}
            >
              {proc.tipo_nombre}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-semibold text-slate-900 mt-3 tracking-tight" style={{ fontFamily: 'Outfit' }} data-testid="process-info-title">
          {proc.nombre}
        </h1>

        {proc.descripcion ? (
          <div
            className="ck-content-rendered text-slate-600 mt-3 text-[15px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: proc.descripcion }}
            data-testid="process-info-description"
          />
        ) : (
          <p className="text-sm text-slate-400 mt-3 italic">Sin descripción</p>
        )}

        {proc.url_referencia && (
          <a
            href={proc.url_referencia}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-blue-600 hover:text-blue-700 hover:underline"
            data-testid="process-info-reference-link"
          >
            <ExternalLink className="w-4 h-4"/>Ver documentación externa
          </a>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<ListChecks className="w-4 h-4"/>} label="Pasos totales" value={steps.length} color="slate"/>
        <StatCard icon={<Award className="w-4 h-4"/>} label="Puntos totales" value={totalPuntos} color="blue"/>
        <StatCard icon={<Camera className="w-4 h-4"/>} label="Con evidencia" value={evidenciaCount} color="indigo"/>
        <StatCard icon={<AlertTriangle className="w-4 h-4"/>} label="Críticos" value={criticosCount} color="red"/>
      </div>

      {/* Steps list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500"/>
          <h2 className="font-semibold text-slate-900">Pasos del proceso ({steps.length})</h2>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-16 text-slate-400" data-testid="process-info-no-steps">
            <Info className="w-8 h-8 mx-auto mb-2 opacity-40"/>
            <p className="text-sm">Este proceso aún no tiene pasos definidos.</p>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100" data-testid="process-info-steps-list">
            {steps.map((s, i) => {
              const cs = s.sistema_consecuencias_id ? consequencesMap[s.sistema_consecuencias_id] : null;
              return (
                <li key={s.id} className="px-6 py-5" data-testid={`process-info-step-${i}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {s.orden ?? i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-base">{s.nombre}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            <Hash className="w-3 h-3"/>{s.puntos} pts
                          </span>
                          {s.requiere_evidencia && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              <Camera className="w-3 h-3"/>Evidencia
                            </span>
                          )}
                          {s.es_critico && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                              <AlertTriangle className="w-3 h-3"/>Crítico
                            </span>
                          )}
                        </div>
                      </div>

                      {s.descripcion ? (
                        <div
                          className="ck-content-rendered text-sm text-slate-600 mt-2"
                          dangerouslySetInnerHTML={{ __html: s.descripcion }}
                        />
                      ) : (
                        <p className="text-sm text-slate-400 italic mt-2">— sin descripción —</p>
                      )}

                      {cs && (
                        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-700 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3"/>Sistema de consecuencias
                          </p>
                          <p className="text-sm font-medium text-slate-900">{cs.nombre}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-xs text-slate-600">
                            {cs.omision_nivel_1 && <ConsequenceRow n={1} text={cs.omision_nivel_1}/>}
                            {cs.omision_nivel_2 && <ConsequenceRow n={2} text={cs.omision_nivel_2}/>}
                            {cs.omision_nivel_3 && <ConsequenceRow n={3} text={cs.omision_nivel_3}/>}
                            {cs.omision_nivel_4 && <ConsequenceRow n={4} text={cs.omision_nivel_4}/>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

const StatCard = ({ icon, label, value, color }) => {
  const palette = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    red: 'bg-red-50 text-red-700',
  }[color] || 'bg-slate-100 text-slate-700';
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg ${palette} flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
};

const ConsequenceRow = ({ n, text }) => (
  <div className="flex items-start gap-2">
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex-shrink-0">
      {n}
    </span>
    <span className="text-slate-700">{text}</span>
  </div>
);
