"""
Rutas del módulo Auditorías.
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from models.audit import (
    Audit, AuditCreate, AuditUpdate,
    AuditItem, AuditItemCreate, AuditItemUpdate, ItemsFromStepsPayload,
)
from middlewares.auth import db, require_admin

router = APIRouter(prefix="/api/audits", tags=["audits"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _today_str() -> str:
    return _now().strftime("%Y-%m-%d")


def _hhmm() -> str:
    return _now().strftime("%H:%M")


async def _next_codigo() -> str:
    counter = await db.audits.count_documents({}) + 1
    return f"AUD-{counter:04d}"


async def _enrich_audit(a: dict) -> dict:
    proc = await db.process_definitions.find_one({"id": a["proceso_id"]}, {"_id": 0})
    if proc:
        a["proceso_nombre"] = proc.get("nombre", "")
        a["proceso_codigo"] = proc.get("codigo", "")
    if a.get("evaluador_id"):
        st = await db.process_staff.find_one({"id": a["evaluador_id"]}, {"_id": 0})
        a["evaluador_nombre"] = (st or {}).get("user_name", "")
    if a.get("evaluado_id"):
        st = await db.process_staff.find_one({"id": a["evaluado_id"]}, {"_id": 0})
        a["evaluado_nombre"] = (st or {}).get("user_name", "")
    if a.get("ejecucion_id"):
        ex = await db.process_executions.find_one({"id": a["ejecucion_id"]}, {"_id": 0})
        a["ejecucion_codigo"] = (ex or {}).get("codigo_ejecucion", "")
    return a


async def _ensure_evaluator_staff(current_user: dict) -> dict:
    """Devuelve (creando si hace falta) el staff vinculado al usuario actual."""
    staff = await db.process_staff.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not staff:
        staff = {
            "id": str(uuid4()),
            "user_id": current_user["id"],
            "user_name": current_user.get("name", current_user.get("email", "")),
            "user_email": current_user.get("email", ""),
            "area_id": None,
            "area_nombre": "",
            "activo": True,
            "created_at": _now(),
        }
        await db.process_staff.insert_one(dict(staff))
    return staff


async def _recompute_totals(audit_id: str) -> dict:
    """Recalcula total_puntos / puntos_obtenidos / porcentaje / criticos_omitidos."""
    items = await db.audit_items.find({"audit_id": audit_id}, {"_id": 0}).to_list(1000)
    total = sum(i.get("puntos", 0) for i in items)
    obtained = sum(i.get("puntos_obtenidos", 0) for i in items)
    evaluated = sum(1 for i in items if i.get("cumplido") is not None)
    criticos_omitidos = sum(1 for i in items if i.get("es_critico") and i.get("cumplido") is False)
    pct = round((obtained / total) * 100, 2) if total > 0 else 0.0
    update = {
        "total_puntos": total,
        "puntos_obtenidos": obtained,
        "porcentaje": pct,
        "total_items": len(items),
        "items_evaluados": evaluated,
        "criticos_omitidos": criticos_omitidos,
        "updated_at": _now(),
    }
    await db.audits.update_one({"id": audit_id}, {"$set": update})
    return update


# ============================================================
# AUDIT (CRUD)
# ============================================================
@router.post("", response_model=Audit)
async def create_audit(payload: AuditCreate, current_user: dict = Depends(require_admin)):
    if payload.tipo not in {"presencial", "historica"}:
        raise HTTPException(400, "tipo debe ser 'presencial' o 'historica'")
    if payload.modo not in {"pasos", "puntos"}:
        raise HTTPException(400, "modo debe ser 'pasos' o 'puntos'")

    proc = await db.process_definitions.find_one({"id": payload.proceso_id}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Proceso no encontrado")

    evaluado_id = payload.evaluado_id

    if payload.tipo == "historica":
        if not payload.ejecucion_id:
            raise HTTPException(400, "Una auditoría histórica requiere ejecucion_id")
        ex = await db.process_executions.find_one({"id": payload.ejecucion_id}, {"_id": 0})
        if not ex:
            raise HTTPException(404, "Ejecución no encontrada")
        evaluado_id = ex["staff_id"]
    else:
        if not evaluado_id:
            raise HTTPException(400, "Una auditoría presencial requiere evaluado_id")

    evaluator_staff = await _ensure_evaluator_staff(current_user)
    audit = {
        "id": str(uuid4()),
        "codigo": await _next_codigo(),
        "proceso_id": payload.proceso_id,
        "proceso_nombre": proc.get("nombre", ""),
        "proceso_codigo": proc.get("codigo", ""),
        "tipo": payload.tipo,
        "ejecucion_id": payload.ejecucion_id,
        "ejecucion_codigo": "",
        "modo": payload.modo,
        "evaluador_id": evaluator_staff["id"],
        "evaluador_nombre": evaluator_staff.get("user_name", ""),
        "evaluado_id": evaluado_id,
        "evaluado_nombre": "",
        "estado": "borrador",
        "fecha": _today_str(),
        "hora_inicio": _hhmm(),
        "hora_fin": None,
        "comentarios": payload.comentarios or "",
        "total_puntos": 0,
        "puntos_obtenidos": 0,
        "porcentaje": 0.0,
        "total_items": 0,
        "items_evaluados": 0,
        "created_at": _now(),
        "updated_at": None,
    }
    enriched = await _enrich_audit(audit)
    await db.audits.insert_one(dict(enriched))
    return enriched


@router.get("")
async def list_audits(
    estado: Optional[str] = Query(None),
    proceso_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_admin),
):
    q = {}
    if estado:
        q["estado"] = estado
    if proceso_id:
        q["proceso_id"] = proceso_id
    docs = await db.audits.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.get("/{audit_id}", response_model=Audit)
async def get_audit(audit_id: str, current_user: dict = Depends(require_admin)):
    a = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Auditoría no encontrada")
    return a


@router.put("/{audit_id}", response_model=Audit)
async def update_audit(audit_id: str, payload: AuditUpdate, current_user: dict = Depends(require_admin)):
    raw = payload.dict(exclude_unset=True)
    update = {k: v for k, v in raw.items() if v is not None}
    if "estado" in update and update["estado"] not in {"borrador", "en_progreso", "completada"}:
        raise HTTPException(400, "estado inválido")
    if update.get("estado") == "completada":
        update["hora_fin"] = _hhmm()
        # Aprobada si %>=70 y no hay críticos omitidos
        a = await db.audits.find_one({"id": audit_id}, {"_id": 0})
        if a:
            update["aprobada"] = (a.get("porcentaje", 0) >= 70) and (a.get("criticos_omitidos", 0) == 0)
    update["updated_at"] = _now()
    res = await db.audits.update_one({"id": audit_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Auditoría no encontrada")
    a = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    enriched = await _enrich_audit(a)
    await db.audits.update_one({"id": audit_id}, {"$set": enriched})
    return enriched


@router.delete("/{audit_id}")
async def delete_audit(audit_id: str, current_user: dict = Depends(require_admin)):
    await db.audit_items.delete_many({"audit_id": audit_id})
    res = await db.audits.delete_one({"id": audit_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Auditoría no encontrada")
    return {"deleted": True}


# ============================================================
# AUDIT ITEMS
# ============================================================
@router.get("/{audit_id}/items")
async def list_items(audit_id: str, current_user: dict = Depends(require_admin)):
    items = await db.audit_items.find({"audit_id": audit_id}, {"_id": 0}).sort("orden", 1).to_list(500)
    return items


@router.post("/{audit_id}/items", response_model=AuditItem)
async def create_item(audit_id: str, payload: AuditItemCreate, current_user: dict = Depends(require_admin)):
    audit = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if not audit:
        raise HTTPException(404, "Auditoría no encontrada")
    count = await db.audit_items.count_documents({"audit_id": audit_id})
    item = {
        "id": str(uuid4()),
        "audit_id": audit_id,
        "orden": payload.orden if payload.orden else count + 1,
        "titulo": payload.titulo,
        "descripcion": payload.descripcion or "",
        "puntos": payload.puntos,
        "origen": payload.origen,
        "paso_id": payload.paso_id,
        "cumplido": None,
        "puntos_obtenidos": 0,
        "comentarios": "",
        "created_at": _now(),
    }
    await db.audit_items.insert_one(dict(item))
    await _recompute_totals(audit_id)
    return item


@router.post("/{audit_id}/items/from-steps")
async def create_items_from_steps(
    audit_id: str, payload: ItemsFromStepsPayload, current_user: dict = Depends(require_admin)
):
    audit = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if not audit:
        raise HTTPException(404, "Auditoría no encontrada")
    steps = await db.process_steps.find(
        {"id": {"$in": payload.paso_ids}}, {"_id": 0}
    ).sort("orden", 1).to_list(500)
    if not steps:
        raise HTTPException(400, "No se encontraron pasos válidos")
    # opcional: limpiar items derivados de pasos previos
    await db.audit_items.delete_many({"audit_id": audit_id, "origen": "paso"})
    created = []
    for idx, s in enumerate(steps):
        item = {
            "id": str(uuid4()),
            "audit_id": audit_id,
            "orden": idx + 1,
            "titulo": s.get("nombre", ""),
            "descripcion": s.get("descripcion", "") or "",
            "puntos": s.get("puntos", 1),
            "origen": "paso",
            "paso_id": s["id"],
            "cumplido": None,
            "puntos_obtenidos": 0,
            "comentarios": "",
            "created_at": _now(),
        }
        await db.audit_items.insert_one(dict(item))
        created.append(item)
    await _recompute_totals(audit_id)
    return {"created": len(created), "items": created}


@router.put("/{audit_id}/items/{item_id}", response_model=AuditItem)
async def update_item(
    audit_id: str, item_id: str, payload: AuditItemUpdate, current_user: dict = Depends(require_admin)
):
    item = await db.audit_items.find_one({"id": item_id, "audit_id": audit_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item no encontrado")
    raw = payload.dict(exclude_unset=True)
    nullable = {"cumplido", "responsable_id", "fecha_compromiso"}
    update = {k: v for k, v in raw.items() if v is not None or k in nullable}
    # Si cambia responsable_id, denormalizar nombre
    if "responsable_id" in update:
        if update["responsable_id"]:
            st = await db.process_staff.find_one({"id": update["responsable_id"]}, {"_id": 0})
            update["responsable_nombre"] = (st or {}).get("user_name", "")
        else:
            update["responsable_nombre"] = ""
    # Si se actualiza cumplido o puntos, recomputamos puntos_obtenidos
    new_doc = {**item, **update}
    cumplido = new_doc.get("cumplido")
    new_doc["puntos_obtenidos"] = new_doc.get("puntos", 0) if cumplido is True else 0
    update["puntos_obtenidos"] = new_doc["puntos_obtenidos"]
    await db.audit_items.update_one({"id": item_id}, {"$set": update})
    audit = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if audit and audit.get("estado") == "borrador" and cumplido is not None:
        await db.audits.update_one({"id": audit_id}, {"$set": {"estado": "en_progreso"}})
    await _recompute_totals(audit_id)
    return await db.audit_items.find_one({"id": item_id}, {"_id": 0})


@router.delete("/{audit_id}/items/{item_id}")
async def delete_item(audit_id: str, item_id: str, current_user: dict = Depends(require_admin)):
    res = await db.audit_items.delete_one({"id": item_id, "audit_id": audit_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Item no encontrado")
    await _recompute_totals(audit_id)
    return {"deleted": True}


# ============================================================
# Helpers expuestos
# ============================================================
@router.post("/from-execution/{ejecucion_id}")
async def create_supervision_from_execution(
    ejecucion_id: str, current_user: dict = Depends(require_admin)
):
    """
    Crea una auditoría tipo 'supervisión' a partir de una ejecución existente.
    Importa automáticamente como ítems los step_executions cuyo paso es auditable,
    copiando evidencia y datos del paso. Retorna el audit creado.
    """
    exe = await db.process_executions.find_one({"id": ejecucion_id}, {"_id": 0})
    if not exe:
        raise HTTPException(404, "Ejecución no encontrada")
    proc = await db.process_definitions.find_one({"id": exe["proceso_id"]}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Proceso de la ejecución no encontrado")
    evaluator_staff = await _ensure_evaluator_staff(current_user)
    audit_id = str(uuid4())
    audit = {
        "id": audit_id,
        "codigo": await _next_codigo(),
        "proceso_id": proc["id"],
        "proceso_nombre": proc.get("nombre", ""),
        "proceso_codigo": proc.get("codigo", ""),
        "tipo": "historica",
        "ejecucion_id": ejecucion_id,
        "ejecucion_codigo": exe.get("codigo_ejecucion", ""),
        "modo": "pasos",
        "evaluador_id": evaluator_staff["id"],
        "evaluador_nombre": evaluator_staff.get("user_name", ""),
        "evaluado_id": exe.get("staff_id"),
        "evaluado_nombre": exe.get("staff_user_name", ""),
        "estado": "borrador",
        "fecha": _today_str(),
        "hora_inicio": _hhmm(),
        "hora_fin": None,
        "comentarios": "",
        "total_puntos": 0,
        "puntos_obtenidos": 0,
        "porcentaje": 0.0,
        "total_items": 0,
        "items_evaluados": 0,
        "criticos_omitidos": 0,
        "aprobada": None,
        "es_supervision": True,
        "created_at": _now(),
        "updated_at": None,
    }
    await db.audits.insert_one(dict(audit))
    # Importar step_executions auditables como audit_items
    step_execs = await db.process_step_executions.find(
        {"ejecucion_id": ejecucion_id}, {"_id": 0}
    ).sort("paso_orden", 1).to_list(500)
    created = 0
    for idx, se in enumerate(step_execs):
        if not se.get("paso_auditable", True):
            continue
        # Si la pre-evaluación dice estado=2 (Completado) → cumplido=True; estado=3 (Error/Omitido) → False
        pre_cumplido = None
        if se.get("estado") == 2:
            pre_cumplido = True
        elif se.get("estado") == 3:
            pre_cumplido = False
        item = {
            "id": str(uuid4()),
            "audit_id": audit_id,
            "orden": idx + 1,
            "titulo": se.get("paso_nombre", ""),
            "descripcion": se.get("paso_descripcion", "") or "",
            "puntos": se.get("paso_puntos", 1),
            "origen": "paso",
            "paso_id": se.get("paso_id"),
            "step_execution_id": se.get("id"),
            "es_critico": se.get("paso_es_critico", False),
            "evidencia": se.get("evidencia"),
            "evidencia_nombre": se.get("evidencia_nombre"),
            "cumplido": pre_cumplido,
            "puntos_obtenidos": se.get("paso_puntos", 1) if pre_cumplido is True else 0,
            "comentarios": se.get("comentarios", "") or "",
            "desviacion": "",
            "accion_correctiva": "",
            "responsable_id": None,
            "responsable_nombre": "",
            "fecha_compromiso": None,
            "created_at": _now(),
        }
        await db.audit_items.insert_one(dict(item))
        created += 1
    await _recompute_totals(audit_id)
    final = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    return {"audit": final, "items_creados": created}


@router.get("/_helpers/executions-by-process/{proceso_id}")
async def list_executions_by_process(proceso_id: str, current_user: dict = Depends(require_admin)):
    """Lista ejecuciones del proceso para escoger en auditoría histórica."""
    execs = await db.process_executions.find(
        {"proceso_id": proceso_id}, {"_id": 0}
    ).sort("created_at", -1).limit(200).to_list(200)
    out = []
    for e in execs:
        out.append({
            "id": e["id"],
            "codigo_ejecucion": e.get("codigo_ejecucion", ""),
            "fecha": e.get("fecha", ""),
            "hora_inicio": e.get("hora_inicio", ""),
            "estado": e.get("estado", ""),
            "staff_id": e.get("staff_id"),
            "staff_user_name": e.get("staff_user_name", ""),
            "porcentaje_completado": e.get("porcentaje_completado", 0),
        })
    return out
