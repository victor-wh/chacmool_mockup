import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { processAPI } from '../services/processApi';
import { FolderOpen, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

const NO_AREA = '__no_area__';

/**
 * Sidebar dropdown: "Todos los Procesos" → areas → processes (color-coded by tipo).
 * Clicking a process navigates to its Resumen.
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
        // auto-expand all areas the first time
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
        <div className="mt-1 ml-2 pl-3 border-l border-slate-100 space-y-0.5" data-testid="sidebar-all-processes-tree">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2 px-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin"/>Cargando...
            </div>
          )}
          {!loading && grouped.length === 0 && loaded && (
            <div className="text-xs text-slate-400 py-2 px-2">Sin procesos</div>
          )}
          {!loading && grouped.map(area => {
            const aOpen = areaOpen[area.id];
            return (
              <div key={area.id} data-testid={`sidebar-area-${area.id}`}>
                <button
                  onClick={() => toggleArea(area.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 text-left"
                >
                  {aOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>}
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">{area.nombre}</span>
                  <span className="text-[10px] text-slate-400">{area.procesos.length}</span>
                </button>
                {aOpen && (
                  <ul className="ml-1">
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
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 text-left ${active ? 'bg-slate-50' : ''}`}
                          >
                            <span
                              className="w-1 h-5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: bg }}
                              aria-hidden="true"
                            />
                            <span className={`text-xs truncate ${active ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                              {p.nombre}
                            </span>
                            {p.tipo_nombre && (
                              <span
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: bg, color: fg }}
                              >
                                {p.tipo_nombre}
                              </span>
                            )}
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
