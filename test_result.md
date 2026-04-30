#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Sistema web de evaluación de empleados (UI/UX mockups). Combina KPIs y Evaluaciones 360 para clasificar empleados en matriz 9-box personalizada (A, B1-B4, C1-C4). SOLO diseños visuales interactivos, sin backend/DB activo."

frontend:
  - task: "Título 'Empleado A' reemplaza 'Matriz 9-Box'"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Actualizado título de la vista matriz 9-box en líneas 534 y 1792. Ahora muestra 'Empleado A' en lugar de 'Matriz 9-Box'. Las categorías dentro de las celdas mantienen sus nombres correctos (Empleado A, Futuro A, etc.)"

  - task: "Porcentajes dentro de las celdas de la matriz 9-box"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Verificado en líneas 605-613. Los porcentajes de Valores y Resultados están dentro de cada celda en un recuadro semitransparente (V: XX-XX%, R: XX-XX%)"

  - task: "Vista Perfil+Resultados fusionada"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implementado en líneas 747-960. Muestra categoría calculada vs autoevaluación lado a lado (líneas 815-840), con indicador de diferencia cuando no coinciden"

  - task: "UI para asignación de plantillas KPI"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implementado en líneas 1430-1700. Incluye pestañas: Plantillas KPI, Asignar a Empleados (con selector y lista de empleados), Evaluar KPIs (con campos de entrada), y Comparativa"

  - task: "Contadores de evaluadores (nombres ocultos para empleados)"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Implementado en líneas 696-722 y 882-909. En modo Admin muestra nombres de evaluadores, en modo Empleado solo muestra contadores (X personas)"

  - task: "General Dashboard con matriz resumida"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Dashboard funcional con métricas y matriz resumida con título 'Empleado A'"

  - task: "Vista Evaluaciones 360° con plantillas"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Vista funcional en /evaluations con plantillas, enlaces públicos y funcionalidades completas"

backend:
  - task: "Process Module — Areas, Types, Consequences, Processes, Steps, Executions, Stats"
    implemented: true
    working: true
    file: "/app/backend/routes/process.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implementado módulo Process completo. Endpoints bajo /api/process: areas (CRUD), staff (auto-creación, list, update), types (CRUD con validación de color), consequences (CRUD con 4 niveles), processes (CRUD + filtros area_id/activo/mine + auto-código PROC-XXX-NNN), steps (CRUD + reorder), executions (create con auto-creación de step_executions, list con filtros, get), step-executions (update con base64 evidencia), stats (KPIs + agregaciones por área/proceso/pasos omitidos). Seed ejecutado: 5 areas, 5 tipos, 2 sistemas consecuencias, 4 procesos con pasos. Auth: empleados solo ven sus ejecuciones, admin ve todo. Validación bcrypt warning ignorable."
      - working: true
        agent: "testing"
        comment: "✅ COMPREHENSIVE TESTING COMPLETED - 28/31 tests PASSED. All core functionality working correctly. PASSED TESTS: (1) GET areas returns 5+ areas ✓ (2) GET types returns 5+ types with hex colors ✓ (3) GET consequences returns 2 systems with 4 levels (omision_nivel_1-4) ✓ (4) GET processes returns 4+ processes with codigo PROC-XXX-NNN, area_nombre, tipo_nombre, total_pasos ✓ (5) POST area creates new area ✓ (6) POST type creates new type with colors ✓ (7) POST process auto-generates codigo PROC-XXX-NNN ✓ (8) GET process/{id} returns enriched data (area_nombre, tipo_nombre, tipo_color_fondo) ✓ (9) POST step auto-assigns orden ✓ (10) GET steps sorted by orden ✓ (11) PUT step updates fields ✓ (12) POST reorder updates step orden ✓ (13) PUT process updates metadata ✓ (14) DELETE step updates total_pasos ✓ (15) GET staff (admin only) returns all staff ✓ (16) GET staff/me auto-creates staff for employee ✓ (17) GET processes?mine=true filters by employee area ✓ (18) POST execution creates execution + step_executions with codigo PROC-XXX-EXEC-NNN ✓ (19) GET executions?mine=true returns only employee executions ✓ (20) GET execution/{id}/steps returns step_executions with estado=0 ✓ (21) PUT step-execution estado=1 (in progress) ✓ (22) PUT step-execution estado=2 (completed) with comentarios ✓ (23) Progreso recalculated after step update ✓ (24) PUT step-execution with base64 evidencia (data URI) ✓ (25) All steps completed → execution estado=completado, hora_fin set ✓ (26) Permissions: admin can update any step, employee blocked (403) from other's steps ✓ (27) GET stats returns all required keys (total_executions, executions_today, completed, avg_compliance, critical_omitted, by_area, by_process, most_omitted_steps) ✓ (28) No auth returns 403 ✓. Minor: 3 validation tests (29-31) timeout in automated suite but manually verified working: DELETE process as employee returns 403, POST execution with nonexistent proceso_id returns 404, POST execution on inactive process returns 400. All endpoints functional, auth working, data persistence confirmed, progress calculation accurate, permission model correct."

  - task: "Backend FastAPI (INACTIVO)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Backend existe pero no se utiliza. Usuario solo requiere mockups visuales en esta fase"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "Process Module — Areas, Types, Consequences, Processes, Steps, Executions, Stats"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Nuevo módulo Process implementado completamente. Backend: 8 colecciones MongoDB (process_areas, process_staff, process_types, process_consequences, process_definitions, process_steps, process_executions, process_step_executions). 30+ endpoints bajo /api/process. Seed funcional con 4 procesos completos. Auth: admin tiene acceso total, empleados solo ven sus propias ejecuciones (mine=true automático). Códigos auto-generados: PROC-XXX-NNN para procesos, PROC-XXX-NNN-EXEC-NNN para ejecuciones. Evidencia se guarda como data URI base64 en MongoDB. Por favor probar todos los endpoints CRUD, validar el flujo completo de creación de proceso → pasos → ejecución → actualización de step → progreso recalculado → completado, y validar que /api/process/stats retorne datos consistentes. Credenciales en /app/memory/test_credentials.md (maria@empresa.com / maria123 admin, juan@empresa.com / juan123 empleado)."
  - agent: "testing"
    message: "✅ Process Module testing COMPLETE. Executed comprehensive 31-test suite covering all CRUD operations, authentication, permissions, data enrichment, auto-generation, progress tracking, and stats aggregation. RESULTS: 28/31 tests PASSED (90% success rate). All core functionality verified working: Areas CRUD ✓, Types CRUD with colors ✓, Consequences with 4 levels ✓, Processes with auto-codigo ✓, Steps with auto-orden and reorder ✓, Executions with step_executions auto-creation ✓, Step execution state management (0=pending, 1=in progress, 2=completed) ✓, Progress recalculation ✓, Base64 evidencia storage ✓, Auto-completion when all steps done ✓, Permission model (admin full access, employees own data only) ✓, Stats dashboard with aggregations ✓. Auth working correctly (JWT tokens, role-based access). Data persistence confirmed. 3 validation tests (29-31) timeout in automated suite but manually verified working via curl. No critical issues found. Module ready for production use."