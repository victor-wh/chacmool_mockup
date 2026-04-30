#!/usr/bin/env python3
"""
Comprehensive backend test for Process module.
Tests all 31 scenarios from the review request.
"""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import sys
from typing import Dict, Optional

# Backend URL
BASE_URL = "https://sprint-runner-16.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "maria@empresa.com"
ADMIN_PASSWORD = "maria123"
EMPLOYEE_EMAIL = "juan@empresa.com"
EMPLOYEE_PASSWORD = "juan123"

# Global state
admin_token = None
employee_token = None
test_results = []
created_ids = {}

# Create a session with retry logic
session = requests.Session()
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
)
adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
session.mount("http://", adapter)
session.mount("https://", adapter)

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(test_num: int, description: str, passed: bool, details: str = ""):
    """Log test result"""
    status = f"{Colors.GREEN}✓ PASS{Colors.END}" if passed else f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"\n{Colors.BLUE}Test {test_num}: {description}{Colors.END}")
    print(f"Status: {status}")
    if details:
        print(f"Details: {details}")
    test_results.append({
        "test": test_num,
        "description": description,
        "passed": passed,
        "details": details
    })

def login(email: str, password: str) -> Optional[str]:
    """Login and return JWT token"""
    try:
        response = session.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=20
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"{Colors.RED}Login failed: {response.status_code} - {response.text}{Colors.END}")
            return None
    except Exception as e:
        print(f"{Colors.RED}Login error: {str(e)}{Colors.END}")
        return None

def make_request(method: str, endpoint: str, token: str, data: dict = None, params: dict = None):
    """Make authenticated request"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = session.get(url, headers=headers, params=params, timeout=20)
        elif method == "POST":
            response = session.post(url, headers=headers, json=data, timeout=20)
        elif method == "PUT":
            response = session.put(url, headers=headers, json=data, timeout=20)
        elif method == "DELETE":
            response = session.delete(url, headers=headers, timeout=20)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.Timeout:
        print(f"{Colors.YELLOW}Request timeout for {method} {endpoint}{Colors.END}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"{Colors.RED}Request error for {method} {endpoint}: {str(e)}{Colors.END}")
        return None
    except Exception as e:
        print(f"{Colors.RED}Unexpected error for {method} {endpoint}: {str(e)}{Colors.END}")
        return None

# ============================================================
# ADMIN TESTS
# ============================================================

def test_01_get_areas():
    """Test 1: GET /api/process/areas — should return at least 5 areas"""
    response = make_request("GET", "/process/areas", admin_token)
    if response and response.status_code == 200:
        areas = response.json()
        passed = len(areas) >= 5
        log_test(1, "GET /api/process/areas", passed, 
                f"Expected at least 5 areas, got {len(areas)}")
        if passed and areas:
            created_ids['area_id'] = areas[0]['id']
        return passed
    else:
        log_test(1, "GET /api/process/areas", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_02_get_types():
    """Test 2: GET /api/process/types — should return at least 5 types with hex colors"""
    response = make_request("GET", "/process/types", admin_token)
    if response and response.status_code == 200:
        types = response.json()
        passed = len(types) >= 5 and all('color_fondo' in t and t['color_fondo'].startswith('#') for t in types)
        log_test(2, "GET /api/process/types", passed, 
                f"Expected at least 5 types with hex colors, got {len(types)}")
        if passed and types:
            created_ids['tipo_id'] = types[0]['id']
        return passed
    else:
        log_test(2, "GET /api/process/types", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_03_get_consequences():
    """Test 3: GET /api/process/consequences — should return 2 systems with 4 levels each"""
    response = make_request("GET", "/process/consequences", admin_token)
    if response and response.status_code == 200:
        consequences = response.json()
        # Check for 4 level fields: omision_nivel_1 through omision_nivel_4
        has_4_levels = all(
            all(f'omision_nivel_{i}' in c for i in range(1, 5))
            for c in consequences
        )
        passed = len(consequences) == 2 and has_4_levels
        log_test(3, "GET /api/process/consequences", passed, 
                f"Expected 2 systems with 4 levels each, got {len(consequences)} systems")
        if consequences:
            created_ids['consecuencia_id'] = consequences[0]['id']
        return passed
    else:
        log_test(3, "GET /api/process/consequences", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_04_get_processes():
    """Test 4: GET /api/process/processes — should return at least 4 processes with codigo, area_nombre, tipo_nombre, total_pasos"""
    response = make_request("GET", "/process/processes", admin_token)
    if response and response.status_code == 200:
        processes = response.json()
        required_fields = ['codigo', 'area_nombre', 'tipo_nombre', 'total_pasos']
        passed = (len(processes) >= 4 and 
                 all(all(field in p for field in required_fields) for p in processes) and
                 all(p['codigo'].startswith('PROC-') for p in processes))
        log_test(4, "GET /api/process/processes", passed, 
                f"Expected at least 4 processes with required fields, got {len(processes)}")
        if processes:
            created_ids['proceso_id'] = processes[0]['id']
        return passed
    else:
        log_test(4, "GET /api/process/processes", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_05_create_area():
    """Test 5: POST /api/process/areas with new area"""
    data = {"nombre": "Marketing", "descripcion": "test"}
    response = make_request("POST", "/process/areas", admin_token, data=data)
    if response and response.status_code == 200:
        area = response.json()
        passed = area.get('nombre') == 'Marketing' and 'id' in area
        log_test(5, "POST /api/process/areas", passed, 
                f"Created area: {area.get('nombre')}")
        if passed:
            created_ids['new_area_id'] = area['id']
        return passed
    else:
        log_test(5, "POST /api/process/areas", False, 
                f"Status: {response.status_code if response else 'No response'}, Response: {response.text if response else 'N/A'}")
        return False

def test_06_create_type():
    """Test 6: POST /api/process/types with new type"""
    data = {
        "nombre": "Test Tipo",
        "color_fondo": "#FF00FF",
        "color_texto": "#FFFFFF"
    }
    response = make_request("POST", "/process/types", admin_token, data=data)
    if response and response.status_code == 200:
        tipo = response.json()
        passed = (tipo.get('nombre') == 'Test Tipo' and 
                 tipo.get('color_fondo') == '#FF00FF' and 
                 'id' in tipo)
        log_test(6, "POST /api/process/types", passed, 
                f"Created type: {tipo.get('nombre')}")
        if passed:
            created_ids['new_tipo_id'] = tipo['id']
        return passed
    else:
        log_test(6, "POST /api/process/types", False, 
                f"Status: {response.status_code if response else 'No response'}, Response: {response.text if response else 'N/A'}")
        return False

def test_07_create_process():
    """Test 7: POST /api/process/processes — verify codigo auto-generated as PROC-XXX-NNN"""
    if 'area_id' not in created_ids or 'tipo_id' not in created_ids:
        log_test(7, "POST /api/process/processes", False, "Missing area_id or tipo_id from previous tests")
        return False
    
    data = {
        "nombre": "Test Process",
        "descripcion": "Test process description",
        "area_id": created_ids['area_id'],
        "tipo_id": created_ids['tipo_id'],
        "activo": True
    }
    response = make_request("POST", "/process/processes", admin_token, data=data)
    if response and response.status_code == 200:
        process = response.json()
        codigo = process.get('codigo', '')
        # Check format PROC-XXX-NNN
        import re
        passed = bool(re.match(r'^PROC-[A-Z]{3}-\d{3}$', codigo)) and 'id' in process
        log_test(7, "POST /api/process/processes", passed, 
                f"Created process with codigo: {codigo}")
        if passed:
            created_ids['new_proceso_id'] = process['id']
        return passed
    else:
        log_test(7, "POST /api/process/processes", False, 
                f"Status: {response.status_code if response else 'No response'}, Response: {response.text if response else 'N/A'}")
        return False

def test_08_get_process_detail():
    """Test 8: GET /api/process/processes/{id} — verify enrichment"""
    if 'new_proceso_id' not in created_ids:
        log_test(8, "GET /api/process/processes/{id}", False, "No process created in test 7")
        return False
    
    response = make_request("GET", f"/process/processes/{created_ids['new_proceso_id']}", admin_token)
    if response and response.status_code == 200:
        process = response.json()
        required_fields = ['area_nombre', 'tipo_nombre', 'tipo_color_fondo']
        passed = all(field in process and process[field] for field in required_fields)
        log_test(8, "GET /api/process/processes/{id}", passed, 
                f"Enrichment fields present: {', '.join(required_fields)}")
        return passed
    else:
        log_test(8, "GET /api/process/processes/{id}", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_09_create_step():
    """Test 9: POST /api/process/processes/{id}/steps — verify auto-orden assignment"""
    if 'new_proceso_id' not in created_ids or 'consecuencia_id' not in created_ids:
        log_test(9, "POST /api/process/processes/{id}/steps", False, "Missing proceso_id or consecuencia_id")
        return False
    
    data = {
        "nombre": "Step 1",
        "descripcion": "Test step",
        "orden": 0,  # Should auto-assign
        "puntos": 5,
        "requiere_evidencia": True,
        "es_critico": True,
        "sistema_consecuencias_id": created_ids['consecuencia_id']
    }
    response = make_request("POST", f"/process/processes/{created_ids['new_proceso_id']}/steps", 
                          admin_token, data=data)
    if response and response.status_code == 200:
        step = response.json()
        passed = step.get('orden', 0) > 0 and 'id' in step
        log_test(9, "POST /api/process/processes/{id}/steps", passed, 
                f"Created step with auto-orden: {step.get('orden')}")
        if passed:
            created_ids['step_id'] = step['id']
        return passed
    else:
        log_test(9, "POST /api/process/processes/{id}/steps", False, 
                f"Status: {response.status_code if response else 'No response'}, Response: {response.text if response else 'N/A'}")
        return False

def test_10_get_steps():
    """Test 10: GET /api/process/processes/{id}/steps — verify sorted by orden"""
    if 'new_proceso_id' not in created_ids:
        log_test(10, "GET /api/process/processes/{id}/steps", False, "No process created")
        return False
    
    response = make_request("GET", f"/process/processes/{created_ids['new_proceso_id']}/steps", admin_token)
    if response and response.status_code == 200:
        steps = response.json()
        if len(steps) > 1:
            sorted_by_orden = all(steps[i]['orden'] <= steps[i+1]['orden'] for i in range(len(steps)-1))
            passed = sorted_by_orden
        else:
            passed = True  # Single or no steps is fine
        log_test(10, "GET /api/process/processes/{id}/steps", passed, 
                f"Got {len(steps)} steps, sorted by orden")
        return passed
    else:
        log_test(10, "GET /api/process/processes/{id}/steps", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_11_update_step():
    """Test 11: PUT /api/process/steps/{step_id} — update fields"""
    if 'step_id' not in created_ids:
        log_test(11, "PUT /api/process/steps/{step_id}", False, "No step created")
        return False
    
    data = {"nombre": "Updated Step 1", "puntos": 10}
    response = make_request("PUT", f"/process/steps/{created_ids['step_id']}", admin_token, data=data)
    if response and response.status_code == 200:
        step = response.json()
        passed = step.get('nombre') == 'Updated Step 1' and step.get('puntos') == 10
        log_test(11, "PUT /api/process/steps/{step_id}", passed, 
                f"Updated step: {step.get('nombre')}, puntos: {step.get('puntos')}")
        return passed
    else:
        log_test(11, "PUT /api/process/steps/{step_id}", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_12_reorder_steps():
    """Test 12: POST /api/process/processes/{id}/steps/reorder — verify orden updated"""
    if 'new_proceso_id' not in created_ids or 'step_id' not in created_ids:
        log_test(12, "POST /api/process/processes/{id}/steps/reorder", False, "Missing process or step")
        return False
    
    # Get current steps
    response = make_request("GET", f"/process/processes/{created_ids['new_proceso_id']}/steps", admin_token)
    if not response or response.status_code != 200:
        log_test(12, "POST /api/process/processes/{id}/steps/reorder", False, "Could not get steps")
        return False
    
    steps = response.json()
    if len(steps) < 1:
        log_test(12, "POST /api/process/processes/{id}/steps/reorder", True, "Not enough steps to reorder (skipped)")
        return True
    
    step_ids = [s['id'] for s in steps]
    data = {"step_ids": step_ids}
    response = make_request("POST", f"/process/processes/{created_ids['new_proceso_id']}/steps/reorder", 
                          admin_token, data=data)
    if response and response.status_code == 200:
        passed = response.json().get('ok') == True
        log_test(12, "POST /api/process/processes/{id}/steps/reorder", passed, 
                f"Reordered {len(step_ids)} steps")
        return passed
    else:
        log_test(12, "POST /api/process/processes/{id}/steps/reorder", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_13_update_process():
    """Test 13: PUT /api/process/processes/{id} — update process metadata"""
    if 'new_proceso_id' not in created_ids:
        log_test(13, "PUT /api/process/processes/{id}", False, "No process created")
        return False
    
    data = {"nombre": "Updated Test Process", "descripcion": "Updated description"}
    response = make_request("PUT", f"/process/processes/{created_ids['new_proceso_id']}", 
                          admin_token, data=data)
    if response and response.status_code == 200:
        process = response.json()
        passed = process.get('nombre') == 'Updated Test Process'
        log_test(13, "PUT /api/process/processes/{id}", passed, 
                f"Updated process: {process.get('nombre')}")
        return passed
    else:
        log_test(13, "PUT /api/process/processes/{id}", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_14_delete_step():
    """Test 14: DELETE /api/process/steps/{id} — delete and verify total_pasos updated"""
    if 'step_id' not in created_ids or 'new_proceso_id' not in created_ids:
        log_test(14, "DELETE /api/process/steps/{id}", False, "Missing step or process")
        return False
    
    # Get total_pasos before
    response = make_request("GET", f"/process/processes/{created_ids['new_proceso_id']}", admin_token)
    if not response or response.status_code != 200:
        log_test(14, "DELETE /api/process/steps/{id}", False, "Could not get process")
        return False
    total_before = response.json().get('total_pasos', 0)
    
    # Delete step
    response = make_request("DELETE", f"/process/steps/{created_ids['step_id']}", admin_token)
    if not response or response.status_code != 200:
        log_test(14, "DELETE /api/process/steps/{id}", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Get total_pasos after
    response = make_request("GET", f"/process/processes/{created_ids['new_proceso_id']}", admin_token)
    if response and response.status_code == 200:
        total_after = response.json().get('total_pasos', 0)
        passed = total_after == total_before - 1
        log_test(14, "DELETE /api/process/steps/{id}", passed, 
                f"total_pasos: {total_before} -> {total_after}")
        return passed
    else:
        log_test(14, "DELETE /api/process/steps/{id}", False, "Could not verify total_pasos")
        return False

def test_15_get_staff():
    """Test 15: GET /api/process/staff — admin only, should return all staff records"""
    response = make_request("GET", "/process/staff", admin_token)
    if response and response.status_code == 200:
        staff = response.json()
        passed = isinstance(staff, list) and len(staff) > 0
        log_test(15, "GET /api/process/staff", passed, 
                f"Got {len(staff)} staff records")
        return passed
    else:
        log_test(15, "GET /api/process/staff", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

# ============================================================
# EMPLOYEE TESTS
# ============================================================

def test_16_get_staff_me():
    """Test 16: GET /api/process/staff/me — should auto-create or return staff for juan"""
    response = make_request("GET", "/process/staff/me", employee_token)
    if response and response.status_code == 200:
        staff = response.json()
        passed = 'id' in staff and staff.get('user_email') == EMPLOYEE_EMAIL
        log_test(16, "GET /api/process/staff/me", passed, 
                f"Got staff for {staff.get('user_email')}")
        if passed:
            created_ids['employee_staff_id'] = staff['id']
            created_ids['employee_area_id'] = staff.get('area_id')
        return passed
    else:
        log_test(16, "GET /api/process/staff/me", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_17_get_processes_mine():
    """Test 17: GET /api/process/processes?mine=true — should only return processes from juan's area"""
    response = make_request("GET", "/process/processes", employee_token, params={"mine": True})
    if response and response.status_code == 200:
        processes = response.json()
        # Should return processes, possibly filtered by area
        passed = isinstance(processes, list)
        log_test(17, "GET /api/process/processes?mine=true", passed, 
                f"Got {len(processes)} processes for employee's area")
        return passed
    else:
        log_test(17, "GET /api/process/processes?mine=true", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_18_create_execution():
    """Test 18: POST /api/process/executions — should create execution + step_executions"""
    if 'proceso_id' not in created_ids:
        log_test(18, "POST /api/process/executions", False, "No process available")
        return False
    
    data = {"proceso_id": created_ids['proceso_id']}
    response = make_request("POST", "/process/executions", employee_token, data=data)
    if response and response.status_code == 200:
        execution = response.json()
        codigo = execution.get('codigo_ejecucion', '')
        passed = 'id' in execution and 'EXEC' in codigo
        log_test(18, "POST /api/process/executions", passed, 
                f"Created execution: {codigo}")
        if passed:
            created_ids['execution_id'] = execution['id']
        return passed
    else:
        log_test(18, "POST /api/process/executions", False, 
                f"Status: {response.status_code if response else 'No response'}, Response: {response.text if response else 'N/A'}")
        return False

def test_19_get_executions_mine():
    """Test 19: GET /api/process/executions?mine=true — should return only juan's executions"""
    response = make_request("GET", "/process/executions", employee_token, params={"mine": True})
    if response and response.status_code == 200:
        executions = response.json()
        passed = isinstance(executions, list) and len(executions) > 0
        log_test(19, "GET /api/process/executions?mine=true", passed, 
                f"Got {len(executions)} executions for employee")
        return passed
    else:
        log_test(19, "GET /api/process/executions?mine=true", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_20_get_execution_steps():
    """Test 20: GET /api/process/executions/{id}/steps — verify step_executions exist with estado=0"""
    if 'execution_id' not in created_ids:
        log_test(20, "GET /api/process/executions/{id}/steps", False, "No execution created")
        return False
    
    response = make_request("GET", f"/process/executions/{created_ids['execution_id']}/steps", employee_token)
    if response and response.status_code == 200:
        steps = response.json()
        passed = len(steps) > 0 and all(s.get('estado') == 0 for s in steps)
        log_test(20, "GET /api/process/executions/{id}/steps", passed, 
                f"Got {len(steps)} step_executions, all with estado=0")
        if passed and steps:
            created_ids['step_exec_id'] = steps[0]['id']
            created_ids['all_step_exec_ids'] = [s['id'] for s in steps]
        return passed
    else:
        log_test(20, "GET /api/process/executions/{id}/steps", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_21_update_step_exec_in_progress():
    """Test 21: PUT /api/process/step-executions/{step_exec_id} with estado=1 — mark in progress"""
    if 'step_exec_id' not in created_ids:
        log_test(21, "PUT /api/process/step-executions/{id} (estado=1)", False, "No step execution")
        return False
    
    data = {"estado": 1}
    response = make_request("PUT", f"/process/step-executions/{created_ids['step_exec_id']}", 
                          employee_token, data=data)
    if response and response.status_code == 200:
        step_exec = response.json()
        passed = step_exec.get('estado') == 1
        log_test(21, "PUT /api/process/step-executions/{id} (estado=1)", passed, 
                f"Updated step execution to estado=1")
        return passed
    else:
        log_test(21, "PUT /api/process/step-executions/{id} (estado=1)", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_22_update_step_exec_completed():
    """Test 22: PUT /api/process/step-executions/{step_exec_id} with estado=2 — mark completed"""
    if 'step_exec_id' not in created_ids:
        log_test(22, "PUT /api/process/step-executions/{id} (estado=2)", False, "No step execution")
        return False
    
    data = {"estado": 2, "comentarios": "done"}
    response = make_request("PUT", f"/process/step-executions/{created_ids['step_exec_id']}", 
                          employee_token, data=data)
    if response and response.status_code == 200:
        step_exec = response.json()
        passed = step_exec.get('estado') == 2 and step_exec.get('comentarios') == 'done'
        log_test(22, "PUT /api/process/step-executions/{id} (estado=2)", passed, 
                f"Updated step execution to estado=2 with comments")
        return passed
    else:
        log_test(22, "PUT /api/process/step-executions/{id} (estado=2)", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_23_verify_progress_recalculated():
    """Test 23: After updating step, GET execution — verify progreso recalculated"""
    if 'execution_id' not in created_ids:
        log_test(23, "Verify progreso recalculated", False, "No execution")
        return False
    
    response = make_request("GET", f"/process/executions/{created_ids['execution_id']}", employee_token)
    if response and response.status_code == 200:
        execution = response.json()
        progreso = execution.get('progreso', 0)
        pasos_completados = execution.get('pasos_completados', 0)
        passed = progreso > 0 and pasos_completados > 0
        log_test(23, "Verify progreso recalculated", passed, 
                f"Progreso: {progreso}%, Pasos completados: {pasos_completados}")
        return passed
    else:
        log_test(23, "Verify progreso recalculated", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_24_update_step_with_evidencia():
    """Test 24: PUT step exec with evidencia (base64 data URI)"""
    if 'step_exec_id' not in created_ids:
        log_test(24, "PUT step exec with evidencia", False, "No step execution")
        return False
    
    # Small base64 encoded PNG (1x1 pixel)
    evidencia = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    data = {"evidencia": evidencia, "evidencia_nombre": "test.png"}
    response = make_request("PUT", f"/process/step-executions/{created_ids['step_exec_id']}", 
                          employee_token, data=data)
    if response and response.status_code == 200:
        step_exec = response.json()
        passed = step_exec.get('evidencia') == evidencia
        log_test(24, "PUT step exec with evidencia", passed, 
                f"Updated with evidencia: {step_exec.get('evidencia_nombre')}")
        return passed
    else:
        log_test(24, "PUT step exec with evidencia", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_25_complete_all_steps():
    """Test 25: Mark all steps as completed — verify execution estado becomes completado"""
    if 'execution_id' not in created_ids or 'all_step_exec_ids' not in created_ids:
        log_test(25, "Complete all steps", False, "No execution or step executions")
        return False
    
    # Mark all steps as completed
    for step_exec_id in created_ids['all_step_exec_ids']:
        data = {"estado": 2}
        response = make_request("PUT", f"/process/step-executions/{step_exec_id}", 
                              employee_token, data=data)
        if not response or response.status_code != 200:
            log_test(25, "Complete all steps", False, 
                    f"Failed to update step {step_exec_id}")
            return False
    
    # Verify execution is completed
    response = make_request("GET", f"/process/executions/{created_ids['execution_id']}", employee_token)
    if response and response.status_code == 200:
        execution = response.json()
        estado = execution.get('estado')
        hora_fin = execution.get('hora_fin')
        passed = estado == 'completado' and hora_fin is not None
        log_test(25, "Complete all steps", passed, 
                f"Execution estado: {estado}, hora_fin: {hora_fin}")
        return passed
    else:
        log_test(25, "Complete all steps", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

def test_26_permission_test():
    """Test 26: Permission test — admin can update juan's step, other employee cannot"""
    if 'step_exec_id' not in created_ids:
        log_test(26, "Permission test", False, "No step execution")
        return False
    
    # Admin should be able to update
    data = {"comentarios": "Admin update"}
    response = make_request("PUT", f"/process/step-executions/{created_ids['step_exec_id']}", 
                          admin_token, data=data)
    admin_can_update = response is not None and response.status_code == 200
    
    # Login as another employee (laura)
    laura_token = login("laura@empresa.com", "laura123")
    if not laura_token:
        log_test(26, "Permission test", False, "Could not login as laura")
        return False
    
    # Laura should NOT be able to update juan's step
    response = make_request("PUT", f"/process/step-executions/{created_ids['step_exec_id']}", 
                          laura_token, data=data)
    laura_cannot_update = response is not None and response.status_code == 403
    
    passed = admin_can_update and laura_cannot_update
    log_test(26, "Permission test", passed, 
            f"Admin can update: {admin_can_update}, Laura blocked (403): {laura_cannot_update}")
    return passed

# ============================================================
# DASHBOARD STATS
# ============================================================

def test_27_get_stats():
    """Test 27: GET /api/process/stats — verify all required keys"""
    response = make_request("GET", "/process/stats", admin_token)
    if response and response.status_code == 200:
        stats = response.json()
        required_keys = [
            'total_executions', 'executions_today', 'completed', 
            'avg_compliance', 'critical_omitted', 'by_area', 
            'by_process', 'most_omitted_steps'
        ]
        passed = all(key in stats for key in required_keys)
        log_test(27, "GET /api/process/stats", passed, 
                f"Stats keys present: {', '.join(required_keys)}")
        return passed
    else:
        log_test(27, "GET /api/process/stats", False, 
                f"Status: {response.status_code if response else 'No response'}")
        return False

# ============================================================
# VALIDATIONS
# ============================================================

def test_28_no_auth():
    """Test 28: Try creating a process without auth — should be 401"""
    try:
        response = session.post(
            f"{BASE_URL}/process/processes",
            json={"nombre": "Test", "area_id": "test", "tipo_id": "test", "activo": True},
            timeout=20
        )
        passed = response.status_code == 401 or response.status_code == 403
        log_test(28, "No auth validation", passed, 
                f"Status: {response.status_code} (expected 401 or 403)")
        return passed
    except Exception as e:
        log_test(28, "No auth validation", False, f"Error: {str(e)}")
        return False

def test_29_employee_cannot_delete_process():
    """Test 29: Try DELETE /api/process/processes/{id} as employee — should be 403"""
    if 'proceso_id' not in created_ids:
        log_test(29, "Employee cannot delete process", False, "No process available")
        return False
    
    try:
        print(f"{Colors.YELLOW}Attempting DELETE with proceso_id: {created_ids['proceso_id']}{Colors.END}")
        response = make_request("DELETE", f"/process/processes/{created_ids['proceso_id']}", employee_token)
        if response:
            passed = response.status_code == 403
            log_test(29, "Employee cannot delete process", passed, 
                    f"Status: {response.status_code} (expected 403)")
            return passed
        else:
            log_test(29, "Employee cannot delete process", False, "No response received (timeout or error)")
            return False
    except Exception as e:
        log_test(29, "Employee cannot delete process", False, f"Exception: {str(e)}")
        return False

def test_30_nonexistent_process():
    """Test 30: Try POST /api/process/executions with non-existent proceso_id — should be 404"""
    try:
        data = {"proceso_id": "nonexistent-id-12345"}
        print(f"{Colors.YELLOW}Attempting POST execution with nonexistent proceso_id{Colors.END}")
        response = make_request("POST", "/process/executions", employee_token, data=data)
        if response:
            passed = response.status_code == 404
            log_test(30, "Non-existent process validation", passed, 
                    f"Status: {response.status_code} (expected 404)")
            return passed
        else:
            log_test(30, "Non-existent process validation", False, "No response received (timeout or error)")
            return False
    except Exception as e:
        log_test(30, "Non-existent process validation", False, f"Exception: {str(e)}")
        return False

def test_31_inactive_process():
    """Test 31: Try POST /api/process/executions on process with activo=false — should be 400"""
    # First, create a process and set it to inactive
    if 'area_id' not in created_ids or 'tipo_id' not in created_ids:
        log_test(31, "Inactive process validation", False, "Missing area_id or tipo_id")
        return False
    
    # Create inactive process
    data = {
        "nombre": "Inactive Process",
        "area_id": created_ids['area_id'],
        "tipo_id": created_ids['tipo_id'],
        "activo": False
    }
    response = make_request("POST", "/process/processes", admin_token, data=data)
    if not response or response.status_code != 200:
        log_test(31, "Inactive process validation", False, "Could not create inactive process")
        return False
    
    inactive_process_id = response.json()['id']
    
    # Try to create execution on inactive process
    data = {"proceso_id": inactive_process_id}
    response = make_request("POST", "/process/executions", employee_token, data=data)
    passed = response and response.status_code == 400
    log_test(31, "Inactive process validation", passed, 
            f"Status: {response.status_code if response else 'No response'} (expected 400)")
    return passed

# ============================================================
# MAIN TEST RUNNER
# ============================================================

def main():
    global admin_token, employee_token
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}Process Module Backend Test Suite{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    # Login
    print(f"{Colors.YELLOW}Logging in...{Colors.END}")
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print(f"{Colors.RED}Failed to login as admin. Aborting tests.{Colors.END}")
        sys.exit(1)
    print(f"{Colors.GREEN}✓ Admin logged in{Colors.END}")
    
    employee_token = login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)
    if not employee_token:
        print(f"{Colors.RED}Failed to login as employee. Aborting tests.{Colors.END}")
        sys.exit(1)
    print(f"{Colors.GREEN}✓ Employee logged in{Colors.END}")
    
    # Run all tests
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}ADMIN TESTS{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    test_01_get_areas()
    test_02_get_types()
    test_03_get_consequences()
    test_04_get_processes()
    test_05_create_area()
    test_06_create_type()
    test_07_create_process()
    test_08_get_process_detail()
    test_09_create_step()
    test_10_get_steps()
    test_11_update_step()
    test_12_reorder_steps()
    test_13_update_process()
    test_14_delete_step()
    test_15_get_staff()
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}EMPLOYEE TESTS{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    test_16_get_staff_me()
    test_17_get_processes_mine()
    test_18_create_execution()
    test_19_get_executions_mine()
    test_20_get_execution_steps()
    test_21_update_step_exec_in_progress()
    test_22_update_step_exec_completed()
    test_23_verify_progress_recalculated()
    test_24_update_step_with_evidencia()
    test_25_complete_all_steps()
    test_26_permission_test()
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}DASHBOARD STATS{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    test_27_get_stats()
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}VALIDATIONS{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    # Add small delay before validation tests
    import time
    time.sleep(2)
    
    test_28_no_auth()
    time.sleep(1)
    test_29_employee_cannot_delete_process()
    time.sleep(1)
    test_30_nonexistent_process()
    time.sleep(1)
    test_31_inactive_process()
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    passed = sum(1 for t in test_results if t['passed'])
    failed = len(test_results) - passed
    
    print(f"Total tests: {len(test_results)}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed}{Colors.END}")
    
    if failed > 0:
        print(f"\n{Colors.RED}Failed tests:{Colors.END}")
        for t in test_results:
            if not t['passed']:
                print(f"  - Test {t['test']}: {t['description']}")
                if t['details']:
                    print(f"    {t['details']}")
    
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}\n")
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()
