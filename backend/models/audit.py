"""
Modelos del módulo Auditorías (evaluación de procesos).
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ---------- Audit Item ----------
class AuditItemBase(BaseModel):
    orden: int = 0
    titulo: str
    descripcion: Optional[str] = ""
    puntos: int = 1
    origen: str = "custom"  # 'paso' | 'custom'
    paso_id: Optional[str] = None


class AuditItemCreate(AuditItemBase):
    pass


class AuditItemUpdate(BaseModel):
    orden: Optional[int] = None
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    puntos: Optional[int] = None
    cumplido: Optional[bool] = None
    comentarios: Optional[str] = None
    desviacion: Optional[str] = None
    accion_correctiva: Optional[str] = None
    responsable_id: Optional[str] = None
    fecha_compromiso: Optional[str] = None


class AuditItem(AuditItemBase):
    id: str
    audit_id: str
    cumplido: Optional[bool] = None  # confirmación del auditor
    realizado_reportado: Optional[bool] = None  # informativo: lo que reportó el operario
    puntos_obtenidos: int = 0
    comentarios: str = ""
    es_critico: bool = False
    evidencia: Optional[str] = None  # base64 si proviene de step_execution
    evidencia_nombre: Optional[str] = None
    step_execution_id: Optional[str] = None
    # Plan de acción (sólo aplica si cumplido == False)
    desviacion: str = ""
    accion_correctiva: str = ""
    responsable_id: Optional[str] = None
    responsable_nombre: Optional[str] = ""
    fecha_compromiso: Optional[str] = None
    created_at: datetime


class ItemsFromStepsPayload(BaseModel):
    """Crea N items a partir de pasos seleccionados del proceso."""
    paso_ids: List[str]


# ---------- Audit ----------
class AuditBase(BaseModel):
    proceso_id: str
    tipo: str  # 'presencial' | 'historica'
    ejecucion_id: Optional[str] = None  # solo para 'historica'
    modo: str  # 'pasos' | 'puntos'
    evaluado_id: Optional[str] = None
    comentarios: Optional[str] = ""


class AuditCreate(AuditBase):
    pass


class AuditUpdate(BaseModel):
    estado: Optional[str] = None  # 'borrador' | 'en_progreso' | 'completada'
    comentarios: Optional[str] = None
    evaluado_id: Optional[str] = None


class Audit(AuditBase):
    id: str
    codigo: str  # AUD-{counter}
    proceso_nombre: Optional[str] = ""
    proceso_codigo: Optional[str] = ""
    evaluador_id: str
    evaluador_nombre: Optional[str] = ""
    evaluado_nombre: Optional[str] = ""
    ejecucion_codigo: Optional[str] = ""
    estado: str = "borrador"
    fecha: str = ""
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    total_puntos: int = 0
    puntos_obtenidos: int = 0
    porcentaje: float = 0.0
    total_items: int = 0
    items_evaluados: int = 0
    criticos_omitidos: int = 0
    aprobada: Optional[bool] = None
    es_supervision: bool = False  # True si fue creada desde una ejecución
    created_at: datetime
    updated_at: Optional[datetime] = None
