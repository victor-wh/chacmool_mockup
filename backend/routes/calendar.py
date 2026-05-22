"""
Routes for Process Calendar.
Prefix: /api/calendar

Cada proceso puede tener UN schedule (1:1, opcional) con:
  - tipo: 'no_repite' | 'diario' | 'laborales' | 'semanal' | 'mensual' | 'anual'
  - fecha_unica (no_repite), dia_semana (semanal), dia_mes (mensual/anual), mes (anual)
  - hora (opcional), responsable_id (staff), activa

Los eventos del calendario se calculan en memoria a partir de los schedules.
- Admin ve todos los eventos
- Empleado ve únicamente los eventos cuyo responsable_id == su staff_id
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
async def list_schedules(current_user: dict = Depends(get_current_active_user)):
    """Lista todos los schedules (con datos del proceso/responsable). Admin: todos. Empleado: solo los suyos."""
    is_admin = (current_user.get("role") or "").lower() == "admin"
    q = {}
    if not is_admin:
        staff = await _get_user_staff(current_user)
        if not staff:
            return []
        q["responsable_id"] = staff["id"]
    docs = await db.process_schedules.find(q, {"_id": 0}).to_list(2000)
    return [await _enrich_schedule(d) for d in docs]


@router.get("/schedules/{proceso_id}")
async def get_schedule(proceso_id: str, current_user: dict = Depends(get_current_active_user)):
    sch = await db.process_schedules.find_one({"proceso_id": proceso_id}, {"_id": 0})
    if not sch:
        raise HTTPException(404, "Sin programación")
    return await _enrich_schedule(sch)


@router.put("/schedules/{proceso_id}")
async def upsert_schedule(
    proceso_id: str,
    payload: ScheduleIn,
    current_user: dict = Depends(require_admin),
):
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

    existing = await db.process_schedules.find_one({"proceso_id": proceso_id}, {"_id": 0})
    doc = {
        "id": existing["id"] if existing else str(uuid4()),
        "proceso_id": proceso_id,
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
        await db.process_schedules.update_one({"proceso_id": proceso_id}, {"$set": doc})
    else:
        await db.process_schedules.insert_one(dict(doc))
    return await _enrich_schedule(doc)


@router.delete("/schedules/{proceso_id}")
async def delete_schedule(proceso_id: str, current_user: dict = Depends(require_admin)):
    res = await db.process_schedules.delete_one({"proceso_id": proceso_id})
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
    mine: bool = Query(False),
    current_user: dict = Depends(get_current_active_user),
):
    """Calcula eventos virtuales en el rango. Admin ve todos; empleado solo los suyos."""
    try:
        d_from = datetime.strptime(fecha_desde, "%Y-%m-%d").date()
        d_to = datetime.strptime(fecha_hasta, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Fechas deben tener formato YYYY-MM-DD")
    if d_to < d_from:
        raise HTTPException(400, "fecha_hasta debe ser >= fecha_desde")

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

    schedules = await db.process_schedules.find(q, {"_id": 0}).to_list(2000)
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
        for d in _date_range(d_from, d_to):
            if not _matches(s, d):
                continue
            events.append({
                "id": f"{s['id']}|{d.strftime('%Y-%m-%d')}",
                "schedule_id": s["id"],
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
async def list_processes_without_schedule(current_user: dict = Depends(require_admin)):
    """Útil para el sidebar de 'procesos sin programar' tipo Planner."""
    scheduled_ids = set()
    async for s in db.process_schedules.find({}, {"_id": 0, "proceso_id": 1}):
        scheduled_ids.add(s["proceso_id"])
    procs = await db.process_definitions.find(
        {"activo": True}, {"_id": 0}
    ).sort("nombre", 1).to_list(2000)
    return [p for p in procs if p["id"] not in scheduled_ids]
