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
- **TRES schedules independientes por proceso** (uno por `schedule_type`):
  - `ejecucion` (Realizar · azul · ícono ▶) — cuándo ejecutar el proceso
  - `supervision` (Supervisar · ámbar · ícono ◉) — cuándo supervisarlo
  - `auditoria` (Auditar · morado · ícono ☑) — cuándo auditarlo
  - Cada tipo puede tener su **propio responsable**, su propia frecuencia y su propia hora.
- Frecuencias soportadas: **No se repite · Diariamente · Días laborales (Lun-Vie) · Semanalmente · Mensualmente · Anualmente**
- Eventos calculados virtualmente al consultar (sin pre-generación).
- Visibilidad: **Admin** ve todos · **Empleado** solo los eventos donde sea el responsable de cualquier tipo.
- **Vista combinada con toggles**: los 3 tipos se muestran en un solo grid; toolbar con 3 chips toggleables (R/S/A) para mostrar/ocultar cada tipo. Cada evento del grid muestra una insignia R/S/A y un borde izquierdo de color por tipo.
- Sidebar derecho con **tabs por tipo** (Realizar/Supervisar/Auditar). Cada tab muestra "Sin programar" y "Programados" filtrados por ese tipo.
- Modal de programación coloreado por tipo (header soft-color + ícono) — el botón "Quitar" sólo borra ese tipo específico.
- Click en celda con eventos → DayModal con badge de tipo por evento.

#### Endpoints
- `GET /api/calendar/schedules?schedule_type=…` — lista (filtra por tipo si se pasa)
- `GET /api/calendar/schedules/{proceso_id}?schedule_type=…` — uno (default `ejecucion`)
- `PUT /api/calendar/schedules/{proceso_id}?schedule_type=…` — crea/actualiza
- `DELETE /api/calendar/schedules/{proceso_id}?schedule_type=…` — quita
- `GET /api/calendar/events?fecha_desde=&fecha_hasta=&schedule_types=ejecucion,supervision,auditoria` — eventos virtuales filtrables por tipo
- `GET /api/calendar/processes-without-schedule?schedule_type=…` — para sidebar admin
- **Migración suave**: docs legacy sin `schedule_type` se interpretan como `ejecucion`.

#### Schema `process_schedules`
`{id, proceso_id, schedule_type, tipo, fecha_unica?, dia_semana?, dia_mes?, mes?, hora?, responsable_id?, activa}` · clave única lógica `(proceso_id, schedule_type)`.

### Otros módulos
- Empleados, 9-box, Evaluaciones 360, PDI, Aciertos/Desaciertos, KPIs.

### Supervisión (Feb 2026)
Módulo para revisar ejecuciones pasadas paso a paso.

- Admin selecciona una ejecución previa → sistema clona los pasos en una "supervisión"
- Matriz: # · Actividad · Descripción · Realizado (estado del paso en la ejecución original, informativo) · Pts · ¿Cumple? (checkbox Sí/No)
- Al marcar **No** → fila se expande con Plan de Acción inline: Desviación · Acción Correctiva · Responsable · Fecha compromiso
- Calificación = puntos obtenidos / puntos totales × 100. **Aprobada si ≥ 70% y sin pasos críticos omitidos.**
- Estados: `draft` (editable) | `completada` (read-only).
- Visible y editable sólo por **Admin**. Empleados no pueden auto-supervisarse (403).

#### Endpoints
- `GET /api/supervision` — lista
- `GET /api/supervision/_helpers/eligible-executions` — ejecuciones sin supervisión
- `POST /api/supervision` body `{ejecucion_id}` — crea draft + clona pasos
- `GET /api/supervision/{id}` — detalle (incluye items)
- `PUT /api/supervision/{id}` — cambia estado/observaciones
- `PUT /api/supervision/{id}/items/{item_id}` — marca cumplido + plan correctivo del paso
- `DELETE /api/supervision/{id}`

## Cambios recientes

### Feb 18 2026 — Filtro por tipo en Matriz de procesos
- Toolbar de "Matriz de procesos" añade chips **Todos / Ejecución / Supervisión / Auditoría** (`ProcessSupervisionMatrix.jsx`).
- El filtrado de filas considera **eventos realizados + fechas programadas por schedule** en el rango visible (Hoy/Semana/Mes), no la mera presencia de una frecuencia.
- Backend: `/api/calendar/matrix` ahora devuelve por semana `ejecuciones_programadas`, `supervisiones_programadas`, `auditorias_programadas` (lista de fechas ISO derivadas del schedule). Helper nuevo `_schedule_hit_dates`.
- En vista "Hoy" solo se muestran filas que tienen evento o programación para hoy del tipo seleccionado.

### Feb 5 2026 — Vista Semana en el calendario
- Toggle **Semana / Mes** en la toolbar del calendario (`ProcessCalendar.jsx`).
- Vista Semana: 7 columnas Lun-Dom más altas con eventos en cards ampliadas (hora, código, nombre completo del proceso).
- Navegación ‹ › avanza por semanas o por meses según vista activa. Etiqueta de rango "DD-DD Mmm AAAA" en Semana.

### Feb 5 2026 — Matriz de supervisión mensual
- Nueva vista `/process/supervision-matrix` (admin): tabla estilo planilla con una fila por proceso activo y columnas: Nomenclatura, Proceso, Área, Responsable (ejecución), Frecuencia Proceso, Criticidad, Supervisión, Frecuencia Auditoría, y N columnas Semana 1..N del mes seleccionado.
- Estado por semana: verde "Se ejecuta" (supervisión completada), ámbar "En curso" (draft), rojo (requerida pendiente), gris (no requerida esa semana).
- Fila "Resumen del mes" con totales completadas/requeridas por semana.
- Filtros: búsqueda libre, área, criticidad; navegación mes anterior/siguiente; **exportar CSV**.
- Criticidad derivada por % de pasos críticos del proceso (≥50% → Alta, >0 → Media, 0 → Baja).
- Endpoint: `GET /api/calendar/matrix?year=YYYY&month=M` (admin only).

### Feb 5 2026 — Calendario triple (Realizar / Supervisar / Auditar)
- Un proceso ahora puede tener **3 schedules independientes** (uno de cada tipo), cada uno con su propia frecuencia, hora y responsable.
- Backend: añadido `schedule_type` al modelo `process_schedules`; todos los endpoints aceptan el parámetro `?schedule_type=`. Migración suave de docs legacy.
- Frontend: `ProcessCalendar.jsx` con toggles por tipo en toolbar, sidebar con tabs por tipo, eventos con badge R/S/A y borde de color, modal de programación coloreado por tipo.
- Tests: 12/12 pytest backend + 100% frontend (testing agent).

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
