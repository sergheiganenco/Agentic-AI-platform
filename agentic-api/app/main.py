# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.limiter import limiter
from app.config import settings
from app.db.base import Base
from app.db.session import engine

# Import routers explicitly
from app.api.routes.health import router as health_router
from app.api.routes.fields import router as fields_router
from app.api.routes.user import router as user_router
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.api.routes.data_sources import router as data_sources_router
from app.api.routes import source_types
from app.api.routes import data_sources
from app.api.routes.scan_api import router as scan_api_router
from app.api.routes.scan_jobs import router as scan_jobs_router

from app.api.routes import agentic_ai




# Create all tables
Base.metadata.create_all(bind=engine)

print("DATABASE:", settings.database_url)

# Instantiate FastAPI
app = FastAPI(
    title=settings.app_name,
    version="1.0.0"
)

# Handle HTTPExceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # dev origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(health_router, prefix="/health", tags=["Health"])
app.include_router(fields_router, prefix="/fields", tags=["Fields"])
app.include_router(user_router, prefix="/users", tags=["Users"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(data_sources_router, prefix="/admin/data-sources", tags=["Data Sources"])
app.include_router(source_types.router, prefix="/source-types", tags=["Source Types"])
app.include_router(data_sources.public_router)
app.include_router(scan_api_router, prefix="/api")
app.include_router(scan_jobs_router, prefix="/api", tags=["Scan Jobs"])
app.include_router(agentic_ai.router, prefix="/agentic-ai", tags=["Agentic AI"])

# Root endpoint
@app.get("/")
def read_root():
    return {"message": f"{settings.app_name} API is running!"}
