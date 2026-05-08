# EvalPro - Sistema de Evaluación 360° v4

## Problem Statement
Sistema web de evaluación de empleados basado en la lógica real del cliente WispaHub.

## Estado Actual
**MOCKUPS VISUALES v4 COMPLETOS** - Ajustados a documentación del cliente

## Cambios Realizados (v4)

### Matriz 9-Box con Porcentajes
- **Eje Y (VALORES):** 0-60%, 61-80%, 81-100%
- **Eje X (RESULTADOS):** 0-60%, 61-80%, 81-100%
- Clasificaciones basadas en documento "NOTAS JUGADORES.pdf":
  - **A** (81-100% ambos): "Jugador A - Espectaculares. Da resultados. Independientes."
  - **B3** (81-100% valores, 0-60% resultados): "Quiere ser A - Tiene valores pero no da resultados. Puesto incorrecto."
  - **C3** (0-60% valores, 81-100% resultados): "Difícil de Sacar - Genera resultados pero no tiene valores (cáncer). Tóxico."
  - Etc.

### Estructura de Evaluación (basada en CSV del cliente)
**Competencias necesarias para desempeñar su cargo (50%):**
- Liderazgo
- Trabajo en equipo
- Resolución de problemas
- Aprendizaje continuo

**Valores (50%):**
- Hazlo Ahora
- Mejora continua (Ley Boy Scout)
- Autoaprendizaje
- Alertidad
- Amabilidad
- Valor Agregado
- Comunicación Asertiva

### Tipos de Evaluadores
- Superior (30%)
- Subordinados (20%)
- Compañeros (20%)
- Clientes (15%)
- Autoevaluación (15%)

### Escala de Calificación
1. Nunca demuestra esta competencia/valor
2. Rara vez demuestra esta competencia/valor
3. A veces demuestra esta competencia/valor
4. Frecuentemente demuestra esta competencia/valor
5. Siempre demuestra esta competencia/valor

## Funcionalidades Implementadas ✅
- [x] Matriz 9-Box con porcentajes visibles
- [x] Clasificaciones con descripciones del cliente
- [x] Acciones recomendadas por clasificación
- [x] Desglose por tipo de evaluador
- [x] Competencias y Valores del CSV
- [x] Pesos auto-ajustables
- [x] Generación de enlaces públicos (WhatsApp/Email)
- [x] Formulario público escala 1-5
- [x] Panel de detalle al seleccionar empleado
- [x] Dashboard con estadísticas
- [x] Override manual de clasificación

## Testing
- 100% pruebas pasadas (22 funcionalidades verificadas)

## Módulo Process (HR/Operations) — Feb 2026

### Estado: ✅ Implementado y testeado
Módulo completo para gestionar procesos operacionales con ejecución diaria por empleados.

### Funcionalidades Implementadas ✅
- [x] Modelos backend (Area, Staff, ProcessType, SystemOfConsequences, Process, ProcessStep, ProcessExecution, StepExecution)
- [x] Rutas FastAPI `/api/process/*` (types, consequences, processes, steps, executions, stats)
- [x] Seed script `/app/backend/seed_process.py`
- [x] 10 Vistas React (ProcessHome, ProcessList, ProcessForm, ProcessDetail, ProcessTypes, ConsequenceSystems, ProcessDashboard, AdminExecutions, ExecutionDetail, MyProcesses, MyExecutions)
- [x] Sidebar y ruteo integrados en App.js
- [x] Evidencias guardadas como Base64 en MongoDB
- [x] Dashboard con Recharts (stats, charts por área, % cumplimiento, pasos omitidos)
- [x] **(Feb 2026) Fix P0: modales con scroll correcto** — cambio `items-center` → `items-start pt-10 pb-10` en ProcessDetail, ConsequenceSystems, ProcessTypes, ExecutionDetail

### Credenciales de prueba
- Admin: maria@empresa.com / maria123
- Empleado: juan@empresa.com / juan123
- Admin alt.: admin@empresa.com / admin123

## Backlog
- [ ] Refactor: extraer componente genérico `<Modal>` reutilizable
- [ ] Considerar almacenamiento externo para evidencias Base64 (si crecen)
- [ ] Carga desde Excel/CSV
- [ ] Historial de evaluaciones
- [ ] Integrar métricas del módulo Auditorías al Dashboard principal
- [ ] Reportes/exportación PDF de auditorías

## Módulo Auditorías — Feb 2026

### Estado: ✅ Implementado y testeado
Evaluación de procesos por administradores (presencial o histórica), con auto-cálculo de puntaje, banner aprobada/reprobada (≥70% y sin críticos omitidos), y plan de acción correctiva.

### Funcionalidades Implementadas ✅
- [x] Modelos: `Audit`, `AuditItem` con plan de acción por ítem (desviación / acción / responsable / fecha)
- [x] Rutas `/api/audits/*` con CRUD, importación de pasos, supervisión desde ejecución
- [x] Vistas React: `AuditList`, `AuditForm` (wizard), `AuditDetail` con tabla evaluadora
- [x] Tabla split: "Realizado" (operario, informativo) vs "Confirmado" (auditor, decisión)
- [x] Plan de acción por paso aparece dinámicamente sólo si auditor marca "No"
- [x] **(Feb 2026) Plan Maestro de Acción Correctiva** — formulario completo a nivel auditoría que aparece cuando porcentaje ≤ 70% o hay críticos omitidos. Incluye:
  - Descripción de la desviación
  - Investigación de causa raíz (5 Porqués)
  - Acción correctiva (elimina la causa)
  - Plan de implementación (qué/quién/cuándo/cómo se valida)
  - Resultado esperado
  - Evaluación de eficacia (fecha verificación, evidencias, ¿problema recurrió?, comentarios)
  - Auto-guardado con debounce, denormalización del nombre del responsable
  - Editable mientras estado != completada; readonly al completar
  - Endpoint dedicado: `PUT /api/audits/{id}/plan-correctivo` con merge profundo

---
*Última actualización: Feb 2026*
*Basado en: NOTAS JUGADORES.pdf, Evaluacion 360 WispaHub CSV, Pros-RH-20.png, Process module specs*
