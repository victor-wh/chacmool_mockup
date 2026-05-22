"""
Modelos del módulo Supervisión.
Una supervisión se basa en una ejecución pasada de un proceso.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SupervisionItem(BaseModel):
    """Un punto a evaluar en la supervisión (clonado del paso original)."""
    id: str
    supervision_id: str
    paso_id: str
    orden: int
    titulo: str
    descripcion: Optional[str] = ""
    puntos: int = 1
    es_critico: bool = False

    # Snapshot de la ejecución original (informativo)
    realizado_estado: int = 0  # 0=Pendiente | 1=En progreso | 2=Completado | 3=Error (en la ejecución)
    realizado_comentarios: Optional[str] = ""
    realizado_evidencia_nombre: Optional[str] = None

    # Marcas del auditor
    cumplido: Optional[bool] = None  # checkbox
    desviacion: Optional[str] = ""
    accion_correctiva: Optional[str] = ""
    responsable_id: Optional[str] = None
    responsable_nombre: Optional[str] = ""
    fecha_compromiso: Optional[str] = None  # YYYY-MM-DD


class SupervisionItemUpdate(BaseModel):
    cumplido: Optional[bool] = None
    desviacion: Optional[str] = None
    accion_correctiva: Optional[str] = None
    responsable_id: Optional[str] = None
    fecha_compromiso: Optional[str] = None


class Supervision(BaseModel):
    id: str
    codigo: str  # SUP-001
    ejecucion_id: str
    ejecucion_codigo: str
    proceso_id: str
    proceso_codigo: str
    proceso_nombre: str
    area_nombre: Optional[str] = ""
    tipo_color_fondo: Optional[str] = "#3B82F6"
    tipo_color_texto: Optional[str] = "#FFFFFF"
    # operario evaluado (el dueño de la ejecución)
    evaluado_id: Optional[str] = None
    evaluado_nombre: Optional[str] = ""
    # auditor
    auditor_id: str
    auditor_nombre: str
    fecha: str  # YYYY-MM-DD
    estado: str = "draft"  # draft | completada
    puntaje_obtenido: float = 0
    puntaje_total: float = 0
    porcentaje: float = 0
    criticos_omitidos: int = 0
    items_total: int = 0
    items_evaluados: int = 0
    aprobada: Optional[bool] = None
    observaciones: Optional[str] = ""
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class SupervisionCreate(BaseModel):
    ejecucion_id: str


class SupervisionUpdate(BaseModel):
    estado: Optional[str] = None  # draft | completada
    observaciones: Optional[str] = None
