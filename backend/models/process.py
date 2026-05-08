"""
Pydantic models for the Process module.
Stores: areas, staff, process types, consequence systems, processes, steps, executions, step executions.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ---------- Area ----------
class AreaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""


class AreaCreate(AreaBase):
    pass


class Area(AreaBase):
    id: str
    created_at: datetime


# ---------- Staff ----------
class StaffBase(BaseModel):
    user_id: str
    user_name: Optional[str] = ""
    user_email: Optional[str] = ""
    area_id: Optional[str] = None
    area_nombre: Optional[str] = ""
    permisos_temporales: bool = False
    acceso_servidor: bool = False


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    area_id: Optional[str] = None
    permisos_temporales: Optional[bool] = None
    acceso_servidor: Optional[bool] = None


class Staff(StaffBase):
    id: str
    created_at: datetime


# ---------- Process Type ----------
class ProcessTypeBase(BaseModel):
    nombre: str
    color_fondo: str = "#3B82F6"   # hex
    color_texto: str = "#FFFFFF"   # hex


class ProcessTypeCreate(ProcessTypeBase):
    pass


class ProcessType(ProcessTypeBase):
    id: str
    created_at: datetime


# ---------- System Of Consequences ----------
class SystemOfConsequencesBase(BaseModel):
    nombre: str
    omision_nivel_1: str = ""
    omision_nivel_2: str = ""
    omision_nivel_3: str = ""
    omision_nivel_4: str = ""


class SystemOfConsequencesCreate(SystemOfConsequencesBase):
    pass


class SystemOfConsequences(SystemOfConsequencesBase):
    id: str
    created_at: datetime


# ---------- Process ----------
class ProcessProgramacion(BaseModel):
    """Configuración de programación periódica de un proceso."""
    tipo: str = "eventual"  # 'diario'|'semanal'|'mensual'|'trimestral'|'anual'|'eventual'
    dia_semana: Optional[int] = None  # 0=Lunes ... 6=Domingo (semanal)
    dia_mes: Optional[int] = None  # 1..31 (mensual / trimestral / anual)
    mes: Optional[int] = None  # 1..12 (anual)
    meses_trimestre: Optional[List[int]] = None  # default [1,4,7,10] (trimestral)
    hora: Optional[str] = None  # "HH:MM"
    criticidad: Optional[str] = "medio"  # 'alto' | 'medio' | 'bajo'
    activa: bool = True


class ProcessBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    url_referencia: Optional[str] = ""
    area_id: Optional[str] = None
    tipo_id: Optional[str] = None
    sistema_consecuencias_id: Optional[str] = None
    activo: bool = True
    responsable_id: Optional[str] = None  # staff a cargo del proceso (programación)
    programacion: Optional[ProcessProgramacion] = None


class ProcessCreate(ProcessBase):
    pass


class ProcessUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    url_referencia: Optional[str] = None
    area_id: Optional[str] = None
    tipo_id: Optional[str] = None
    sistema_consecuencias_id: Optional[str] = None
    activo: Optional[bool] = None
    responsable_id: Optional[str] = None
    programacion: Optional[ProcessProgramacion] = None


class Process(ProcessBase):
    id: str
    codigo: str  # auto: PROC-{prefix}-{counter}
    area_nombre: Optional[str] = ""
    tipo_nombre: Optional[str] = ""
    tipo_color_fondo: Optional[str] = "#3B82F6"
    tipo_color_texto: Optional[str] = "#FFFFFF"
    sistema_consecuencias_nombre: Optional[str] = ""
    responsable_nombre: Optional[str] = ""
    total_pasos: int = 0
    created_at: datetime


# ---------- Process Step ----------
class ProcessStepBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    orden: int = 0
    puntos: int = 1
    requiere_evidencia: bool = False
    es_critico: bool = False
    auditable: bool = True
    staff_asignado_id: Optional[str] = None


class ProcessStepCreate(ProcessStepBase):
    pass


class ProcessStepUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    puntos: Optional[int] = None
    requiere_evidencia: Optional[bool] = None
    es_critico: Optional[bool] = None
    auditable: Optional[bool] = None
    staff_asignado_id: Optional[str] = None


class ProcessStep(ProcessStepBase):
    id: str
    proceso_id: str
    staff_asignado_nombre: Optional[str] = ""
    created_at: datetime


class ReorderStepsRequest(BaseModel):
    step_ids: List[str]  # array de ids en el nuevo orden


# ---------- Process Execution ----------
class ProcessExecutionCreate(BaseModel):
    proceso_id: str


class ProcessExecution(BaseModel):
    id: str
    codigo_ejecucion: str  # PROC-XXX-EXEC-#
    proceso_id: str
    proceso_nombre: str
    proceso_codigo: str
    tipo_nombre: Optional[str] = ""
    tipo_color_fondo: Optional[str] = "#3B82F6"
    tipo_color_texto: Optional[str] = "#FFFFFF"
    staff_id: str
    staff_user_id: str
    staff_user_name: str
    staff_area_nombre: Optional[str] = ""
    fecha: str  # YYYY-MM-DD
    hora_inicio: str  # HH:MM
    hora_fin: Optional[str] = None
    estado: str = "en_progreso"  # en_progreso | completado
    progreso: float = 0.0  # 0-100
    total_pasos: int = 0
    pasos_completados: int = 0
    created_at: datetime


# ---------- Step Execution ----------
class StepExecutionUpdate(BaseModel):
    estado: Optional[int] = None  # 0=Pendiente | 1=En progreso | 2=Completado | 3=Error
    evidencia: Optional[str] = None  # base64 string
    evidencia_nombre: Optional[str] = None
    comentarios: Optional[str] = None


class StepExecution(BaseModel):
    id: str
    ejecucion_id: str
    paso_id: str
    paso_nombre: str
    paso_descripcion: Optional[str] = ""
    paso_orden: int
    paso_puntos: int
    paso_requiere_evidencia: bool = False
    paso_es_critico: bool = False
    paso_auditable: bool = True
    staff_asignado_id: Optional[str] = None
    staff_asignado_nombre: Optional[str] = ""
    estado: int = 0  # 0=Pendiente | 1=En progreso | 2=Completado | 3=Error
    evidencia: Optional[str] = None  # base64
    evidencia_nombre: Optional[str] = None
    comentarios: str = ""
    fecha_actualizacion: Optional[datetime] = None


# ---------- Scheduled Execution ----------
class ScheduledExecution(BaseModel):
    """Una ejecución programada (slot del calendario)."""
    id: str
    proceso_id: str
    proceso_codigo: str
    proceso_nombre: str
    tipo_nombre: Optional[str] = ""
    tipo_color_fondo: Optional[str] = "#3B82F6"
    tipo_color_texto: Optional[str] = "#FFFFFF"
    area_id: Optional[str] = None
    area_nombre: Optional[str] = ""
    responsable_id: Optional[str] = None
    responsable_nombre: Optional[str] = ""
    fecha: str  # YYYY-MM-DD
    hora: Optional[str] = None  # HH:MM
    criticidad: str = "medio"  # alto | medio | bajo
    estado: str = "programada"  # programada | iniciada | completada | atrasada
    ejecucion_id: Optional[str] = None
    ejecucion_codigo: Optional[str] = None
    created_at: datetime

