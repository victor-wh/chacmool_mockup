import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processAPI } from '../services/processApi';
import { FolderOpen, Folder, ChevronDown, ChevronRight, Info, Loader2 } from 'lucide-react';

const NO_AREA = '__no_area__';

/**
 * Sidebar dropdown: "Todos los Procesos" → tarjetas por área con sus procesos
 * en el formato solicitado (chevron + folder + nombre + contador · barra de
 * color + código + nombre + tipo badge + pasos + info icon).
 */
export default function ProcessTreeDropdown() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [grouped, setGrouped] = useState([]);
  const [areaOpen, setAreaOpen] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [areas, procs] = await Promise.all([
          processAPI.listAreas(),
          processAPI.listProcesses(),
        ]);
        if (cancelled) return;
        const map = new Map();
        (areas || []).forEach(a => {
          map.set(a.id, { id: a.id, nombre: a.nombre, color: a.color || '#64748b', procesos: [] });
        });
        (procs || []).forEach(p => {
          const key = p.area_id || NO_AREA;
          if (!map.has(key)) {
            map.set(key, { id: key, nombre: p.area_nombre || 'Sin área', color: '#64748b', procesos: [] });
          }
          map.get(key).procesos.push(p);
        });
        const list = Array.from(map.values())
          .filter(g => g.procesos.length > 0)
          .map(g => ({ ...g, procesos: g.procesos.sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setGrouped(list);
        const next = {};
        list.forEach(g => { next[g.id] = true; });
        setAreaOpen(next);
        setLoaded(true);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, loaded]);

  const toggleArea = (id) => setAreaOpen(s => ({ ...s, [id]: !s[id] }));
  const isActiveProc = (pid) => location.pathname.includes(`/process/admin/processes/${pid}`);

  return (
    <div className="select-none" data-testid="sidebar-all-processes">
      {/* Top-level toggle (matches other sidebar nav-link styling) */}
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="sidebar-all-processes-toggle"
        className="w-full nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:text-slate-900 transition-all"
      >
        <FolderOpen className="w-5 h-5"/>
        <div className="flex-1 text-left">
          <span className="block">Todos los Procesos</span>
          <span className="text-xs text-slate-400">Explorar por área</span>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-400"/>
          : <ChevronRight className="w-4 h-4 text-slate-400"/>}
      </button>

      {open && (
        <div className="mt-2 space-y-2" data-testid="sidebar-all-processes-tree">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2 px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin"/>Cargando...
            </div>
          )}
          {!loading && grouped.length === 0 && loaded && (
            <div className="text-xs text-slate-400 py-2 px-2">Sin procesos</div>
          )}
          {!loading && grouped.map(area => {
            const aOpen = !!areaOpen[area.id];
            return (
              <div
                key={area.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                data-testid={`sidebar-area-${area.id}`}
              >
                {/* Encabezado del área */}
                <button
                  onClick={() => toggleArea(area.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  {aOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>}
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-4 h-4"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{area.nombre}</p>
                    <p className="text-[11px] text-slate-400">{area.procesos.length} proceso{area.procesos.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>

                {aOpen && (
                  <ul className="border-t border-slate-100 divide-y divide-slate-100">
                    {area.procesos.map(p => {
                      const bg = p.tipo_color_fondo || '#f1f5f9';
                      const fg = p.tipo_color_texto || '#334155';
                      const active = isActiveProc(p.id);
                      return (
                        <li key={p.id}>
                          <button
                            onClick={() => navigate(`/process/admin/processes/${p.id}/info`)}
                            data-testid={`sidebar-process-${p.id}`}
                            title={p.nombre}
                            className={`w-full flex items-stretch gap-2 pr-2.5 py-2 hover:bg-slate-50 transition-colors text-left ${active ? 'bg-slate-50' : ''}`}
                          >
                            {/* Barra vertical coloreada del tipo */}
                            <span
                              className="w-1 rounded-r-full flex-shrink-0"
                              style={{ backgroundColor: bg }}
                              aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0 py-0.5">
                              <p className="text-[10px] font-mono text-slate-400 leading-tight">{p.codigo}</p>
                              <p className={`text-xs font-medium leading-tight truncate ${active ? 'text-slate-900' : 'text-slate-800'}`}>
                                {p.nombre}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {p.tipo_nombre && (
                                  <span
                                    className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: bg, color: fg }}
                                  >
                                    {p.tipo_nombre}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">{p.total_pasos} paso{p.total_pasos !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                            <Info className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 self-center"/>
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
