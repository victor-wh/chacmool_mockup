"""
Rutas del módulo Auditoría.
Prefix: /api/audit

Replica el flujo de Supervisión, con un punto adicional:
  - Se valida automáticamente si existe una supervisión completada para
    la misma ejecución.  Si NO existe, la auditoría no puede ser aprobada
    aún cuando los items individuales tengan 100%.

Flujo:
 1. GET /                  → lista de auditorías
 2. POST /                 → crea desde ejecucion_id (clona pasos)
 3. GET /{id}              → detalle con items
 4. PUT /{id}/items/{iid}  → actualizar checkbox / plan de acción
 5. PUT /{id}              → cambiar estado a completada / actualizar observaciones
 6. DELETE /{id}           → eliminar
 7. GET /_helpers/eligible-executions  → ejecuciones sin auditoría
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from uuid import uuid4
from datetime import datetime

from middlewares.auth import db, get_current_active_user, require_admin
from models.audit import (
    Audit, AuditItem, AuditCreate, AuditUpdate, AuditItemUpdate,
)

router = APIRouter(prefix="/api/audit", tags=["audit"])

PASS_THRESHOLD = 70.0


def _now() -> datetime:
    return datetime.now()


async def _supervision_status(ejecucion_id: str) -> dict:
    """Devuelve si existe supervisión completada para la ejecución."""
    sup = await db.supervisions.find_one(
        {"ejecucion_id": ejecucion_id}, {"_id": 0, "id": 1, "codigo": 1, "estado": 1, "aprobada": 1}
    )
    if not sup:
        return {"supervision_realizada": False, "supervision_id": None,
                "supervision_codigo": None, "supervision_aprobada": None}
    return {
        "supervision_realizada": sup.get("estado") == "completada",
        "supervision_id": sup.get("id"),
        "supervision_codigo": sup.get("codigo"),
        "supervision_aprobada": sup.get("aprobada"),
    }


async def _recalc(audit_id: str) -> dict:
    """Recalcula puntaje, porcentaje, criticos_omitidos, aprobada.
    Aprobada = pct >= 70 ∧ criticos==0 ∧ supervision_realizada."""
    aud = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if not aud:
        raise HTTPException(404, "Auditoría no encontrada")
    items = await db.audit_items.find({"audit_id": audit_id}, {"_id": 0}).to_list(2000)
    total_puntos = sum(it.get("puntos", 1) for it in items)
    obtenidos = sum(it.get("puntos", 1) for it in items if it.get("cumplido") is True)
    criticos = sum(1 for it in items if it.get("es_critico") and it.get("cumplido") is False)
    evaluados = sum(1 for it in items if it.get("cumplido") is not None)
    pct = round((obtenidos / total_puntos) * 100, 1) if total_puntos > 0 else 0

    # Refrescar supervision_realizada (puede haberse completado en paralelo)
    sup_info = await _supervision_status(aud["ejecucion_id"])

    aprobada = None
    if aud.get("estado") == "completada":
        aprobada = (
            pct >= PASS_THRESHOLD
            and criticos == 0
            and sup_info["supervision_realizada"] is True
        )
    upd = {
        "puntaje_obtenido": obtenidos,
        "puntaje_total": total_puntos,
        "porcentaje": pct,
        "criticos_omitidos": criticos,
        "items_total": len(items),
        "items_evaluados": evaluados,
        "aprobada": aprobada,
        "updated_at": _now(),
        **sup_info,
    }
    await db.audits.update_one({"id": audit_id}, {"$set": upd})
    return {**aud, **upd}


# ============================================================
# CRUD
# ============================================================
@router.post("", response_model=Audit)
async def create_audit(payload: AuditCreate, current_user: dict = Depends(require_admin)):
    ejec = await db.process_executions.find_one({"id": payload.ejecucion_id}, {"_id": 0})
    if not ejec:
        raise HTTPException(404, "Ejecución no encontrada")
    existing = await db.audits.find_one({"ejecucion_id": payload.ejecucion_id}, {"_id": 0})
    if existing:
        raise HTTPException(400, f"Esta ejecución ya tiene una auditoría ({existing.get('codigo')}).")

    proc = await db.process_definitions.find_one({"id": ejec["proceso_id"]}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Proceso no encontrado")

    step_execs = await db.process_step_executions.find(
        {"ejecucion_id": ejec["id"]}, {"_id": 0}
    ).sort("paso_orden", 1).to_list(500)

    counter = await db.audits.count_documents({}) + 1
    codigo = f"AUD-{counter:03d}"
    now = _now()
    aud_id = str(uuid4())

    sup_info = await _supervision_status(ejec["id"])

    aud = {
        "id": aud_id,
        "codigo": codigo,
        "ejecucion_id": ejec["id"],
        "ejecucion_codigo": ejec.get("codigo_ejecucion", ""),
        "proceso_id": proc["id"],
        "proceso_codigo": proc.get("codigo", ""),
        "proceso_nombre": proc.get("nombre", ""),
        "area_nombre": proc.get("area_nombre", ""),
        "tipo_color_fondo": proc.get("tipo_color_fondo", "#7C3AED"),
        "tipo_color_texto": proc.get("tipo_color_texto", "#FFFFFF"),
        "evaluado_id": ejec.get("staff_id"),
        "evaluado_nombre": ejec.get("staff_user_name", ""),
        "auditor_id": current_user["id"],
        "auditor_nombre": current_user.get("name", current_user.get("email", "")),
        "fecha": now.strftime("%Y-%m-%d"),
        "estado": "draft",
        "puntaje_obtenido": 0,
        "puntaje_total": 0,
        "porcentaje": 0,
        "criticos_omitidos": 0,
        "items_total": 0,
        "items_evaluados": 0,
        "aprobada": None,
        "observaciones": "",
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
        **sup_info,
    }
    await db.audits.insert_one(dict(aud))

    items = []
    for se in step_execs:
        items.append({
            "id": str(uuid4()),
            "audit_id": aud_id,
            "paso_id": se["paso_id"],
            "orden": se.get("paso_orden", 0),
            "titulo": se.get("paso_nombre", ""),
            "descripcion": se.get("paso_descripcion", ""),
            "puntos": se.get("paso_puntos", 1),
            "es_critico": bool(se.get("paso_es_critico", False)),
            "realizado_estado": int(se.get("estado", 0) or 0),
            "realizado_comentarios": se.get("comentarios", "") or "",
            "realizado_evidencia_nombre": se.get("evidencia_nombre"),
            "cumplido": None,
            "desviacion": "",
            "accion_correctiva": "",
            "responsable_id": None,
            "responsable_nombre": "",
            "fecha_compromiso": None,
        })
    if items:
        await db.audit_items.insert_many([dict(i) for i in items])
    return await _recalc(aud_id)


@router.get("", response_model=List[Audit])
async def list_audits(current_user: dict = Depends(require_admin)):
    docs = await db.audits.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    # Refrescar el flag por si la supervisión cambió luego (no recalcula puntajes)
    for d in docs:
        sup_info = await _supervision_status(d["ejecucion_id"])
        d.update(sup_info)
    return docs


@router.get("/_helpers/eligible-executions")
async def eligible_executions(
    proceso_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_admin),
):
    """Ejecuciones sin auditoría todavía."""
    used = set()
    async for s in db.audits.find({}, {"_id": 0, "ejecucion_id": 1}):
        used.add(s["ejecucion_id"])
    # Mapa de supervisiones por ejecucion_id (para informar en la lista)
    sup_map: dict = {}
    async for s in db.supervisions.find({}, {"_id": 0, "ejecucion_id": 1, "codigo": 1, "estado": 1, "aprobada": 1}):
        sup_map[s["ejecucion_id"]] = s
    q = {}
    if proceso_id:
        q["proceso_id"] = proceso_id
    ejes = await db.process_executions.find(q, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    out = []
    for e in ejes:
        if e["id"] in used:
            continue
        sup = sup_map.get(e["id"])
        out.append({
            "id": e["id"],
            "codigo_ejecucion": e.get("codigo_ejecucion", ""),
            "proceso_id": e["proceso_id"],
            "proceso_nombre": e.get("proceso_nombre", ""),
            "proceso_codigo": e.get("proceso_codigo", ""),
            "staff_user_name": e.get("staff_user_name", ""),
            "fecha": e.get("fecha"),
            "estado": e.get("estado"),
            "progreso": e.get("progreso", 0),
            "total_pasos": e.get("total_pasos", 0),
            "pasos_completados": e.get("pasos_completados", 0),
            "supervision_realizada": bool(sup and sup.get("estado") == "completada"),
            "supervision_codigo": (sup or {}).get("codigo"),
        })
    return out


@router.get("/{audit_id}")
async def get_audit(audit_id: str, current_user: dict = Depends(require_admin)):
    aud = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if not aud:
        raise HTTPException(404, "Auditoría no encontrada")
    # Refresca el estado de supervisión cada vez que se carga
    sup_info = await _supervision_status(aud["ejecucion_id"])
    if any(aud.get(k) != v for k, v in sup_info.items()):
        await db.audits.update_one({"id": audit_id}, {"$set": sup_info})
        aud.update(sup_info)
    items = await db.audit_items.find({"audit_id": audit_id}, {"_id": 0}).sort("orden", 1).to_list(2000)
    return {**aud, "items": items}


@router.put("/{audit_id}", response_model=Audit)
async def update_audit(
    audit_id: str,
    payload: AuditUpdate,
    current_user: dict = Depends(require_admin),
):
    aud = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if not aud:
        raise HTTPException(404, "Auditoría no encontrada")
    raw = payload.dict(exclude_unset=True)
    if "estado" in raw and raw["estado"] not in {"draft", "completada"}:
        raise HTTPException(400, "estado debe ser 'draft' o 'completada'")
    if raw.get("estado") == "completada":
        evaluados = await db.audit_items.count_documents(
            {"audit_id": audit_id, "cumplido": {"$ne": None}}
        )
        if evaluados == 0:
            raise HTTPException(400, "Marca al menos un punto antes de completar.")
        raw["completed_at"] = _now()
    raw["updated_at"] = _now()
    await db.audits.update_one({"id": audit_id}, {"$set": raw})
    return await _recalc(audit_id)


@router.delete("/{audit_id}")
async def delete_audit(audit_id: str, current_user: dict = Depends(require_admin)):
    res = await db.audits.delete_one({"id": audit_id})
    await db.audit_items.delete_many({"audit_id": audit_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Auditoría no encontrada")
    return {"deleted": True}


# ============================================================
# Items
# ============================================================
@router.put("/{audit_id}/items/{item_id}")
async def update_item(
    audit_id: str,
    item_id: str,
    payload: AuditItemUpdate,
    current_user: dict = Depends(require_admin),
):
    aud = await db.audits.find_one({"id": audit_id}, {"_id": 0})
    if not aud:
        raise HTTPException(404, "Auditoría no encontrada")
    if aud.get("estado") == "completada":
        raise HTTPException(400, "No se puede editar una auditoría completada")
    item = await db.audit_items.find_one({"id": item_id, "audit_id": audit_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Punto no encontrado")
    raw = payload.dict(exclude_unset=True)
    upd = {}
    for k in ("cumplido", "desviacion", "accion_correctiva", "fecha_compromiso"):
        if k in raw:
            upd[k] = raw[k]
    if "responsable_id" in raw:
        upd["responsable_id"] = raw["responsable_id"] or None
        if upd["responsable_id"]:
            st = await db.process_staff.find_one({"id": upd["responsable_id"]}, {"_id": 0})
            upd["responsable_nombre"] = (st or {}).get("user_name", "")
        else:
            upd["responsable_nombre"] = ""
    if upd.get("cumplido") is True:
        upd["desviacion"] = ""
        upd["accion_correctiva"] = ""
        upd["responsable_id"] = None
        upd["responsable_nombre"] = ""
        upd["fecha_compromiso"] = None
    await db.audit_items.update_one({"id": item_id, "audit_id": audit_id}, {"$set": upd})
    await _recalc(audit_id)
    return await db.audit_items.find_one({"id": item_id}, {"_id": 0})
