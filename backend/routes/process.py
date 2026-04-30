"""
Routes for Process module.
Prefix: /api/process
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import uuid4
from datetime import datetime
import re

from models.process import (
    Area, AreaCreate,
    Staff, StaffCreate, StaffUpdate,
    ProcessType, ProcessTypeCreate,
    SystemOfConsequences, SystemOfConsequencesCreate,
    Process, ProcessCreate, ProcessUpdate,
    ProcessStep, ProcessStepCreate, ProcessStepUpdate, ReorderStepsRequest,
    ProcessExecution, ProcessExecutionCreate,
    StepExecution, StepExecutionUpdate,
)
from middlewares.auth import db, get_current_active_user, require_admin

router = APIRouter(prefix="/api/process", tags=["process"])


# =============================================================
# Helpers
# =============================================================
def _now():
    return datetime.now()


def _slug_prefix(name: str) -> str:
    """Genera un prefijo de 3 letras a partir de un nombre."""
    cleaned = re.sub(r"[^A-Za-z0-9 ]", "", (name or "")).upper().strip()
    parts = [p for p in cleaned.split() if p]
    if not parts:
        return "PRO"
    if len(parts) == 1:
        return (parts[0][:3] or "PRO").ljust(3, "X")
    return (parts[0][0] + parts[1][0] + (parts[2][0] if len(parts) > 2 else parts[1][-1])).ljust(3, "X")


async def _ensure_staff_for_user(user: dict) -> dict:
    """Auto-crea un Staff vinculado al user logueado si no existe."""
    existing = await db.process_staff.find_one({"user_id": user["id"]}, {"_id": 0})
    if existing:
        return existing
    new_staff = {
        "id": str(uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "area_id": None,
        "area_nombre": user.get("department", ""),
        "permisos_temporales": False,
        "acceso_servidor": False,
        "created_at": _now(),
    }
    await db.process_staff.insert_one(new_staff)
    return new_staff


def _is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


# =============================================================
# AREAS
# =============================================================
@router.get("/areas", response_model=List[Area])
async def list_areas(current_user: dict = Depends(get_current_active_user)):
    areas = await db.process_areas.find({}, {"_id": 0}).sort("nombre", 1).to_list(500)
    return areas


@router.post("/areas", response_model=Area)
async def create_area(payload: AreaCreate, current_user: dict = Depends(require_admin)):
    new_area = {
        "id": str(uuid4()),
        "nombre": payload.nombre,
        "descripcion": payload.descripcion or "",
        "created_at": _now(),
    }
    await db.process_areas.insert_one(new_area)
    return new_area


@router.put("/areas/{area_id}", response_model=Area)
async def update_area(area_id: str, payload: AreaCreate, current_user: dict = Depends(require_admin)):
    res = await db.process_areas.update_one(
        {"id": area_id},
        {"$set": {"nombre": payload.nombre, "descripcion": payload.descripcion or ""}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Area not found")
    area = await db.process_areas.find_one({"id": area_id}, {"_id": 0})
    return area


@router.delete("/areas/{area_id}")
async def delete_area(area_id: str, current_user: dict = Depends(require_admin)):
    await db.process_areas.delete_one({"id": area_id})
    return {"ok": True}


# =============================================================
# STAFF
# =============================================================
@router.get("/staff/me", response_model=Staff)
async def get_my_staff(current_user: dict = Depends(get_current_active_user)):
    staff = await _ensure_staff_for_user(current_user)
    return staff


@router.get("/staff", response_model=List[Staff])
async def list_staff(current_user: dict = Depends(require_admin)):
    staff = await db.process_staff.find({}, {"_id": 0}).to_list(1000)
    return staff


@router.put("/staff/{staff_id}", response_model=Staff)
async def update_staff(staff_id: str, payload: StaffUpdate, current_user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    if "area_id" in update_data and update_data["area_id"]:
        area = await db.process_areas.find_one({"id": update_data["area_id"]}, {"_id": 0})
        if area:
            update_data["area_nombre"] = area["nombre"]
    res = await db.process_staff.update_one({"id": staff_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(404, "Staff not found")
    staff = await db.process_staff.find_one({"id": staff_id}, {"_id": 0})
    return staff


# =============================================================
# PROCESS TYPES
# =============================================================
@router.get("/types", response_model=List[ProcessType])
async def list_types(current_user: dict = Depends(get_current_active_user)):
    types_ = await db.process_types.find({}, {"_id": 0}).sort("nombre", 1).to_list(500)
    return types_


@router.post("/types", response_model=ProcessType)
async def create_type(payload: ProcessTypeCreate, current_user: dict = Depends(require_admin)):
    new_t = {
        "id": str(uuid4()),
        "nombre": payload.nombre,
        "color_fondo": payload.color_fondo,
        "color_texto": payload.color_texto,
        "created_at": _now(),
    }
    await db.process_types.insert_one(new_t)
    return new_t


@router.put("/types/{type_id}", response_model=ProcessType)
async def update_type(type_id: str, payload: ProcessTypeCreate, current_user: dict = Depends(require_admin)):
    res = await db.process_types.update_one(
        {"id": type_id},
        {"$set": {
            "nombre": payload.nombre,
            "color_fondo": payload.color_fondo,
            "color_texto": payload.color_texto,
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Type not found")
    # Update denormalized fields in processes
    await db.process_definitions.update_many(
        {"tipo_id": type_id},
        {"$set": {
            "tipo_nombre": payload.nombre,
            "tipo_color_fondo": payload.color_fondo,
            "tipo_color_texto": payload.color_texto,
        }},
    )
    t = await db.process_types.find_one({"id": type_id}, {"_id": 0})
    return t


@router.delete("/types/{type_id}")
async def delete_type(type_id: str, current_user: dict = Depends(require_admin)):
    await db.process_types.delete_one({"id": type_id})
    return {"ok": True}


# =============================================================
# CONSEQUENCE SYSTEMS
# =============================================================
@router.get("/consequences", response_model=List[SystemOfConsequences])
async def list_consequences(current_user: dict = Depends(get_current_active_user)):
    items = await db.process_consequences.find({}, {"_id": 0}).sort("nombre", 1).to_list(500)
    return items


@router.post("/consequences", response_model=SystemOfConsequences)
async def create_consequence(payload: SystemOfConsequencesCreate, current_user: dict = Depends(require_admin)):
    new_c = {
        "id": str(uuid4()),
        **payload.dict(),
        "created_at": _now(),
    }
    await db.process_consequences.insert_one(new_c)
    return new_c


@router.put("/consequences/{consequence_id}", response_model=SystemOfConsequences)
async def update_consequence(consequence_id: str, payload: SystemOfConsequencesCreate, current_user: dict = Depends(require_admin)):
    res = await db.process_consequences.update_one(
        {"id": consequence_id},
        {"$set": payload.dict()},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Consequence system not found")
    c = await db.process_consequences.find_one({"id": consequence_id}, {"_id": 0})
    return c


@router.delete("/consequences/{consequence_id}")
async def delete_consequence(consequence_id: str, current_user: dict = Depends(require_admin)):
    await db.process_consequences.delete_one({"id": consequence_id})
    return {"ok": True}


# =============================================================
# PROCESSES
# =============================================================
async def _enrich_process(p: dict) -> dict:
    """Adds denormalized data that may be missing."""
    if p.get("area_id"):
        a = await db.process_areas.find_one({"id": p["area_id"]}, {"_id": 0})
        p["area_nombre"] = (a or {}).get("nombre", "")
    if p.get("tipo_id"):
        t = await db.process_types.find_one({"id": p["tipo_id"]}, {"_id": 0})
        if t:
            p["tipo_nombre"] = t.get("nombre", "")
            p["tipo_color_fondo"] = t.get("color_fondo", "#3B82F6")
            p["tipo_color_texto"] = t.get("color_texto", "#FFFFFF")
    p["total_pasos"] = await db.process_steps.count_documents({"proceso_id": p["id"]})
    return p


@router.get("/processes", response_model=List[Process])
async def list_processes(
    area_id: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    mine: bool = Query(False),
    current_user: dict = Depends(get_current_active_user),
):
    """Lista procesos. Si mine=true, filtra por el área del staff del usuario."""
    query = {}
    if area_id:
        query["area_id"] = area_id
    if activo is not None:
        query["activo"] = activo
    if mine:
        staff = await _ensure_staff_for_user(current_user)
        if staff.get("area_id"):
            query["area_id"] = staff["area_id"]
        elif staff.get("area_nombre"):
            # filter by area name match
            area = await db.process_areas.find_one({"nombre": staff["area_nombre"]}, {"_id": 0})
            if area:
                query["area_id"] = area["id"]
        query["activo"] = True
    processes = await db.process_definitions.find(query, {"_id": 0}).sort("nombre", 1).to_list(1000)
    enriched = []
    for p in processes:
        enriched.append(await _enrich_process(p))
    return enriched


@router.get("/processes/{process_id}", response_model=Process)
async def get_process(process_id: str, current_user: dict = Depends(get_current_active_user)):
    p = await db.process_definitions.find_one({"id": process_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Process not found")
    return await _enrich_process(p)


@router.post("/processes", response_model=Process)
async def create_process(payload: ProcessCreate, current_user: dict = Depends(require_admin)):
    counter = await db.process_definitions.count_documents({}) + 1
    prefix = _slug_prefix(payload.nombre)
    codigo = f"PROC-{prefix}-{counter:03d}"

    new_p = {
        "id": str(uuid4()),
        "codigo": codigo,
        "nombre": payload.nombre,
        "descripcion": payload.descripcion or "",
        "url_referencia": payload.url_referencia or "",
        "area_id": payload.area_id,
        "tipo_id": payload.tipo_id,
        "activo": payload.activo,
        "area_nombre": "",
        "tipo_nombre": "",
        "tipo_color_fondo": "#3B82F6",
        "tipo_color_texto": "#FFFFFF",
        "total_pasos": 0,
        "created_at": _now(),
    }
    await db.process_definitions.insert_one(new_p)
    enriched = await _enrich_process(new_p)
    await db.process_definitions.update_one({"id": new_p["id"]}, {"$set": enriched})
    return enriched


@router.put("/processes/{process_id}", response_model=Process)
async def update_process(process_id: str, payload: ProcessUpdate, current_user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    res = await db.process_definitions.update_one({"id": process_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(404, "Process not found")
    p = await db.process_definitions.find_one({"id": process_id}, {"_id": 0})
    enriched = await _enrich_process(p)
    await db.process_definitions.update_one({"id": process_id}, {"$set": enriched})
    return enriched


@router.delete("/processes/{process_id}")
async def delete_process(process_id: str, current_user: dict = Depends(require_admin)):
    await db.process_definitions.delete_one({"id": process_id})
    await db.process_steps.delete_many({"proceso_id": process_id})
    return {"ok": True}


# =============================================================
# PROCESS STEPS
# =============================================================
async def _enrich_step(s: dict) -> dict:
    if s.get("sistema_consecuencias_id"):
        sc = await db.process_consequences.find_one({"id": s["sistema_consecuencias_id"]}, {"_id": 0})
        s["sistema_consecuencias_nombre"] = (sc or {}).get("nombre", "")
    if s.get("staff_asignado_id"):
        sa = await db.process_staff.find_one({"id": s["staff_asignado_id"]}, {"_id": 0})
        s["staff_asignado_nombre"] = (sa or {}).get("user_name", "")
    else:
        s["staff_asignado_nombre"] = ""
    return s


@router.get("/processes/{process_id}/steps", response_model=List[ProcessStep])
async def list_steps(process_id: str, current_user: dict = Depends(get_current_active_user)):
    steps = await db.process_steps.find({"proceso_id": process_id}, {"_id": 0}).sort("orden", 1).to_list(500)
    return [await _enrich_step(s) for s in steps]


@router.post("/processes/{process_id}/steps", response_model=ProcessStep)
async def create_step(process_id: str, payload: ProcessStepCreate, current_user: dict = Depends(require_admin)):
    proc = await db.process_definitions.find_one({"id": process_id}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Process not found")
    # Auto orden si viene en 0
    orden = payload.orden
    if not orden:
        existing_count = await db.process_steps.count_documents({"proceso_id": process_id})
        orden = existing_count + 1
    new_s = {
        "id": str(uuid4()),
        "proceso_id": process_id,
        "nombre": payload.nombre,
        "descripcion": payload.descripcion or "",
        "orden": orden,
        "puntos": payload.puntos,
        "requiere_evidencia": payload.requiere_evidencia,
        "es_critico": payload.es_critico,
        "sistema_consecuencias_id": payload.sistema_consecuencias_id,
        "sistema_consecuencias_nombre": "",
        "staff_asignado_id": payload.staff_asignado_id or None,
        "staff_asignado_nombre": "",
        "created_at": _now(),
    }
    await db.process_steps.insert_one(new_s)
    enriched = await _enrich_step(new_s)
    await db.process_steps.update_one({"id": new_s["id"]}, {"$set": enriched})
    # update total_pasos
    await db.process_definitions.update_one(
        {"id": process_id},
        {"$set": {"total_pasos": await db.process_steps.count_documents({"proceso_id": process_id})}},
    )
    return enriched


@router.put("/steps/{step_id}", response_model=ProcessStep)
async def update_step(step_id: str, payload: ProcessStepUpdate, current_user: dict = Depends(require_admin)):
    raw = payload.dict(exclude_unset=True)
    # Allow explicit None (null) for nullable FK fields so admin can unassign them
    nullable_fields = {"staff_asignado_id", "sistema_consecuencias_id"}
    update_data = {k: v for k, v in raw.items() if v is not None or k in nullable_fields}
    res = await db.process_steps.update_one({"id": step_id}, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(404, "Step not found")
    s = await db.process_steps.find_one({"id": step_id}, {"_id": 0})
    enriched = await _enrich_step(s)
    await db.process_steps.update_one({"id": step_id}, {"$set": enriched})
    return enriched


@router.delete("/steps/{step_id}")
async def delete_step(step_id: str, current_user: dict = Depends(require_admin)):
    s = await db.process_steps.find_one({"id": step_id}, {"_id": 0})
    if s:
        await db.process_steps.delete_one({"id": step_id})
        await db.process_definitions.update_one(
            {"id": s["proceso_id"]},
            {"$set": {"total_pasos": await db.process_steps.count_documents({"proceso_id": s["proceso_id"]})}},
        )
    return {"ok": True}


@router.post("/processes/{process_id}/steps/reorder")
async def reorder_steps(process_id: str, payload: ReorderStepsRequest, current_user: dict = Depends(require_admin)):
    for idx, step_id in enumerate(payload.step_ids, start=1):
        await db.process_steps.update_one(
            {"id": step_id, "proceso_id": process_id},
            {"$set": {"orden": idx}},
        )
    return {"ok": True}


# =============================================================
# EXECUTIONS
# =============================================================
async def _refresh_execution_progress(execution_id: str) -> dict:
    """Recalcula progreso de la ejecución y la actualiza."""
    total = await db.process_step_executions.count_documents({"ejecucion_id": execution_id})
    completados = await db.process_step_executions.count_documents(
        {"ejecucion_id": execution_id, "estado": 2}
    )
    progreso = (completados / total * 100) if total > 0 else 0.0
    estado = "completado" if total > 0 and completados == total else "en_progreso"
    update = {
        "total_pasos": total,
        "pasos_completados": completados,
        "progreso": round(progreso, 1),
        "estado": estado,
    }
    if estado == "completado":
        # set hora_fin si no la tiene
        exe = await db.process_executions.find_one({"id": execution_id}, {"_id": 0})
        if exe and not exe.get("hora_fin"):
            update["hora_fin"] = datetime.now().strftime("%H:%M")
    await db.process_executions.update_one({"id": execution_id}, {"$set": update})
    return await db.process_executions.find_one({"id": execution_id}, {"_id": 0})


@router.get("/executions", response_model=List[ProcessExecution])
async def list_executions(
    fecha: Optional[str] = Query(None),
    proceso_id: Optional[str] = Query(None),
    mine: bool = Query(False),
    current_user: dict = Depends(get_current_active_user),
):
    query = {}
    if fecha:
        query["fecha"] = fecha
    if proceso_id:
        query["proceso_id"] = proceso_id
    if mine or not _is_admin(current_user):
        # Empleados solo ven las propias salvo override admin
        staff = await _ensure_staff_for_user(current_user)
        query["staff_id"] = staff["id"]
    execs = await db.process_executions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return execs


@router.get("/executions/{execution_id}", response_model=ProcessExecution)
async def get_execution(execution_id: str, current_user: dict = Depends(get_current_active_user)):
    e = await db.process_executions.find_one({"id": execution_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Execution not found")
    return e


@router.post("/executions", response_model=ProcessExecution)
async def create_execution(
    payload: ProcessExecutionCreate,
    current_user: dict = Depends(get_current_active_user),
):
    proc = await db.process_definitions.find_one({"id": payload.proceso_id}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Process not found")
    if not proc.get("activo", True):
        raise HTTPException(400, "Process is not active")

    staff = await _ensure_staff_for_user(current_user)

    # contador de ejecuciones para este proceso
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
        "fecha": now.strftime("%Y-%m-%d"),
        "hora_inicio": now.strftime("%H:%M"),
        "hora_fin": None,
        "estado": "en_progreso",
        "progreso": 0.0,
        "total_pasos": 0,
        "pasos_completados": 0,
        "created_at": now,
    }
    await db.process_executions.insert_one(new_exec)

    # crear step executions para cada paso del proceso
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

    refreshed = await _refresh_execution_progress(new_exec["id"])
    return refreshed


@router.get("/executions/{execution_id}/steps", response_model=List[StepExecution])
async def list_step_executions(execution_id: str, current_user: dict = Depends(get_current_active_user)):
    items = await db.process_step_executions.find({"ejecucion_id": execution_id}, {"_id": 0}).sort("paso_orden", 1).to_list(500)
    return items


@router.put("/step-executions/{step_exec_id}", response_model=StepExecution)
async def update_step_execution(
    step_exec_id: str,
    payload: StepExecutionUpdate,
    current_user: dict = Depends(get_current_active_user),
):
    step_exec = await db.process_step_executions.find_one({"id": step_exec_id}, {"_id": 0})
    if not step_exec:
        raise HTTPException(404, "Step execution not found")

    # Authorization:
    # - admin: siempre permitido
    # - si el paso tiene staff_asignado_id, SOLO ese staff puede actualizarlo
    # - en caso contrario, solo el owner de la ejecución
    if not _is_admin(current_user):
        staff = await _ensure_staff_for_user(current_user)
        if step_exec.get("staff_asignado_id"):
            if step_exec["staff_asignado_id"] != staff["id"]:
                raise HTTPException(
                    403,
                    f"Este paso está asignado a {step_exec.get('staff_asignado_nombre') or 'otro colaborador'} y solo esa persona puede completarlo.",
                )
        else:
            exe = await db.process_executions.find_one({"id": step_exec["ejecucion_id"]}, {"_id": 0})
            if exe and exe["staff_id"] != staff["id"]:
                raise HTTPException(403, "Not allowed to update this step execution")

    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    update_data["fecha_actualizacion"] = _now()
    await db.process_step_executions.update_one({"id": step_exec_id}, {"$set": update_data})

    # refresh exec progress
    await _refresh_execution_progress(step_exec["ejecucion_id"])

    return await db.process_step_executions.find_one({"id": step_exec_id}, {"_id": 0})


@router.get("/my-assigned-steps")
async def list_my_assigned_steps(current_user: dict = Depends(get_current_active_user)):
    """
    Pasos asignados al staff logueado que están pendientes en ejecuciones activas.
    Usado para que un colaborador vea los pasos específicos que debe completar
    dentro de ejecuciones iniciadas por otros staff.
    """
    staff = await _ensure_staff_for_user(current_user)
    # step executions pendientes asignados a mí
    step_execs = await db.process_step_executions.find(
        {"staff_asignado_id": staff["id"], "estado": {"$in": [0, 1]}},
        {"_id": 0},
    ).sort("fecha_actualizacion", -1).to_list(500)

    # agrupa por ejecución y enriquece con datos de la ejecución
    exe_ids = list({se["ejecucion_id"] for se in step_execs})
    execs_map = {}
    if exe_ids:
        execs = await db.process_executions.find(
            {"id": {"$in": exe_ids}, "estado": "en_progreso"},
            {"_id": 0},
        ).to_list(500)
        execs_map = {e["id"]: e for e in execs}

    # filtra a solo ejecuciones en progreso y excluye las iniciadas por el mismo staff
    result = []
    for se in step_execs:
        exe = execs_map.get(se["ejecucion_id"])
        if not exe:
            continue
        if exe.get("staff_id") == staff["id"]:
            # Es mi propia ejecución: no aparece en la bandeja de colaboración
            continue
        result.append({
            "step_execution_id": se["id"],
            "ejecucion_id": exe["id"],
            "codigo_ejecucion": exe.get("codigo_ejecucion", ""),
            "proceso_nombre": exe.get("proceso_nombre", ""),
            "proceso_codigo": exe.get("proceso_codigo", ""),
            "tipo_nombre": exe.get("tipo_nombre", ""),
            "tipo_color_fondo": exe.get("tipo_color_fondo", "#3B82F6"),
            "tipo_color_texto": exe.get("tipo_color_texto", "#FFFFFF"),
            "iniciado_por": exe.get("staff_user_name", ""),
            "fecha": exe.get("fecha", ""),
            "hora_inicio": exe.get("hora_inicio", ""),
            "paso_id": se.get("paso_id"),
            "paso_nombre": se.get("paso_nombre", ""),
            "paso_orden": se.get("paso_orden", 0),
            "paso_requiere_evidencia": se.get("paso_requiere_evidencia", False),
            "paso_es_critico": se.get("paso_es_critico", False),
            "estado": se.get("estado", 0),
        })
    return result


@router.delete("/executions/{execution_id}")
async def delete_execution(execution_id: str, current_user: dict = Depends(require_admin)):
    await db.process_executions.delete_one({"id": execution_id})
    await db.process_step_executions.delete_many({"ejecucion_id": execution_id})
    return {"ok": True}


# =============================================================
# DASHBOARD STATS
# =============================================================
@router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_active_user)):
    today = datetime.now().strftime("%Y-%m-%d")

    total_executions = await db.process_executions.count_documents({})
    executions_today = await db.process_executions.count_documents({"fecha": today})
    completed = await db.process_executions.count_documents({"estado": "completado"})

    # Promedio de cumplimiento (avg progreso)
    pipeline_avg = [{"$group": {"_id": None, "avg": {"$avg": "$progreso"}}}]
    avg_cursor = db.process_executions.aggregate(pipeline_avg)
    avg_doc = await avg_cursor.to_list(1)
    avg_compliance = round((avg_doc[0]["avg"] or 0) if avg_doc else 0, 1)

    # Pasos críticos omitidos (estado=0 ó 3 en pasos críticos en ejecuciones completadas)
    critical_omitted = await db.process_step_executions.count_documents(
        {"paso_es_critico": True, "estado": {"$in": [0, 3]}}
    )

    # Procesos por área
    pipeline_area = [
        {"$group": {"_id": "$staff_area_nombre", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    by_area_cursor = db.process_executions.aggregate(pipeline_area)
    by_area_raw = await by_area_cursor.to_list(50)
    by_area = [{"area": (item["_id"] or "Sin área"), "count": item["count"]} for item in by_area_raw]

    # Cumplimiento por proceso
    pipeline_proc = [
        {"$group": {
            "_id": "$proceso_nombre",
            "avg_progreso": {"$avg": "$progreso"},
            "total": {"$sum": 1},
        }},
        {"$sort": {"avg_progreso": -1}},
        {"$limit": 10},
    ]
    by_proc_cursor = db.process_executions.aggregate(pipeline_proc)
    by_proc_raw = await by_proc_cursor.to_list(50)
    by_process = [
        {
            "proceso": item["_id"] or "Sin nombre",
            "cumplimiento": round(item["avg_progreso"] or 0, 1),
            "total": item["total"],
        }
        for item in by_proc_raw
    ]

    # Pasos más omitidos (estado != 2 en ejecuciones cerradas)
    pipeline_omit = [
        {"$match": {"estado": {"$in": [0, 3]}}},
        {"$group": {"_id": "$paso_nombre", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    omit_cursor = db.process_step_executions.aggregate(pipeline_omit)
    omit_raw = await omit_cursor.to_list(50)
    most_omitted = [{"paso": item["_id"] or "—", "count": item["count"]} for item in omit_raw]

    return {
        "total_executions": total_executions,
        "executions_today": executions_today,
        "completed": completed,
        "avg_compliance": avg_compliance,
        "critical_omitted": critical_omitted,
        "by_area": by_area,
        "by_process": by_process,
        "most_omitted_steps": most_omitted,
    }
