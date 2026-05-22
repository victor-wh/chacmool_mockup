# Proceso EvalPro · PRD

> Aplicación full-stack de gestión de procesos operativos con calendario de ejecución, ejecución por empleado y evaluaciones 360.

## Stack
- Backend: FastAPI + Motor (MongoDB)
- Frontend: React 19 + Tailwind + lucide-react + Shadcn UI

## Estructura del producto

### Procesos (CRUD)
- Definición de procesos con áreas, tipos (con colores), sistema de consecuencias
- Pasos del proceso con: orden, puntos, criticidad, requiere evidencia, auditable, staff asignado
- Ejecuciones por staff con progreso, estados, evidencias
- Vista "Mis procesos" agrupada por área (tabs)
- Vista "Pasos asignados a mí" (colaboración entre áreas)
- Sidebar dropdown "Todos los procesos" con árbol jerárquico

### Calendario de procesos (Feb 2026 — versión nueva)
- Una programación opcional **por proceso** (1:1) configurada **desde la página del calendario**.
- Frecuencias soportadas: **No se repite · Diariamente · Días laborales (Lun-Vie) · Semanalmente · Mensualmente · Anualmente**
- Eventos calculados virtualmente al consultar (sin pre-generación), por lo que cambiar la programación reflejado al instante.
- Visibilidad: **Admin** ve todos los eventos · **Empleado** solo donde sea el responsable.
- Sidebar derecho:
  - Admin: "Sin programar" (procesos activos sin schedule) + "Programados" (con descripción legible)
  - Empleado: "Mis procesos" (solo los suyos)
- Modal de programación: tipo de recurrencia + campos condicionales + hora opcional + responsable + activa.
- Click en celda con eventos → modal con detalle del día.

#### Endpoints
- `GET /api/calendar/schedules` — lista (admin todos, empleado los suyos)
- `GET /api/calendar/schedules/{proceso_id}` — uno
- `PUT /api/calendar/schedules/{proceso_id}` — crea o actualiza (admin)
- `DELETE /api/calendar/schedules/{proceso_id}` — quita (admin)
- `GET /api/calendar/events?fecha_desde=&fecha_hasta=` — eventos virtuales en rango
- `GET /api/calendar/processes-without-schedule` — para sidebar admin

### Otros módulos
- Empleados, 9-box, Evaluaciones 360, PDI, Aciertos/Desaciertos, KPIs.

## Cambios recientes

### Feb 2026 — Calendario rehecho desde cero
- **ELIMINADOS**: módulo Auditorías + módulo "Programación" anterior (`process_schedule.py`, `audit.py`, frontend `audits/*`, `ProcessSchedule.jsx`)
- **REVERTIDOS**: `ProcessForm` (sin sección programación), `Process` model (sin `programacion`/`responsable_id`)
- **NUEVO**: módulo Calendario con frecuencias simplificadas (6 exactas) + sidebar tipo Planner + visibilidad por rol.

## Backlog
- Asignar fecha desde el calendario (drag-and-drop o "+" en una celda futura)
- Notificación al responsable cuando se acerca un evento
- Exportar el calendario a iCal/Google Calendar
- Soporte para múltiples responsables por proceso

## Test credentials
Ver `/app/memory/test_credentials.md`.
