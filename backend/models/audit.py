"""
Modelos del módulo Auditoría.
Una auditoría se basa en una ejecución pasada de un proceso (al igual que supervisión).
Punto adicional: verifica si se realizó la supervisión asociada a la ejecución.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditItem(BaseModel):
    """Un punto a evaluar en la auditoría (clonado del paso original)."""
    id: str
    audit_id: str
    paso_id: str
    orden: int
    titulo: str
    descripcion: Optional[str] = ""
    puntos: int = 1
    es_critico: bool = False

    # Snapshot de la ejecución original (informativo)
    realizado_estado: int = 0
    realizado_comentarios: Optional[str] = ""
    realizado_evidencia_nombre: Optional[str] = None

    # Marcas del auditor
    cumplido: Optional[bool] = None
    desviacion: Optional[str] = ""
    accion_correctiva: Optional[str] = ""
    responsable_id: Optional[str] = None
    responsable_nombre: Optional[str] = ""
    fecha_compromiso: Optional[str] = None


class AuditItemUpdate(BaseModel):
    cumplido: Optional[bool] = None
    desviacion: Optional[str] = None
    accion_correctiva: Optional[str] = None
    responsable_id: Optional[str] = None
    fecha_compromiso: Optional[str] = None


class Audit(BaseModel):
    id: str
    codigo: str  # AUD-001
    ejecucion_id: str
    ejecucion_codigo: str
    proceso_id: str
    proceso_codigo: str
    proceso_nombre: str
    area_nombre: Optional[str] = ""
    tipo_color_fondo: Optional[str] = "#7C3AED"
    tipo_color_texto: Optional[str] = "#FFFFFF"
    evaluado_id: Optional[str] = None
    evaluado_nombre: Optional[str] = ""
    auditor_id: str
    auditor_nombre: str
    fecha: str
    estado: str = "draft"  # draft | completada
    puntaje_obtenido: float = 0
    puntaje_total: float = 0
    porcentaje: float = 0
    criticos_omitidos: int = 0
    items_total: int = 0
    items_evaluados: int = 0
    aprobada: Optional[bool] = None
    observaciones: Optional[str] = ""

    # ---- Extras propios de la AUDITORÍA ----
    # Punto adicional: ¿se realizó la supervisión correspondiente?
    supervision_realizada: bool = False
    supervision_id: Optional[str] = None
    supervision_codigo: Optional[str] = None
    supervision_aprobada: Optional[bool] = None

    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AuditCreate(BaseModel):
    ejecucion_id: str


class AuditUpdate(BaseModel):
    estado: Optional[str] = None
    observaciones: Optional[str] = None
