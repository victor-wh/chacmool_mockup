"""
Routes for Process Schedule (programación periódica).
Prefix: /api/process-schedule

- Admin: ver/listar/regenerar todas las ejecuciones programadas.
- Empleado: solo las suyas.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from uuid import uuid4
from datetime import datetime, date, timedelta
import calendar

from middlewares.auth import db, get_current_active_user, require_admin


router = APIRouter(prefix="/api/process-schedule", tags=["process-schedule"])


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
def _now():
    return datetime.now()


def _today_str() -> str:
    return _now().strftime("%Y-%m-%d")


def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def _last_dom(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def _safe_day_of_month(year: int, month: int, day: int) -> int:
    """Recorta el día si es mayor al último del mes (ej. 31 de febrero -> 28/29)."""
    return min(day, _last_dom(year, month))


def _matches(prog: dict, d: date) -> Optional[str]:
    """Si la fecha d coincide con la programación, retorna 'HH:MM' (o '' si sin hora). Si no, None."""
    if not prog or not prog.get("activa", True):
        return None
    tipo = prog.get("tipo", "eventual")
    hora = prog.get("hora") or ""

    if tipo == "diario":
        return hora
    if tipo == "semanal":
        ds = prog.get("dia_semana")
        if ds is None:
            return None
        # weekday(): Monday is 0
        return hora if d.weekday() == int(ds) else None
    if tipo == "mensual":
        dm = prog.get("dia_mes")
        if not dm:
            return None
        target = _safe_day_of_month(d.year, d.month, int(dm))
        return hora if d.day == target else None
    if tipo == "trimestral":
        meses = prog.get("meses_trimestre") or [1, 4, 7, 10]
        dm = prog.get("dia_mes") or 1
        if d.month not in meses:
            return None
        target = _safe_day_of_month(d.year, d.month, int(dm))
        return hora if d.day == target else None
    if tipo == "anual":
        m = prog.get("mes")
        dm = prog.get("dia_mes")
        if not (m and dm):
            return None
        if d.month != int(m):
            return None
        target = _safe_day_of_month(d.year, d.month, int(dm))
        return hora if d.day == target else None
    # eventual: no genera slots
    return None


async def _enrich_staff_name(staff_id: Optional[str]) -> str:
    if not staff_id:
        return ""
    s = await db.process_staff.find_one({"id": staff_id}, {"_id": 0})
    return (s or {}).get("user_name", "")


def _date_range(d_from: date, d_to: date):
    cur = d_from
    while cur <= d_to:
        yield cur
        cur = cur + timedelta(days=1)


async def _generate_for_process(
    proc: dict, d_from: date, d_to: date, *, replace: bool = True
) -> int:
    """
    Genera scheduled executions del proceso entre d_from y d_to.
    Si replace=True, borra los slots 'programada' previos (no toca iniciados/completados).
    Retorna número de slots creados.
    """
    prog = proc.get("programacion") or {}
    if not prog or not prog.get("activa", True):
        return 0
    if prog.get("tipo") in (None, "eventual"):
        return 0

    if replace:
        await db.process_scheduled_executions.delete_many({
            "proceso_id": proc["id"],
            "fecha": {"$gte": d_from.strftime("%Y-%m-%d"), "$lte": d_to.strftime("%Y-%m-%d")},
            "estado": "programada",
        })

    responsable_id = proc.get("responsable_id")
    responsable_nombre = await _enrich_staff_name(responsable_id)
    criticidad = prog.get("criticidad", "medio")

    today = _now().date()
    created = 0
    for d in _date_range(d_from, d_to):
        hora = _matches(prog, d)
        if hora is None:
            continue
        # Evitar duplicados: si existe un slot para la misma fecha+proceso, saltar
        exists = await db.process_scheduled_executions.find_one({
            "proceso_id": proc["id"],
            "fecha": d.strftime("%Y-%m-%d"),
        })
        if exists:
            continue
        estado = "programada"
        if d < today:
            estado = "atrasada"
        slot = {
            "id": str(uuid4()),
            "proceso_id": proc["id"],
            "proceso_codigo": proc.get("codigo", ""),
            "proceso_nombre": proc.get("nombre", ""),
            "tipo_nombre": proc.get("tipo_nombre", ""),
            "tipo_color_fondo": proc.get("tipo_color_fondo", "#3B82F6"),
            "tipo_color_texto": proc.get("tipo_color_texto", "#FFFFFF"),
            "area_id": proc.get("area_id"),
            "area_nombre": proc.get("area_nombre", ""),
            "responsable_id": responsable_id,
            "responsable_nombre": responsable_nombre,
            "fecha": d.strftime("%Y-%m-%d"),
            "hora": hora or None,
            "criticidad": criticidad,
            "estado": estado,
            "ejecucion_id": None,
            "ejecucion_codigo": None,
            "created_at": _now(),
        }
        await db.process_scheduled_executions.insert_one(slot)
        created += 1
    return created


async def _refresh_atrasadas():
    """Marca como 'atrasada' los slots 'programada' cuya fecha pasó."""
    today = _today_str()
    await db.process_scheduled_executions.update_many(
        {"estado": "programada", "fecha": {"$lt": today}},
        {"$set": {"estado": "atrasada"}},
    )


# ---------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------
@router.post("/regenerate")
async def regenerate_schedule(
    proceso_id: Optional[str] = Query(None),
    months_ahead: int = Query(3, ge=1, le=12),
    months_back: int = Query(1, ge=0, le=12),
    current_user: dict = Depends(require_admin),
):
    """Regenera slots para todos los procesos activos (o uno específico)."""
    today = _now().date()
    d_from = (today.replace(day=1) - timedelta(days=months_back * 31)).replace(day=1)
    # End: último día del mes (today + months_ahead)
    fy, fm = today.year, today.month + months_ahead
    while fm > 12:
        fm -= 12
        fy += 1
    d_to = date(fy, fm, _last_dom(fy, fm))

    q = {"activo": True}
    if proceso_id:
        q = {"id": proceso_id}
    procs = await db.process_definitions.find(q, {"_id": 0}).to_list(2000)
    total = 0
    for p in procs:
        total += await _generate_for_process(p, d_from, d_to, replace=True)
    await _refresh_atrasadas()
    return {
        "from": d_from.strftime("%Y-%m-%d"),
        "to": d_to.strftime("%Y-%m-%d"),
        "procesos": len(procs),
        "slots_creados": total,
    }


@router.get("")
async def list_schedule(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    proceso_id: Optional[str] = Query(None),
    responsable_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    mine: bool = Query(False),
    current_user: dict = Depends(get_current_active_user),
):
    """Lista slots programados. Empleados sólo ven los suyos cuando mine=true o no son admin."""
    await _refresh_atrasadas()
    q = {}
    if fecha_desde and fecha_hasta:
        q["fecha"] = {"$gte": fecha_desde, "$lte": fecha_hasta}
    elif fecha_desde:
        q["fecha"] = {"$gte": fecha_desde}
    elif fecha_hasta:
        q["fecha"] = {"$lte": fecha_hasta}
    if proceso_id:
        q["proceso_id"] = proceso_id
    if responsable_id:
        q["responsable_id"] = responsable_id
    if estado:
        q["estado"] = estado

    is_admin = (current_user.get("role") or "").lower() == "admin"
    if mine or not is_admin:
        # Resolver staff del usuario
        staff = await db.process_staff.find_one({"user_id": current_user["id"]}, {"_id": 0})
        if staff:
            q["responsable_id"] = staff["id"]
        else:
            return []

    docs = await db.process_scheduled_executions.find(q, {"_id": 0}).sort("fecha", 1).to_list(5000)
    return docs


@router.get("/{slot_id}")
async def get_schedule(slot_id: str, current_user: dict = Depends(get_current_active_user)):
    s = await db.process_scheduled_executions.find_one({"id": slot_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Slot no encontrado")
    return s


@router.delete("/{slot_id}")
async def delete_schedule(slot_id: str, current_user: dict = Depends(require_admin)):
    res = await db.process_scheduled_executions.delete_one({"id": slot_id, "estado": "programada"})
    if res.deleted_count == 0:
        raise HTTPException(400, "No se pudo eliminar (estado distinto a 'programada')")
    return {"ok": True}


@router.post("/{slot_id}/start")
async def start_schedule(slot_id: str, current_user: dict = Depends(get_current_active_user)):
    """Inicia la ejecución vinculada a un slot. Solo el responsable o admin pueden hacerlo."""
    slot = await db.process_scheduled_executions.find_one({"id": slot_id}, {"_id": 0})
    if not slot:
        raise HTTPException(404, "Slot no encontrado")
    if slot["estado"] not in ("programada", "atrasada"):
        raise HTTPException(400, f"Slot ya está en estado '{slot['estado']}'")

    is_admin = (current_user.get("role") or "").lower() == "admin"
    staff = await db.process_staff.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not is_admin:
        if not staff or staff["id"] != slot.get("responsable_id"):
            raise HTTPException(403, "Sólo el responsable puede iniciar este proceso")
    if not staff:
        # admin sin staff: crear uno mínimo para que la ejecución tenga staff_id
        staff = {
            "id": str(uuid4()),
            "user_id": current_user["id"],
            "user_name": current_user.get("name", current_user.get("email", "")),
            "user_email": current_user.get("email", ""),
            "area_id": None,
            "area_nombre": "",
            "permisos_temporales": False,
            "acceso_servidor": True,
            "created_at": _now(),
        }
        await db.process_staff.insert_one(dict(staff))

    proc = await db.process_definitions.find_one({"id": slot["proceso_id"]}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Proceso no encontrado")

    exe_counter = await db.process_executions.count_documents({"proceso_id": proc["id"]}) + 1
    codigo_exec = f"{proc.get('codigo', 'PROC')}-EXEC-{exe_counter:03d}"
    now = _now()
    new_exec = {
        "id": str(uuid4()),
        "codigo_ejecucion": codigo_exec,
        "proceso_id": proc["id"],
        "proceso_nombre": proc["nombre"],
        "proceso_codigo": proc.get("codigo", ""),
        "tipo_nombre": proc.get("tipo_nombre", ""),
        "tipo_color_fondo": proc.get("tipo_color_fondo", "#3B82F6"),
        "tipo_color_texto": proc.get("tipo_color_texto", "#FFFFFF"),
        "staff_id": staff["id"],
        "staff_user_id": staff["user_id"],
        "staff_user_name": staff.get("user_name", ""),
        "staff_area_nombre": staff.get("area_nombre", ""),
        "fecha": slot["fecha"],
        "hora_inicio": now.strftime("%H:%M"),
        "hora_fin": None,
        "estado": "en_progreso",
        "progreso": 0.0,
        "total_pasos": 0,
        "pasos_completados": 0,
        "scheduled_id": slot_id,
        "created_at": now,
    }
    await db.process_executions.insert_one(new_exec)

    # Crear step executions
    steps = await db.process_steps.find({"proceso_id": proc["id"]}, {"_id": 0}).sort("orden", 1).to_list(500)
    step_execs = []
    for s in steps:
        staff_asig_nombre = ""
        if s.get("staff_asignado_id"):
            sa = await db.process_staff.find_one({"id": s["staff_asignado_id"]}, {"_id": 0})
            staff_asig_nombre = (sa or {}).get("user_name", "")
        step_execs.append({
            "id": str(uuid4()),
            "ejecucion_id": new_exec["id"],
            "paso_id": s["id"],
            "paso_nombre": s["nombre"],
            "paso_descripcion": s.get("descripcion", ""),
            "paso_orden": s.get("orden", 0),
            "paso_puntos": s.get("puntos", 1),
            "paso_requiere_evidencia": s.get("requiere_evidencia", False),
            "paso_es_critico": s.get("es_critico", False),
            "paso_auditable": s.get("auditable", True),
            "staff_asignado_id": s.get("staff_asignado_id") or None,
            "staff_asignado_nombre": staff_asig_nombre,
            "estado": 0,
            "evidencia": None,
            "evidencia_nombre": None,
            "comentarios": "",
            "fecha_actualizacion": None,
        })
    if step_execs:
        await db.process_step_executions.insert_many(step_execs)

    await db.process_scheduled_executions.update_one(
        {"id": slot_id},
        {"$set": {
            "estado": "iniciada",
            "ejecucion_id": new_exec["id"],
            "ejecucion_codigo": codigo_exec,
        }},
    )
    return {
        "ok": True,
        "ejecucion_id": new_exec["id"],
        "ejecucion_codigo": codigo_exec,
    }


@router.get("/_helpers/today-summary")
async def today_summary(current_user: dict = Depends(get_current_active_user)):
    """Resumen de hoy (para usuario actual) y atrasados."""
    await _refresh_atrasadas()
    today = _today_str()
    is_admin = (current_user.get("role") or "").lower() == "admin"
    base = {} if is_admin else None
    if not is_admin:
        staff = await db.process_staff.find_one({"user_id": current_user["id"]}, {"_id": 0})
        if not staff:
            return {"hoy": [], "atrasadas": [], "proximas": []}
        base = {"responsable_id": staff["id"]}

    hoy = await db.process_scheduled_executions.find({**base, "fecha": today}, {"_id": 0}).to_list(500)
    atras = await db.process_scheduled_executions.find({**base, "estado": "atrasada"}, {"_id": 0}).sort("fecha", 1).to_list(500)
    prox = await db.process_scheduled_executions.find(
        {**base, "estado": "programada", "fecha": {"$gt": today}}, {"_id": 0}
    ).sort("fecha", 1).limit(20).to_list(20)
    return {"hoy": hoy, "atrasadas": atras, "proximas": prox}
