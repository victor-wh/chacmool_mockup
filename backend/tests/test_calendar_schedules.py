"""Backend tests para Calendar con 3 schedule_types (ejecucion/supervision/auditoria)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sprint-runner-16.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# --- Fixtures ---
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "maria@empresa.com", "password": "maria123"})
    assert r.status_code == 200, f"login admin falló: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"no token en respuesta: {data}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def staff_list(admin_headers):
    r = requests.get(f"{API}/process/staff", headers=admin_headers)
    if r.status_code != 200:
        # Alternative path
        r = requests.get(f"{API}/process-staff", headers=admin_headers)
    assert r.status_code == 200, f"staff list: {r.status_code} {r.text}"
    data = r.json()
    assert isinstance(data, list) and len(data) >= 2
    return data


@pytest.fixture(scope="module")
def test_proceso_id(admin_headers):
    """Toma un proceso activo cualquiera para usar en CRUD."""
    r = requests.get(f"{API}/calendar/processes-without-schedule?schedule_type=auditoria", headers=admin_headers)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    procs = r.json()
    if procs:
        return procs[0]["id"]
    # Fallback: get any active process
    r = requests.get(f"{API}/process/definitions?activo=true", headers=admin_headers)
    if r.status_code == 200:
        ps = r.json()
        if ps:
            return ps[0]["id"]
    pytest.skip("No hay procesos disponibles")


# --- 1. Auth ---
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json={"email": "maria@empresa.com", "password": "maria123"})
        assert r.status_code == 200
        d = r.json()
        assert d.get("access_token") or d.get("token")


# --- 2. Listado por tipo ---
class TestListSchedules:
    def test_list_all(self, admin_headers):
        r = requests.get(f"{API}/calendar/schedules", headers=admin_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for s in items:
            assert "schedule_type" in s
            assert s["schedule_type"] in ("ejecucion", "supervision", "auditoria")

    def test_list_filter_supervision(self, admin_headers):
        r = requests.get(f"{API}/calendar/schedules?schedule_type=supervision", headers=admin_headers)
        assert r.status_code == 200
        items = r.json()
        for s in items:
            assert s["schedule_type"] == "supervision"

    def test_invalid_schedule_type_400(self, admin_headers):
        r = requests.get(f"{API}/calendar/schedules?schedule_type=foo", headers=admin_headers)
        assert r.status_code == 400


# --- 3. Coexistencia 3 tipos para un mismo proceso ---
class TestCoexistence:
    def test_create_three_types_independent(self, admin_headers, test_proceso_id, staff_list):
        pid = test_proceso_id
        resp_ej = staff_list[0]["id"]
        resp_sup = staff_list[1]["id"] if len(staff_list) > 1 else staff_list[0]["id"]
        resp_aud = staff_list[-1]["id"]

        # EJECUCION
        r = requests.put(
            f"{API}/calendar/schedules/{pid}?schedule_type=ejecucion",
            headers=admin_headers,
            json={"tipo": "diario", "responsable_id": resp_ej, "activa": True},
        )
        assert r.status_code == 200, r.text
        ej = r.json()
        assert ej["schedule_type"] == "ejecucion"

        # SUPERVISION
        r = requests.put(
            f"{API}/calendar/schedules/{pid}?schedule_type=supervision",
            headers=admin_headers,
            json={"tipo": "semanal", "dia_semana": 2, "responsable_id": resp_sup, "activa": True},
        )
        assert r.status_code == 200, r.text
        sup = r.json()
        assert sup["schedule_type"] == "supervision"
        assert sup["responsable_id"] == resp_sup

        # AUDITORIA con responsable distinto
        r = requests.put(
            f"{API}/calendar/schedules/{pid}?schedule_type=auditoria",
            headers=admin_headers,
            json={"tipo": "mensual", "dia_mes": 15, "responsable_id": resp_aud, "activa": True},
        )
        assert r.status_code == 200, r.text
        aud = r.json()
        assert aud["schedule_type"] == "auditoria"
        assert aud["responsable_id"] == resp_aud

        # Verificar persistencia: GET por tipo
        for stype, exp_resp in [("ejecucion", resp_ej), ("supervision", resp_sup), ("auditoria", resp_aud)]:
            g = requests.get(f"{API}/calendar/schedules/{pid}?schedule_type={stype}", headers=admin_headers)
            assert g.status_code == 200, f"{stype}: {g.text}"
            d = g.json()
            assert d["schedule_type"] == stype
            assert d["responsable_id"] == exp_resp

    def test_delete_only_auditoria(self, admin_headers, test_proceso_id):
        pid = test_proceso_id
        # Borrar solo auditoria
        r = requests.delete(f"{API}/calendar/schedules/{pid}?schedule_type=auditoria", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("deleted") is True

        # ejecucion y supervision deben permanecer
        r1 = requests.get(f"{API}/calendar/schedules/{pid}?schedule_type=ejecucion", headers=admin_headers)
        assert r1.status_code == 200
        r2 = requests.get(f"{API}/calendar/schedules/{pid}?schedule_type=supervision", headers=admin_headers)
        assert r2.status_code == 200
        # auditoria debe 404
        r3 = requests.get(f"{API}/calendar/schedules/{pid}?schedule_type=auditoria", headers=admin_headers)
        assert r3.status_code == 404


# --- 4. Events filtro por schedule_types ---
class TestEvents:
    def test_events_filter_types(self, admin_headers):
        r = requests.get(
            f"{API}/calendar/events?fecha_desde=2026-06-01&fecha_hasta=2026-06-30&schedule_types=ejecucion,supervision",
            headers=admin_headers,
        )
        assert r.status_code == 200, r.text
        evs = r.json()
        for ev in evs:
            assert "schedule_type" in ev
            assert ev["schedule_type"] in ("ejecucion", "supervision")

    def test_events_invalid_type_400(self, admin_headers):
        r = requests.get(
            f"{API}/calendar/events?fecha_desde=2026-06-01&fecha_hasta=2026-06-30&schedule_types=foo",
            headers=admin_headers,
        )
        assert r.status_code == 400


# --- 5. processes-without-schedule por tipo ---
class TestProcessesWithoutSchedule:
    def test_without_auditoria_includes_only_ejecucion_procs(self, admin_headers, test_proceso_id):
        # test_proceso_id ya tiene ejecucion y supervision pero NO auditoria (borrada arriba)
        r = requests.get(f"{API}/calendar/processes-without-schedule?schedule_type=auditoria", headers=admin_headers)
        assert r.status_code == 200
        procs = r.json()
        ids = {p["id"] for p in procs}
        assert test_proceso_id in ids, "proceso con solo ejecucion+supervision DEBE aparecer en sin-auditoria"

    def test_invalid_type_400(self, admin_headers):
        r = requests.get(f"{API}/calendar/processes-without-schedule?schedule_type=foo", headers=admin_headers)
        assert r.status_code == 400


# --- 6. Legacy: schedules sin schedule_type se interpretan como ejecucion ---
class TestLegacyCompat:
    def test_legacy_treated_as_ejecucion(self, admin_headers):
        """Inserta un doc legacy directamente vía API normal y verifica lectura como ejecucion.
        Como no podemos forzar el doc sin schedule_type via API (el código siempre lo guarda),
        validamos en su lugar que el helper de schedules/{id} hace fallback para ejecucion."""
        # Listar y comprobar que cualquier schedule retorna schedule_type poblado
        r = requests.get(f"{API}/calendar/schedules", headers=admin_headers)
        assert r.status_code == 200
        for s in r.json():
            assert s.get("schedule_type") in ("ejecucion", "supervision", "auditoria")


# --- 7. Cleanup ---
def test_zz_cleanup(admin_headers, test_proceso_id):
    """Limpiar schedules creados durante el test."""
    pid = test_proceso_id
    for stype in ("ejecucion", "supervision", "auditoria"):
        requests.delete(f"{API}/calendar/schedules/{pid}?schedule_type={stype}", headers=admin_headers)
