"""
Seed específico del módulo Process.
Crea Areas, Tipos, Sistemas de Consecuencias, Procesos con Pasos,
y vincula Staff a usuarios existentes.
"""
import asyncio
import os
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "evalpro_db")


async def seed_process():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    now = datetime.now()

    print("🌱 Seeding PROCESS module...")

    # Limpieza
    await db.process_areas.delete_many({})
    await db.process_staff.delete_many({})
    await db.process_types.delete_many({})
    await db.process_consequences.delete_many({})
    await db.process_definitions.delete_many({})
    await db.process_steps.delete_many({})
    await db.process_executions.delete_many({})
    await db.process_step_executions.delete_many({})

    # Areas
    areas = [
        {"id": str(uuid4()), "nombre": "Tecnología", "descripcion": "Equipo de desarrollo y operaciones técnicas", "created_at": now},
        {"id": str(uuid4()), "nombre": "Operaciones", "descripcion": "Procesos operativos del negocio", "created_at": now},
        {"id": str(uuid4()), "nombre": "Ventas", "descripcion": "Equipo comercial", "created_at": now},
        {"id": str(uuid4()), "nombre": "Soporte", "descripcion": "Atención al cliente", "created_at": now},
        {"id": str(uuid4()), "nombre": "RRHH", "descripcion": "Recursos humanos", "created_at": now},
    ]
    await db.process_areas.insert_many(areas)
    area_by_name = {a["nombre"]: a for a in areas}
    print(f"✅ {len(areas)} areas")

    # Process Types
    types_ = [
        {"id": str(uuid4()), "nombre": "Operativo", "color_fondo": "#3B82F6", "color_texto": "#FFFFFF", "created_at": now},
        {"id": str(uuid4()), "nombre": "Crítico", "color_fondo": "#DC2626", "color_texto": "#FFFFFF", "created_at": now},
        {"id": str(uuid4()), "nombre": "Documentación", "color_fondo": "#10B981", "color_texto": "#FFFFFF", "created_at": now},
        {"id": str(uuid4()), "nombre": "Auditoría", "color_fondo": "#F59E0B", "color_texto": "#FFFFFF", "created_at": now},
        {"id": str(uuid4()), "nombre": "Onboarding", "color_fondo": "#8B5CF6", "color_texto": "#FFFFFF", "created_at": now},
    ]
    await db.process_types.insert_many(types_)
    type_by_name = {t["nombre"]: t for t in types_}
    print(f"✅ {len(types_)} process types")

    # Sistemas de Consecuencias
    consequences = [
        {
            "id": str(uuid4()),
            "nombre": "Estándar 4 niveles",
            "omision_nivel_1": "Llamada de atención verbal por parte del supervisor.",
            "omision_nivel_2": "Llamada de atención por escrito y registro en su expediente.",
            "omision_nivel_3": "Suspensión de 1 a 3 días sin goce de sueldo.",
            "omision_nivel_4": "Terminación de la relación laboral por causa justificada.",
            "created_at": now,
        },
        {
            "id": str(uuid4()),
            "nombre": "Pasos Críticos Tecnología",
            "omision_nivel_1": "Revisión inmediata con el Tech Lead y reproceso.",
            "omision_nivel_2": "Pair-programming obligatorio durante 1 semana.",
            "omision_nivel_3": "Suspensión de permisos de despliegue por 2 semanas.",
            "omision_nivel_4": "Reasignación a otra área o desvinculación.",
            "created_at": now,
        },
    ]
    await db.process_consequences.insert_many(consequences)
    cons_default = consequences[0]
    cons_tech = consequences[1]
    print(f"✅ {len(consequences)} consequence systems")

    # Staff: vincular a TODOS los users existentes
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    staff_docs = []
    department_to_area = {
        "Tecnología": area_by_name["Tecnología"],
        "Desarrollo": area_by_name["Tecnología"],
        "Operaciones": area_by_name["Operaciones"],
        "Ventas": area_by_name["Ventas"],
        "Producto": area_by_name["Tecnología"],
        "Administración": area_by_name["RRHH"],
    }
    for u in users:
        area = department_to_area.get(u.get("department", ""), area_by_name["Tecnología"])
        staff_docs.append({
            "id": str(uuid4()),
            "user_id": u["id"],
            "user_name": u.get("name", ""),
            "user_email": u.get("email", ""),
            "area_id": area["id"],
            "area_nombre": area["nombre"],
            "permisos_temporales": False,
            "acceso_servidor": u.get("role") in ("admin", "manager"),
            "created_at": now,
        })
    if staff_docs:
        await db.process_staff.insert_many(staff_docs)
    print(f"✅ {len(staff_docs)} staff records")

    # Procesos + Pasos
    processes_data = [
        {
            "nombre": "Proceso para bajar cambios",
            "descripcion": "Checklist obligatorio antes de hacer un Pull Request a la rama principal.",
            "url_referencia": "https://wiki.empresa.com/dev/pull-requests",
            "area": "Tecnología",
            "tipo": "Crítico",
            "prefix": "DES",
            "pasos": [
                {"nombre": "Buscar issues relacionados", "descripcion": "Definir programador a cargo. Entregable: Issue en GitHub con evidencia.", "puntos": 5, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_tech["id"]},
                {"nombre": "Revisión PRs (Calidad)", "descripcion": "Validar que el código cumple lineamientos.", "puntos": 5, "requiere_evidencia": False, "es_critico": True, "consecuencias": cons_tech["id"]},
                {"nombre": "Buscar issues relacionados (validación)", "descripcion": "Confirmar que no hay duplicados.", "puntos": 3, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
                {"nombre": "Planear Sprint Semanal", "descripcion": "Asignar el cambio al sprint adecuado.", "puntos": 3, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
                {"nombre": "Revisar Ramas actuales", "descripcion": "Validar conflictos potenciales con otras ramas.", "puntos": 4, "requiere_evidencia": True, "es_critico": False, "consecuencias": cons_tech["id"]},
                {"nombre": "Monitor y Restablecer", "descripcion": "Verificar despliegue en staging.", "puntos": 4, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_tech["id"]},
                {"nombre": "Reporte de incidentes", "descripcion": "Documentar cualquier incidente encontrado.", "puntos": 3, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
                {"nombre": "Proceso para Líderes", "descripcion": "Enviar resumen al tech lead.", "puntos": 2, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
                {"nombre": "Proceso para revisores", "descripcion": "Asignar revisores y notificarles.", "puntos": 2, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
                {"nombre": "Revisión PRs (Final)", "descripcion": "Aprobación final del PR antes del merge.", "puntos": 5, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_tech["id"]},
            ],
        },
        {
            "nombre": "Apertura de tienda",
            "descripcion": "Proceso de apertura diaria de sucursal.",
            "url_referencia": "https://wiki.empresa.com/ops/apertura",
            "area": "Operaciones",
            "tipo": "Operativo",
            "prefix": "OPS",
            "pasos": [
                {"nombre": "Verificar alarma desactivada", "descripcion": "Confirmar que el sistema de seguridad esté correctamente desactivado.", "puntos": 3, "requiere_evidencia": False, "es_critico": True, "consecuencias": cons_default["id"]},
                {"nombre": "Encender luces y aire", "descripcion": "Encender iluminación y aire acondicionado.", "puntos": 1, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
                {"nombre": "Conteo de fondo de caja", "descripcion": "Contar efectivo inicial. Foto del conteo.", "puntos": 5, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_default["id"]},
                {"nombre": "Limpieza visible del piso de venta", "descripcion": "Verificar limpieza y orden general.", "puntos": 2, "requiere_evidencia": True, "es_critico": False, "consecuencias": None},
                {"nombre": "Encender sistemas POS", "descripcion": "Verificar que TPVs respondan correctamente.", "puntos": 3, "requiere_evidencia": False, "es_critico": True, "consecuencias": cons_default["id"]},
            ],
        },
        {
            "nombre": "Onboarding Nuevo Empleado",
            "descripcion": "Checklist de RRHH para alta de un nuevo colaborador.",
            "url_referencia": "https://wiki.empresa.com/rrhh/onboarding",
            "area": "RRHH",
            "tipo": "Onboarding",
            "prefix": "ONB",
            "pasos": [
                {"nombre": "Recopilar documentación", "descripcion": "INE, comprobante, RFC. Subir foto.", "puntos": 5, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_default["id"]},
                {"nombre": "Firma de contrato", "descripcion": "Contrato laboral firmado.", "puntos": 5, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_default["id"]},
                {"nombre": "Asignar equipo de cómputo", "descripcion": "Laptop + accesorios.", "puntos": 3, "requiere_evidencia": True, "es_critico": False, "consecuencias": None},
                {"nombre": "Crear cuentas internas", "descripcion": "Email, Slack, herramientas internas.", "puntos": 3, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
                {"nombre": "Inducción al equipo", "descripcion": "Reunión de bienvenida con el equipo.", "puntos": 2, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
            ],
        },
        {
            "nombre": "Cierre de venta de alto valor",
            "descripcion": "Proceso obligatorio para cerrar oportunidades >$10k USD.",
            "url_referencia": "",
            "area": "Ventas",
            "tipo": "Crítico",
            "prefix": "VEN",
            "pasos": [
                {"nombre": "Validar BANT con cliente", "descripcion": "Budget, Authority, Need, Timing.", "puntos": 5, "requiere_evidencia": False, "es_critico": True, "consecuencias": cons_default["id"]},
                {"nombre": "Cotización formal", "descripcion": "Documento PDF firmado por el cliente.", "puntos": 5, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_default["id"]},
                {"nombre": "Aprobación de descuento", "descripcion": "Email del director comercial.", "puntos": 4, "requiere_evidencia": True, "es_critico": True, "consecuencias": cons_default["id"]},
                {"nombre": "Generación de orden de compra", "descripcion": "Subir OC firmada al CRM.", "puntos": 3, "requiere_evidencia": True, "es_critico": False, "consecuencias": None},
                {"nombre": "Notificar a operaciones", "descripcion": "Para iniciar el alta del cliente.", "puntos": 2, "requiere_evidencia": False, "es_critico": False, "consecuencias": None},
            ],
        },
    ]

    for pdata in processes_data:
        proc_id = str(uuid4())
        counter = await db.process_definitions.count_documents({}) + 1
        codigo = f"PROC-{pdata['prefix']}-{counter:03d}"
        area = area_by_name[pdata["area"]]
        tipo = type_by_name[pdata["tipo"]]
        proc_doc = {
            "id": proc_id,
            "codigo": codigo,
            "nombre": pdata["nombre"],
            "descripcion": pdata["descripcion"],
            "url_referencia": pdata["url_referencia"],
            "area_id": area["id"],
            "area_nombre": area["nombre"],
            "tipo_id": tipo["id"],
            "tipo_nombre": tipo["nombre"],
            "tipo_color_fondo": tipo["color_fondo"],
            "tipo_color_texto": tipo["color_texto"],
            "activo": True,
            "total_pasos": len(pdata["pasos"]),
            "created_at": now,
        }
        await db.process_definitions.insert_one(proc_doc)

        steps_docs = []
        for idx, sdata in enumerate(pdata["pasos"], start=1):
            cons_id = sdata.get("consecuencias")
            cons_name = ""
            if cons_id:
                cons_doc = next((c for c in consequences if c["id"] == cons_id), None)
                if cons_doc:
                    cons_name = cons_doc["nombre"]
            steps_docs.append({
                "id": str(uuid4()),
                "proceso_id": proc_id,
                "nombre": sdata["nombre"],
                "descripcion": sdata["descripcion"],
                "orden": idx,
                "puntos": sdata["puntos"],
                "requiere_evidencia": sdata["requiere_evidencia"],
                "es_critico": sdata["es_critico"],
                "sistema_consecuencias_id": cons_id,
                "sistema_consecuencias_nombre": cons_name,
                "created_at": now,
            })
        if steps_docs:
            await db.process_steps.insert_many(steps_docs)

    print(f"✅ {len(processes_data)} processes with steps")
    print("\n🎉 Process module seeded successfully!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_process())
