import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../../services/processApi';
import { Loader2, ChevronDown, ChevronRight, FolderOpen, FileText, Info } from 'lucide-react';

const NO_AREA = '__no_area__';

export default function AllProcesses() {
  const [areas, setAreas] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [a, p] = await Promise.all([
          processAPI.listAreas(),
          processAPI.listProcesses(),
        ]);
        setAreas(a || []);
        setProcesses(p || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  // agrupa procesos por área
  const grouped = useMemo(() => {
    const map = new Map();
    // asegurar orden de áreas existentes
    (areas || []).forEach(a => {
      map.set(a.id, { id: a.id, nombre: a.nombre, color: a.color || '#64748b', procesos: [] });
    });
    processes.forEach(p => {
      const key = p.area_id || NO_AREA;
      if (!map.has(key)) {
        map.set(key, { id: key, nombre: p.area_nombre || 'Sin área', color: '#64748b', procesos: [] });
      }
      map.get(key).procesos.push(p);
    });
    // ordenar procesos alfabéticamente dentro de cada grupo y remover áreas vacías
    const result = Array.from(map.values())
      .filter(g => g.procesos.length > 0)
      .map(g => ({ ...g, procesos: g.procesos.sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    return result;
  }, [areas, processes]);

  const toggle = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500" data-testid="all-processes-loading"><Loader2 className="w-4 h-4 animate-spin"/>Cargando procesos...</div>;
  }

  return (
    <div className="animate-fade-in max-w-4xl" data-testid="all-processes-page">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
          Todos los Procesos
        </h1>
        <p className="text-slate-500 mt-1">
          Explora los procesos organizados por área. El color indica el tipo de proceso.
        </p>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center" data-testid="all-processes-empty">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500">No hay procesos disponibles aún.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="all-processes-tree">
          {grouped.map(area => {
            const isCollapsed = !!collapsed[area.id];
            return (
              <div key={area.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden" data-testid={`area-group-${area.id}`}>
                <button
                  onClick={() => toggle(area.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  data-testid={`area-toggle-${area.id}`}
                >
                  {isCollapsed
                    ? <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0"/>}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: area.color + '20', color: area.color }}
                  >
                    <FolderOpen className="w-5 h-5"/>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-slate-900">{area.nombre}</h2>
                    <p className="text-xs text-slate-500">{area.procesos.length} proceso{area.procesos.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>

                {!isCollapsed && (
                  <ul className="border-t border-slate-100" data-testid={`area-processes-${area.id}`}>
                    {area.procesos.map(p => {
                      const bg = p.tipo_color_fondo || '#f1f5f9';
                      const fg = p.tipo_color_texto || '#334155';
                      return (
                        <li key={p.id} className="border-b last:border-b-0 border-slate-100" data-testid={`all-process-item-${p.id}`}>
                          <button
                            onClick={() => navigate(`/process/admin/processes/${p.id}/info`)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left group"
                          >
                            {/* barra de color del tipo */}
                            <span
                              className="w-1.5 h-10 rounded-full flex-shrink-0"
                              style={{ backgroundColor: bg }}
                              aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono text-slate-400">{p.codigo}</span>
                                <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {p.tipo_nombre && (
                                  <span
                                    className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: bg, color: fg }}
                                  >
                                    {p.tipo_nombre}
                                  </span>
                                )}
                                {!p.activo && (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    Inactivo
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400">{p.total_pasos} paso{p.total_pasos !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <Info className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0"/>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
