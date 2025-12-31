#!/usr/bin/env python3
"""
gschpoozi Web Wizard - FastAPI Backend

Provides REST API for the React frontend to interact with
gschpoozi templates and config generator.
"""

import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Determine project root
BACKEND_DIR = Path(__file__).parent
WEB_DIR = BACKEND_DIR.parent
PROJECT_ROOT = WEB_DIR.parent
TEMPLATES_DIR = PROJECT_ROOT / "templates"
SCHEMA_DIR = PROJECT_ROOT / "schema"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"

# Add scripts to path for importing generator
sys.path.insert(0, str(SCRIPTS_DIR))

from routers import templates, generator, state

app = FastAPI(
    title="gschpoozi Web Wizard API",
    description="Backend API for gschpoozi web-based configuration wizard",
    version="1.0.0",
)

# CORS for development (frontend on different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",  # Allow all in dev - restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(templates.router, prefix="/api", tags=["Templates"])
app.include_router(generator.router, prefix="/api", tags=["Generator"])
app.include_router(state.router, prefix="/api", tags=["State"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "project_root": str(PROJECT_ROOT),
        "templates_found": TEMPLATES_DIR.exists(),
        "schema_found": SCHEMA_DIR.exists(),
        "boards_count": len(list((TEMPLATES_DIR / "boards").glob("*.json"))) if (TEMPLATES_DIR / "boards").exists() else 0,
        "toolboards_count": len(list((TEMPLATES_DIR / "toolboards").glob("*.json"))) if (TEMPLATES_DIR / "toolboards").exists() else 0,
    }


@app.get("/api/info")
async def get_info():
    """Get project information."""
    return {
        "name": "gschpoozi",
        "version": "3.0.0",
        "description": "Klipper Configuration Wizard",
        "api_version": "1.0.0",
    }


# In production, serve frontend static files
FRONTEND_BUILD = WEB_DIR / "frontend" / "dist"
if FRONTEND_BUILD.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

