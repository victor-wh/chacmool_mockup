from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create FastAPI app
app = FastAPI(title="EvalPro API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routes.auth import router as auth_router
from routes.employees import router as employees_router
from routes.aciertos_desaciertos import router as aciertos_router
from routes.evaluations360 import router as evaluations360_router
from routes.kpis import router as kpis_router
from routes.empleado_a import router as empleado_a_router
from routes.pdi import router as pdi_router
from routes.process import router as process_router
from routes.calendar import router as calendar_router
from routes.supervision import router as supervision_router

# Include routers
app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(aciertos_router)
app.include_router(evaluations360_router)
app.include_router(kpis_router)
app.include_router(empleado_a_router)
app.include_router(pdi_router)
app.include_router(process_router)
app.include_router(calendar_router)
app.include_router(supervision_router)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "EvalPro API is running"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EvalPro API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
