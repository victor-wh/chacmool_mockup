"""
Rutas del módulo Supervisión.
Prefix: /api/supervision

Flujo:
 1. Admin lista supervisiones existentes (GET /).
 2. Crea una nueva escogiendo una ejecución pasada (POST /).
 3. Marca cada paso con checkbox cumplido/no cumplido (PUT /{id}/items/{item_id}).
 4. Si marca un paso como No cumplido → llena Desviación / Acción correctiva / Responsable / Fecha.
 5. Marca la supervisión como completada (PUT /{id} estado=completada).
 6. El sistema calcula puntaje_obtenido, porcentaje, aprobada.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from uuid import uuid4
from datetime import datetime

from middlewares.auth import db, get_current_active_user, require_admin
from models.supervision import (
    Supervision,
    SupervisionItem,
    SupervisionCreate,
    SupervisionUpdate,
    SupervisionItemUpdate,
)


router = APIRouter(prefix="/api/supervision", tags=["supervision"])

PASS_THRESHOLD = 70.0  # %


def _now() -> datetime:
    return datetime.now()


async def _recalc(supervision_id: str) -> dict:
    """Recalcula puntaje, porcentaje, criticos_omitidos, aprobada."""
    sup = await db.supervisions.find_one({"id": supervision_id}, {"_id": 0})
    if not sup:
        raise HTTPException(404, "Supervisión no encontrada")
    items = await db.supervision_items.find({"supervision_id": supervision_id}, {"_id": 0}).to_list(2000)
    total_puntos = sum(it.get("puntos", 1) for it in items)
    obtenidos = sum(it.get("puntos", 1) for it in items if it.get("cumplido") is True)
    criticos = sum(1 for it in items if it.get("es_critico") and it.get("cumplido") is False)
    evaluados = sum(1 for it in items if it.get("cumplido") is not None)
    pct = round((obtenidos / total_puntos) * 100, 1) if total_puntos > 0 else 0
    aprobada = None
    if sup.get("estado") == "completada":
        aprobada = pct >= PASS_THRESHOLD and criticos == 0
    upd = {
        "puntaje_obtenido": obtenidos,
        "puntaje_total": total_puntos,
        "porcentaje": pct,
        "criticos_omitidos": criticos,
        "items_total": len(items),
        "items_evaluados": evaluados,
        "aprobada": aprobada,
        "updated_at": _now(),
    }
    await db.supervisions.update_one({"id": supervision_id}, {"$set": upd})
    return {**sup, **upd}


# ============================================================
# CRUD
# ============================================================
@router.post("", response_model=Supervision)
async def create_supervision(payload: SupervisionCreate, current_user: dict = Depends(require_admin)):
    """Crea una supervisión a partir de una ejecución, clonando sus pasos."""
    ejec = await db.process_executions.find_one({"id": payload.ejecucion_id}, {"_id": 0})
    if not ejec:
        raise HTTPException(404, "Ejecución no encontrada")
    # Una ejecución sólo puede tener UNA supervisión vigente
    existing = await db.supervisions.find_one(
        {"ejecucion_id": payload.ejecucion_id}, {"_id": 0}
    )
    if existing:
        raise HTTPException(400, f"Esta ejecución ya tiene una supervisión ({existing.get('codigo')}).")

    proc = await db.process_definitions.find_one({"id": ejec["proceso_id"]}, {"_id": 0})
    if not proc:
        raise HTTPException(404, "Proceso no encontrado")

    step_execs = await db.process_step_executions.find(
        {"ejecucion_id": ejec["id"]}, {"_id": 0}
    ).sort("paso_orden", 1).to_list(500)

    counter = await db.supervisions.count_documents({}) + 1
    codigo = f"SUP-{counter:03d}"
    now = _now()
    sup_id = str(uuid4())

    sup = {
        "id": sup_id,
        "codigo": codigo,
        "ejecucion_id": ejec["id"],
        "ejecucion_codigo": ejec.get("codigo_ejecucion", ""),
        "proceso_id": proc["id"],
        "proceso_codigo": proc.get("codigo", ""),
        "proceso_nombre": proc.get("nombre", ""),
        "area_nombre": proc.get("area_nombre", ""),
        "tipo_color_fondo": proc.get("tipo_color_fondo", "#3B82F6"),
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
    }
    await db.supervisions.insert_one(dict(sup))

    items = []
    for se in step_execs:
        items.append({
            "id": str(uuid4()),
            "supervision_id": sup_id,
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
        await db.supervision_items.insert_many([dict(i) for i in items])
    updated = await _recalc(sup_id)
    return updated


@router.get("", response_model=List[Supervision])
async def list_supervisions(current_user: dict = Depends(require_admin)):
    docs = await db.supervisions.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@router.get("/_helpers/eligible-executions")
async def eligible_executions(
    proceso_id: Optional[str] = Query(None),
    current_user: dict = Depends(require_admin),
):
    """Lista ejecuciones que pueden supervisarse (no tienen supervisión aún)."""
    used = set()
    async for s in db.supervisions.find({}, {"_id": 0, "ejecucion_id": 1}):
        used.add(s["ejecucion_id"])
    q = {}
    if proceso_id:
        q["proceso_id"] = proceso_id
    ejes = await db.process_executions.find(q, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return [
        {
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
        }
        for e in ejes if e["id"] not in used
    ]


@router.get("/{supervision_id}")
async def get_supervision(supervision_id: str, current_user: dict = Depends(require_admin)):
    sup = await db.supervisions.find_one({"id": supervision_id}, {"_id": 0})
    if not sup:
        raise HTTPException(404, "Supervisión no encontrada")
    items = await db.supervision_items.find(
        {"supervision_id": supervision_id}, {"_id": 0}
    ).sort("orden", 1).to_list(2000)
    return {**sup, "items": items}


@router.put("/{supervision_id}", response_model=Supervision)
async def update_supervision(
    supervision_id: str,
    payload: SupervisionUpdate,
    current_user: dict = Depends(require_admin),
):
    sup = await db.supervisions.find_one({"id": supervision_id}, {"_id": 0})
    if not sup:
        raise HTTPException(404, "Supervisión no encontrada")
    raw = payload.dict(exclude_unset=True)
    if "estado" in raw and raw["estado"] not in {"draft", "completada"}:
        raise HTTPException(400, "estado debe ser 'draft' o 'completada'")
    if raw.get("estado") == "completada":
        # Verificar que al menos haya un item evaluado
        evaluados = await db.supervision_items.count_documents(
            {"supervision_id": supervision_id, "cumplido": {"$ne": None}}
        )
        if evaluados == 0:
            raise HTTPException(400, "Marca al menos un punto antes de completar.")
        raw["completed_at"] = _now()
    raw["updated_at"] = _now()
    await db.supervisions.update_one({"id": supervision_id}, {"$set": raw})
    return await _recalc(supervision_id)


@router.delete("/{supervision_id}")
async def delete_supervision(supervision_id: str, current_user: dict = Depends(require_admin)):
    res = await db.supervisions.delete_one({"id": supervision_id})
    await db.supervision_items.delete_many({"supervision_id": supervision_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Supervisión no encontrada")
    return {"deleted": True}


# ============================================================
# Items
# ============================================================
@router.put("/{supervision_id}/items/{item_id}")
async def update_item(
    supervision_id: str,
    item_id: str,
    payload: SupervisionItemUpdate,
    current_user: dict = Depends(require_admin),
):
    sup = await db.supervisions.find_one({"id": supervision_id}, {"_id": 0})
    if not sup:
        raise HTTPException(404, "Supervisión no encontrada")
    if sup.get("estado") == "completada":
        raise HTTPException(400, "No se puede editar una supervisión completada")
    item = await db.supervision_items.find_one(
        {"id": item_id, "supervision_id": supervision_id}, {"_id": 0}
    )
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
    # Si se marca como cumplido, limpiamos el plan de acción del paso
    if upd.get("cumplido") is True:
        upd["desviacion"] = ""
        upd["accion_correctiva"] = ""
        upd["responsable_id"] = None
        upd["responsable_nombre"] = ""
        upd["fecha_compromiso"] = None
    await db.supervision_items.update_one(
        {"id": item_id, "supervision_id": supervision_id}, {"$set": upd}
    )
    await _recalc(supervision_id)
    return await db.supervision_items.find_one({"id": item_id}, {"_id": 0})
