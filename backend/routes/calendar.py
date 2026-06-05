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
            events.append({
                "id": f"{s['id']}|{d.strftime('%Y-%m-%d')}",
                "schedule_id": s["id"],
                "schedule_type": s_type,
                "proceso_id": proc["id"],
                "proceso_codigo": proc.get("codigo", ""),
                "proceso_nombre": proc.get("nombre", ""),
                "tipo_nombre": proc.get("tipo_nombre", ""),
                "tipo_color_fondo": proc.get("tipo_color_fondo", "#3B82F6"),
                "tipo_color_texto": proc.get("tipo_color_texto", "#FFFFFF"),
                "area_nombre": proc.get("area_nombre", ""),
                "fecha": d.strftime("%Y-%m-%d"),
                "hora": s.get("hora") or None,
                "tipo_recurrencia": s["tipo"],
                "responsable_id": s.get("responsable_id"),
                "responsable_nombre": (resp or {}).get("user_name", "") if resp else "",
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
