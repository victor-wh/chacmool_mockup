"""
Routes for Process Calendar.
Prefix: /api/calendar

Cada proceso puede tener HASTA 3 schedules (uno por schedule_type):
  - schedule_type: 'ejecucion' | 'supervision' | 'auditoria'
  - tipo: 'no_repite' | 'diario' | 'laborales' | 'semanal' | 'mensual' | 'anual'
  - fecha_unica (no_repite), dia_semana (semanal), dia_mes (mensual/anual), mes (anual)
  - hora (opcional), responsable_id (staff), activa

Los eventos del calendario se calculan en memoria a partir de los schedules.
- Admin ve todos los eventos
- Empleado ve únicamente los eventos cuyo responsable_id == su staff_id

Migración suave: schedules existentes sin schedule_type se tratan como 'ejecucion'.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from uuid import uuid4
from datetime import datetime, date, timedelta
import calendar
from pydantic import BaseModel

from middlewares.auth import db, get_current_active_user, require_admin


router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# -------------------- Models --------------------
TIPOS_VALIDOS = {"no_repite", "diario", "laborales", "semanal", "mensual", "anual"}
SCHEDULE_TYPES = {"ejecucion", "supervision", "auditoria"}
DEFAULT_SCHEDULE_TYPE = "ejecucion"


class ScheduleIn(BaseModel):
    tipo: str  # one of TIPOS_VALIDOS
    fecha_unica: Optional[str] = None  # YYYY-MM-DD
    dia_semana: Optional[int] = None  # 0=Lun ... 6=Dom
    dia_mes: Optional[int] = None  # 1..31
    mes: Optional[int] = None  # 1..12
    hora: Optional[str] = None  # HH:MM
    responsable_id: Optional[str] = None
    activa: bool = True


# -------------------- Helpers --------------------
def _now() -> datetime:
    return datetime.now()


def _safe_dom(year: int, month: int, day: int) -> int:
    last = calendar.monthrange(year, month)[1]
    return min(day, last)


def _stype(sch: dict) -> str:
    """Normaliza schedule_type para docs antiguos."""
    return sch.get("schedule_type") or DEFAULT_SCHEDULE_TYPE


def _validate_stype(schedule_type: str) -> str:
    if schedule_type not in SCHEDULE_TYPES:
        raise HTTPException(400, f"schedule_type inválido. Permitidos: {sorted(SCHEDULE_TYPES)}")
    return schedule_type


def _matches(sch: dict, d: date) -> bool:
    """Indica si una fecha aplica al schedule."""
    if not sch.get("activa", True):
        return False
    tipo = sch.get("tipo")
    if tipo == "no_repite":
        fu = sch.get("fecha_unica")
        if not fu:
            return False
        try:
            return datetime.strptime(fu, "%Y-%m-%d").date() == d
        except ValueError:
            return False
    if tipo == "diario":
        return True
    if tipo == "laborales":
        return d.weekday() <= 4  # Lun-Vie
    if tipo == "semanal":
        ds = sch.get("dia_semana")
        return ds is not None and d.weekday() == int(ds)
    if tipo == "mensual":
        dm = sch.get("dia_mes")
        if not dm:
            return False
        return d.day == _safe_dom(d.year, d.month, int(dm))
    if tipo == "anual":
        m, dm = sch.get("mes"), sch.get("dia_mes")
        if not (m and dm):
            return False
        if d.month != int(m):
            return False
        return d.day == _safe_dom(d.year, d.month, int(dm))
    return False


def _date_range(d_from: date, d_to: date):
    cur = d_from
    while cur <= d_to:
        yield cur
        cur = cur + timedelta(days=1)


async def _enrich_schedule(sch: dict) -> dict:
    """Adjunta datos del proceso y responsable."""
    sch["schedule_type"] = _stype(sch)
    proc = await db.process_definitions.find_one({"id": sch["proceso_id"]}, {"_id": 0})
    if proc:
        sch["proceso_codigo"] = proc.get("codigo", "")
        sch["proceso_nombre"] = proc.get("nombre", "")
        sch["proceso_activo"] = bool(proc.get("activo", True))
        sch["tipo_nombre"] = proc.get("tipo_nombre", "")
        sch["tipo_color_fondo"] = proc.get("tipo_color_fondo", "#3B82F6")
        sch["tipo_color_texto"] = proc.get("tipo_color_texto", "#FFFFFF")
        sch["area_nombre"] = proc.get("area_nombre", "")
    if sch.get("responsable_id"):
        st = await db.process_staff.find_one({"id": sch["responsable_id"]}, {"_id": 0})
        sch["responsable_nombre"] = (st or {}).get("user_name", "")
    else:
        sch["responsable_nombre"] = ""
    return sch


async def _get_user_staff(user: dict) -> Optional[dict]:
    return await db.process_staff.find_one({"user_id": user["id"]}, {"_id": 0})


# ============================================================
# Schedules CRUD
# ============================================================
@router.get("/schedules")
async def list_schedules(
    schedule_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_active_user),
):
    """Lista todos los schedules (con datos del proceso/responsable).
    - Admin: todos
    - Empleado: solo los suyos
    - Opcionalmente filtrar por schedule_type.
    """
    is_admin = (current_user.get("role") or "").lower() == "admin"
    q = {}
    if not is_admin:
        staff = await _get_user_staff(current_user)
        if not staff:
            return []
        q["responsable_id"] = staff["id"]
    docs = await db.process_schedules.find(q, {"_id": 0}).to_list(5000)
    if schedule_type:
        _validate_stype(schedule_type)
        docs = [d for d in docs if _stype(d) == schedule_type]
    return [await _enrich_schedule(d) for d in docs]


@router.get("/schedules/{proceso_id}")
async def get_schedule(
    proceso_id: str,
    schedule_type: str = Query(DEFAULT_SCHEDULE_TYPE),
    current_user: dict = Depends(get_current_active_user),
):
    _validate_stype(schedule_type)
    sch = await db.process_schedules.find_one(
        {"proceso_id": proceso_id, "schedule_type": schedule_type}, {"_id": 0}
    )
    # Fallback para docs antiguos sin schedule_type (sólo aplica a 'ejecucion')
    if not sch and schedule_type == DEFAULT_SCHEDULE_TYPE:
        sch = await db.process_schedules.find_one(
            {"proceso_id": proceso_id, "schedule_type": {"$exists": False}}, {"_id": 0}
        )
    if not sch:
        raise HTTPException(404, "Sin programación")
    return await _enrich_schedule(sch)


@router.put("/schedules/{proceso_id}")
async def upsert_schedule(
    proceso_id: str,
    payload: ScheduleIn,
    schedule_type: str = Query(DEFAULT_SCHEDULE_TYPE),
    current_user: dict = Depends(require_admin),
):
    _validate_stype(schedule_type)
    if payload.tipo not in TIPOS_VALIDOS:
        raise HTTPException(400, f"tipo inválido. Permitidos: {sorted(TIPOS_VALIDOS)}")

    proc = await db.process_definitions.find_one({"id": proceso_id}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Proceso no encontrado")

    # Validaciones de campos requeridos según tipo
    if payload.tipo == "no_repite":
        if not payload.fecha_unica:
            raise HTTPException(400, "fecha_unica es requerida para 'no_repite'")
        try:
            datetime.strptime(payload.fecha_unica, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, "fecha_unica debe tener formato YYYY-MM-DD")
    if payload.tipo == "semanal" and payload.dia_semana is None:
        raise HTTPException(400, "dia_semana (0=Lun..6=Dom) es requerido para 'semanal'")
    if payload.tipo in ("mensual", "anual") and not payload.dia_mes:
        raise HTTPException(400, "dia_mes (1-31) es requerido para 'mensual' / 'anual'")
    if payload.tipo == "anual" and not payload.mes:
        raise HTTPException(400, "mes (1-12) es requerido para 'anual'")

    # Buscar existente: primero (proceso_id, schedule_type); si no hay y es 'ejecucion',
    # intentar legacy (sin schedule_type) para migrarlo.
    existing = await db.process_schedules.find_one(
        {"proceso_id": proceso_id, "schedule_type": schedule_type}, {"_id": 0}
    )
    if not existing and schedule_type == DEFAULT_SCHEDULE_TYPE:
        existing = await db.process_schedules.find_one(
            {"proceso_id": proceso_id, "schedule_type": {"$exists": False}}, {"_id": 0}
        )

    doc = {
        "id": existing["id"] if existing else str(uuid4()),
        "proceso_id": proceso_id,
        "schedule_type": schedule_type,
        "tipo": payload.tipo,
        "fecha_unica": payload.fecha_unica if payload.tipo == "no_repite" else None,
        "dia_semana": int(payload.dia_semana) if payload.tipo == "semanal" else None,
        "dia_mes": int(payload.dia_mes) if payload.tipo in ("mensual", "anual") else None,
        "mes": int(payload.mes) if payload.tipo == "anual" else None,
        "hora": payload.hora or None,
        "responsable_id": payload.responsable_id or None,
        "activa": bool(payload.activa),
        "created_at": existing.get("created_at") if existing else _now(),
        "updated_at": _now(),
    }
    if existing:
        await db.process_schedules.update_one({"id": existing["id"]}, {"$set": doc})
    else:
        await db.process_schedules.insert_one(dict(doc))
    return await _enrich_schedule(doc)


@router.delete("/schedules/{proceso_id}")
async def delete_schedule(
    proceso_id: str,
    schedule_type: str = Query(DEFAULT_SCHEDULE_TYPE),
    current_user: dict = Depends(require_admin),
):
    _validate_stype(schedule_type)
    # Borra el del tipo solicitado; si es 'ejecucion' también limpia el legacy sin tipo.
    if schedule_type == DEFAULT_SCHEDULE_TYPE:
        res = await db.process_schedules.delete_many({
            "proceso_id": proceso_id,
            "$or": [{"schedule_type": schedule_type}, {"schedule_type": {"$exists": False}}],
        })
    else:
        res = await db.process_schedules.delete_many({
            "proceso_id": proceso_id, "schedule_type": schedule_type,
        })
    return {"deleted": res.deleted_count > 0}


# ============================================================
# Eventos del calendario (virtuales)
# ============================================================
@router.get("/events")
async def list_events(
    fecha_desde: str = Query(..., description="YYYY-MM-DD"),
    fecha_hasta: str = Query(..., description="YYYY-MM-DD"),
    proceso_id: Optional[str] = Query(None),
    responsable_id: Optional[str] = Query(None),
    schedule_types: Optional[str] = Query(
        None, description="Comma-separated: ejecucion,supervision,auditoria"
    ),
    mine: bool = Query(False),
    current_user: dict = Depends(get_current_active_user),
):
    """Calcula eventos virtuales en el rango. Admin ve todos; empleado solo los suyos.
    schedule_types permite limitar la salida a un subconjunto."""
    try:
        d_from = datetime.strptime(fecha_desde, "%Y-%m-%d").date()
        d_to = datetime.strptime(fecha_hasta, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Fechas deben tener formato YYYY-MM-DD")
    if d_to < d_from:
        raise HTTPException(400, "fecha_hasta debe ser >= fecha_desde")

    allowed_types = set(SCHEDULE_TYPES)
    if schedule_types:
        req = {t.strip() for t in schedule_types.split(",") if t.strip()}
        bad = req - SCHEDULE_TYPES
        if bad:
            raise HTTPException(400, f"schedule_types inválidos: {sorted(bad)}")
        allowed_types = req

    is_admin = (current_user.get("role") or "").lower() == "admin"
    q = {"activa": True}
    if proceso_id:
        q["proceso_id"] = proceso_id
    if responsable_id:
        q["responsable_id"] = responsable_id
    if mine or not is_admin:
        staff = await _get_user_staff(current_user)
        if not staff:
            return []
        q["responsable_id"] = staff["id"]

    schedules = await db.process_schedules.find(q, {"_id": 0}).to_list(5000)
    # filtrar por tipo (en memoria por compat con legacy docs)
    schedules = [s for s in schedules if _stype(s) in allowed_types]

    # Pre-carga procesos
    proc_ids = list({s["proceso_id"] for s in schedules})
    procs = {}
    if proc_ids:
        async for p in db.process_definitions.find({"id": {"$in": proc_ids}, "activo": True}, {"_id": 0}):
            procs[p["id"]] = p
    # Pre-carga responsables
    resp_ids = list({s["responsable_id"] for s in schedules if s.get("responsable_id")})
    resps = {}
    if resp_ids:
        async for st in db.process_staff.find({"id": {"$in": resp_ids}}, {"_id": 0}):
            resps[st["id"]] = st

    # Pre-carga registros para detectar "vencido / completado":
    #   - ejecuciones (process_executions) por (proceso_id, fecha) para schedule_type='ejecucion'
    #   - supervisiones (supervisions) por (proceso_id, fecha) para schedule_type='supervision'
    # auditoria: aún no hay módulo. Sólo se considera "vencida" o "futura" por fecha.
    today_iso = date.today().strftime("%Y-%m-%d")
    span_from = d_from.strftime("%Y-%m-%d")
    span_to = d_to.strftime("%Y-%m-%d")
    execs_by_key: dict = {}
    sups_by_key: dict = {}
    auds_by_key: dict = {}
    if proc_ids and "ejecucion" in allowed_types:
        async for ex in db.process_executions.find(
            {"proceso_id": {"$in": proc_ids}, "fecha": {"$gte": span_from, "$lte": span_to}},
            {"_id": 0, "id": 1, "proceso_id": 1, "fecha": 1, "estado": 1, "codigo_ejecucion": 1},
        ):
            key = (ex["proceso_id"], ex["fecha"])
            execs_by_key.setdefault(key, []).append(ex)
    if proc_ids and "supervision" in allowed_types:
        async for sup in db.supervisions.find(
            {"proceso_id": {"$in": proc_ids}, "fecha": {"$gte": span_from, "$lte": span_to}},
            {"_id": 0, "id": 1, "proceso_id": 1, "fecha": 1, "estado": 1, "codigo": 1},
        ):
            key = (sup["proceso_id"], sup["fecha"])
            sups_by_key.setdefault(key, []).append(sup)
    if proc_ids and "auditoria" in allowed_types:
        async for aud in db.audits.find(
            {"proceso_id": {"$in": proc_ids}, "fecha": {"$gte": span_from, "$lte": span_to}},
            {"_id": 0, "id": 1, "proceso_id": 1, "fecha": 1, "estado": 1, "codigo": 1},
        ):
            key = (aud["proceso_id"], aud["fecha"])
            auds_by_key.setdefault(key, []).append(aud)

    def _estado_for(s_type: str, proc_id: str, fecha_iso: str) -> tuple:
        """Devuelve (estado_realizacion, completada_ids, completada_codigos).
        estado in: 'futura' | 'hoy' | 'completada' | 'vencida'."""
        if fecha_iso > today_iso:
            return "futura", [], []
        if s_type == "ejecucion":
            matches = execs_by_key.get((proc_id, fecha_iso), [])
            if matches:
                return "completada", [m["id"] for m in matches], [m.get("codigo_ejecucion") for m in matches]
        elif s_type == "supervision":
            matches = sups_by_key.get((proc_id, fecha_iso), [])
            if matches:
                return "completada", [m["id"] for m in matches], [m.get("codigo") for m in matches]
        elif s_type == "auditoria":
            matches = auds_by_key.get((proc_id, fecha_iso), [])
            if matches:
                return "completada", [m["id"] for m in matches], [m.get("codigo") for m in matches]
        # No completada
        if fecha_iso == today_iso:
            return "hoy", [], []
        return "vencida", [], []

    events = []
    for s in schedules:
        proc = procs.get(s["proceso_id"])
        if not proc:
            continue  # proceso inactivo o eliminado
        resp = resps.get(s.get("responsable_id")) if s.get("responsable_id") else None
        s_type = _stype(s)
        for d in _date_range(d_from, d_to):
            if not _matches(s, d):
                continue
            fecha_iso = d.strftime("%Y-%m-%d")
            estado_real, completada_ids, completada_codigos = _estado_for(s_type, proc["id"], fecha_iso)
            events.append({
                "id": f"{s['id']}|{fecha_iso}",
                "schedule_id": s["id"],
                "schedule_type": s_type,
                "proceso_id": proc["id"],
                "proceso_codigo": proc.get("codigo", ""),
                "proceso_nombre": proc.get("nombre", ""),
                "tipo_nombre": proc.get("tipo_nombre", ""),
                "tipo_color_fondo": proc.get("tipo_color_fondo", "#3B82F6"),
                "tipo_color_texto": proc.get("tipo_color_texto", "#FFFFFF"),
                "area_nombre": proc.get("area_nombre", ""),
                "fecha": fecha_iso,
                "hora": s.get("hora") or None,
                "tipo_recurrencia": s["tipo"],
                "responsable_id": s.get("responsable_id"),
                "responsable_nombre": (resp or {}).get("user_name", "") if resp else "",
                "estado_realizacion": estado_real,
                "completada_ids": completada_ids,
                "completada_codigos": completada_codigos,
            })
    events.sort(key=lambda e: (e["fecha"], e["hora"] or "", e["proceso_codigo"]))
    return events


@router.get("/processes-without-schedule")
async def list_processes_without_schedule(
    schedule_type: str = Query(DEFAULT_SCHEDULE_TYPE),
    current_user: dict = Depends(require_admin),
):
    """Procesos activos sin schedule del tipo solicitado."""
    _validate_stype(schedule_type)
    scheduled_ids = set()
    cursor = db.process_schedules.find({}, {"_id": 0, "proceso_id": 1, "schedule_type": 1})
    async for s in cursor:
        if _stype(s) == schedule_type:
            scheduled_ids.add(s["proceso_id"])
    procs = await db.process_definitions.find(
        {"activo": True}, {"_id": 0}
    ).sort("nombre", 1).to_list(2000)
    return [p for p in procs if p["id"] not in scheduled_ids]



# ============================================================
# Matriz mensual: procesos × semanas (estado de supervisión)
# ============================================================
DOW_ES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
MES_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


def _describe_schedule(s: Optional[dict]) -> str:
    if not s:
        return "—"
    tipo = s.get("tipo")
    hora = f" · {s['hora']}" if s.get("hora") else ""
    if tipo == "no_repite":
        return f"Único: {s.get('fecha_unica') or '—'}{hora}"
    if tipo == "diario":
        return f"Diario{hora}"
    if tipo == "laborales":
        return f"Lun-Vie{hora}"
    if tipo == "semanal":
        ds = s.get("dia_semana")
        if ds is None or not (0 <= int(ds) <= 6):
            return f"Semanal{hora}"
        return f"{DOW_ES_FULL[int(ds)]}{hora}"
    if tipo == "mensual":
        return f"Día {s.get('dia_mes')} de cada mes{hora}"
    if tipo == "anual":
        return f"{s.get('dia_mes')} {MES_ES[(int(s.get('mes') or 1) - 1) % 12]}{hora}"
    return "—"


def _month_weeks(year: int, month: int):
    """Devuelve la lista de semanas (Lun-Dom) que se intersectan con el mes.
    Cada item: {label, start: date, end: date}. La semana se etiqueta por orden 1..N."""
    first = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    last = date(year, month, last_day)
    # Lunes de la semana del primer día
    start = first - timedelta(days=first.weekday())
    weeks = []
    cur = start
    idx = 1
    while cur <= last:
        end = cur + timedelta(days=6)
        weeks.append({
            "label": f"Semana {idx}",
            "start": cur,
            "end": end,
            "start_iso": cur.strftime("%Y-%m-%d"),
            "end_iso": end.strftime("%Y-%m-%d"),
        })
        cur = cur + timedelta(days=7)
        idx += 1
    return weeks


def _schedule_hits_in_range(sch: Optional[dict], d_from: date, d_to: date) -> bool:
    if not sch:
        return False
    for d in _date_range(d_from, d_to):
        if _matches(sch, d):
            return True
    return False


def _schedule_hit_dates(sch: Optional[dict], d_from: date, d_to: date) -> list:
    """Lista de fechas ISO (YYYY-MM-DD) donde el schedule aplica en el rango."""
    if not sch:
        return []
    out = []
    for d in _date_range(d_from, d_to):
        if _matches(sch, d):
            out.append(d.strftime("%Y-%m-%d"))
    return out


def _criticidad_from_steps(critical_count: int, total: int) -> str:
    if total <= 0:
        return "—"
    ratio = critical_count / total
    if ratio >= 0.5:
        return "Alta"
    if ratio > 0 or critical_count > 0:
        return "Media"
    return "Baja"


@router.get("/matrix")
async def get_matrix(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    include_inactive: bool = Query(False),
    current_user: dict = Depends(require_admin),
):
    """Matriz: una fila por proceso activo con su frecuencia (3 tipos),
    criticidad, responsable de ejecución y estado de supervisión por semana del mes.
    Si include_inactive=true se muestran también los procesos inactivos.
    """
    weeks = _month_weeks(year, month)

    # Procesos: activos por defecto, o todos si include_inactive
    proc_query = {} if include_inactive else {"activo": True}
    procs = await db.process_definitions.find(proc_query, {"_id": 0}).sort("codigo", 1).to_list(5000)
    if not procs:
        return {"year": year, "month": month, "weeks": [{"label": w["label"], "start": w["start_iso"], "end": w["end_iso"]} for w in weeks], "rows": []}

    proc_ids = [p["id"] for p in procs]

    # Steps -> derivar criticidad por proceso
    crit_count = {}
    total_steps = {}
    async for st in db.process_steps.find({"proceso_id": {"$in": proc_ids}}, {"_id": 0, "proceso_id": 1, "es_critico": 1}):
        pid = st["proceso_id"]
        total_steps[pid] = total_steps.get(pid, 0) + 1
        if st.get("es_critico"):
            crit_count[pid] = crit_count.get(pid, 0) + 1

    # Schedules de los 3 tipos
    schedules_by_proc = {pid: {} for pid in proc_ids}
    async for s in db.process_schedules.find({"proceso_id": {"$in": proc_ids}}, {"_id": 0}):
        st = _stype(s)
        schedules_by_proc.setdefault(s["proceso_id"], {})[st] = s

    # Responsables (staff)
    resp_ids = set()
    for sdict in schedules_by_proc.values():
        for s in sdict.values():
            if s.get("responsable_id"):
                resp_ids.add(s["responsable_id"])
    resps = {}
    if resp_ids:
        async for st in db.process_staff.find({"id": {"$in": list(resp_ids)}}, {"_id": 0}):
            resps[st["id"]] = st.get("user_name") or ""

    # Supervisiones del mes (cualquiera que toque cualquier semana de las listadas)
    span_start = weeks[0]["start_iso"] if weeks else ""
    span_end = weeks[-1]["end_iso"] if weeks else ""
    sup_by_proc = {pid: [] for pid in proc_ids}
    exec_by_proc = {pid: [] for pid in proc_ids}
    aud_by_proc = {pid: [] for pid in proc_ids}
    if weeks:
        async for sup in db.supervisions.find(
            {"proceso_id": {"$in": proc_ids}, "fecha": {"$gte": span_start, "$lte": span_end}},
            {"_id": 0, "proceso_id": 1, "fecha": 1, "estado": 1, "id": 1, "codigo": 1},
        ):
            sup_by_proc.setdefault(sup["proceso_id"], []).append(sup)
        async for ex in db.process_executions.find(
            {"proceso_id": {"$in": proc_ids}, "fecha": {"$gte": span_start, "$lte": span_end}},
            {"_id": 0, "proceso_id": 1, "fecha": 1, "estado": 1, "id": 1, "codigo_ejecucion": 1},
        ):
            exec_by_proc.setdefault(ex["proceso_id"], []).append(ex)
        async for aud in db.audits.find(
            {"proceso_id": {"$in": proc_ids}, "fecha": {"$gte": span_start, "$lte": span_end}},
            {"_id": 0, "proceso_id": 1, "fecha": 1, "estado": 1, "id": 1, "codigo": 1, "aprobada": 1},
        ):
            aud_by_proc.setdefault(aud["proceso_id"], []).append(aud)

    rows = []
    for p in procs:
        pid = p["id"]
        sdict = schedules_by_proc.get(pid, {})
        sch_e = sdict.get("ejecucion")
        sch_s = sdict.get("supervision")
        sch_a = sdict.get("auditoria")
        resp_name = ""
        if sch_e and sch_e.get("responsable_id"):
            resp_name = resps.get(sch_e["responsable_id"], "")

        # Estado por semana
        sups = sup_by_proc.get(pid, [])
        execs = exec_by_proc.get(pid, [])
        auds = aud_by_proc.get(pid, [])
        week_states = []
        for w in weeks:
            requerida = _schedule_hits_in_range(sch_s, w["start"], w["end"])
            exec_hits = _schedule_hit_dates(sch_e, w["start"], w["end"])
            sup_hits  = _schedule_hit_dates(sch_s, w["start"], w["end"])
            aud_hits  = _schedule_hit_dates(sch_a, w["start"], w["end"])
            sups_in_week = [
                s for s in sups
                if s.get("fecha") and w["start_iso"] <= s["fecha"] <= w["end_iso"]
            ]
            execs_in_week = [
                e for e in execs
                if e.get("fecha") and w["start_iso"] <= e["fecha"] <= w["end_iso"]
            ]
            auds_in_week = [
                a for a in auds
                if a.get("fecha") and w["start_iso"] <= a["fecha"] <= w["end_iso"]
            ]
            completada = any(s.get("estado") == "completada" for s in sups_in_week)
            realizada = bool(sups_in_week)
            week_states.append({
                "label": w["label"],
                "start": w["start_iso"],
                "end": w["end_iso"],
                # Listas detalladas (id + codigo + estado + fecha)
                "ejecuciones": [
                    {"id": e["id"], "codigo": e.get("codigo_ejecucion", ""),
                     "estado": e.get("estado"), "fecha": e.get("fecha")}
                    for e in execs_in_week
                ],
                "supervisiones": [
                    {"id": s["id"], "codigo": s.get("codigo", ""),
                     "estado": s.get("estado"), "fecha": s.get("fecha")}
                    for s in sups_in_week
                ],
                "auditorias": [
                    {"id": a["id"], "codigo": a.get("codigo", ""),
                     "estado": a.get("estado"), "aprobada": a.get("aprobada"),
                     "fecha": a.get("fecha")}
                    for a in auds_in_week
                ],
                # Compat con UI previo (resumen general)
                "supervision_requerida": requerida,
                "supervision_realizada": realizada,
                "supervision_completada": completada,
                "supervision_count": len(sups_in_week),
                "supervision_ids": [s.get("id") for s in sups_in_week],
                "supervision_codigos": [s.get("codigo") for s in sups_in_week],
                # Fechas programadas (schedules) por tipo, para filtros Hoy/Semana/Mes
                "ejecuciones_programadas": exec_hits,
                "supervisiones_programadas": sup_hits,
                "auditorias_programadas": aud_hits,
            })

        rows.append({
            "proceso_id": pid,
            "codigo": p.get("codigo", ""),
            "nombre": p.get("nombre", ""),
            "area_nombre": p.get("area_nombre", ""),
            "tipo_nombre": p.get("tipo_nombre", ""),
            "tipo_color_fondo": p.get("tipo_color_fondo", "#3B82F6"),
            "tipo_color_texto": p.get("tipo_color_texto", "#FFFFFF"),
            "activo": bool(p.get("activo", True)),
            "responsable_nombre": resp_name,
            "criticidad": _criticidad_from_steps(crit_count.get(pid, 0), total_steps.get(pid, 0)),
            "total_pasos": total_steps.get(pid, 0),
            "pasos_criticos": crit_count.get(pid, 0),
            "frecuencia_proceso": _describe_schedule(sch_e),
            "frecuencia_supervision": _describe_schedule(sch_s),
            "frecuencia_auditoria": _describe_schedule(sch_a),
            "weeks": week_states,
        })

    return {
        "year": year,
        "month": month,
        "weeks": [{"label": w["label"], "start": w["start_iso"], "end": w["end_iso"]} for w in weeks],
        "rows": rows,
    }
