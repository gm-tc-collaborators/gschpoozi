"""
API endpoints for board, toolboard, probe, extruder, and motor templates.
"""

import json
import os
from pathlib import Path
from typing import List, Optional, Any
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Templates directory - configurable via environment variable for Docker
# In Docker: /project/templates (set via TEMPLATES_DIR env var or default)
# In development: ../../templates (relative to this file)
def get_templates_dir() -> Path:
    """Get the templates directory path, checking environment variable first."""
    env_path = os.environ.get("TEMPLATES_DIR")
    if env_path:
        return Path(env_path)
    
    # Check if /project/templates exists (Docker container)
    docker_path = Path("/project/templates")
    if docker_path.exists():
        return docker_path
    
    # Fall back to relative path (development)
    backend_dir = Path(__file__).parent.parent
    project_root = backend_dir.parent.parent
    return project_root / "templates"

TEMPLATES_DIR = get_templates_dir()


def load_json_file(filepath: Path) -> dict:
    """Load and parse a JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def list_templates(subdir: str, include_full: bool = False) -> List[dict]:
    """List all templates in a subdirectory."""
    template_dir = TEMPLATES_DIR / subdir
    if not template_dir.exists():
        return []

    templates = []
    for filepath in sorted(template_dir.glob("*.json")):
        try:
            data = load_json_file(filepath)
            item = {
                "id": filepath.stem,
                "name": data.get("name", filepath.stem),
                "manufacturer": data.get("manufacturer", "Unknown"),
                "description": data.get("description", ""),
            }
            if include_full:
                item["data"] = data
            templates.append(item)
        except Exception as e:
            print(f"Warning: Could not load {filepath}: {e}")

    return templates


# ─────────────────────────────────────────────────────────────────────────────
# Board Templates
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/boards")
async def list_boards() -> List[dict]:
    """List all available mainboard templates."""
    return list_templates("boards")


@router.get("/boards/{board_id}")
async def get_board(board_id: str) -> dict:
    """Get a specific board template with full pin definitions."""
    filepath = TEMPLATES_DIR / "boards" / f"{board_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Board '{board_id}' not found")
    return load_json_file(filepath)


# ─────────────────────────────────────────────────────────────────────────────
# Toolboard Templates
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/toolboards")
async def list_toolboards() -> List[dict]:
    """List all available toolboard templates."""
    return list_templates("toolboards")


@router.get("/toolboards/{toolboard_id}")
async def get_toolboard(toolboard_id: str) -> dict:
    """Get a specific toolboard template."""
    filepath = TEMPLATES_DIR / "toolboards" / f"{toolboard_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Toolboard '{toolboard_id}' not found")
    return load_json_file(filepath)


# ─────────────────────────────────────────────────────────────────────────────
# Probe Templates
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/probes")
async def list_probes() -> List[dict]:
    """List all available probe templates."""
    return list_templates("probes")


@router.get("/probes/{probe_id}")
async def get_probe(probe_id: str) -> dict:
    """Get a specific probe template."""
    filepath = TEMPLATES_DIR / "probes" / f"{probe_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Probe '{probe_id}' not found")
    return load_json_file(filepath)


# ─────────────────────────────────────────────────────────────────────────────
# Extruder Templates
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/extruders")
async def list_extruders() -> List[dict]:
    """List all available extruder presets."""
    return list_templates("extruders")


@router.get("/extruders/{extruder_id}")
async def get_extruder(extruder_id: str) -> dict:
    """Get a specific extruder preset."""
    filepath = TEMPLATES_DIR / "extruders" / f"{extruder_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Extruder '{extruder_id}' not found")
    return load_json_file(filepath)


# ─────────────────────────────────────────────────────────────────────────────
# Motor Database
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/motors")
async def list_motors() -> List[dict]:
    """List all motors in the motor database."""
    motors_file = TEMPLATES_DIR / "motors" / "motors.json"
    if motors_file.exists():
        data = load_json_file(motors_file)
        # The motors.json might be a dict with motors array or direct array
        if isinstance(data, list):
            return data
        return data.get("motors", [])
    return []


@router.get("/motors/{motor_id}")
async def get_motor(motor_id: str) -> dict:
    """Get a specific motor's specifications."""
    motors_file = TEMPLATES_DIR / "motors" / "motors.json"
    if motors_file.exists():
        data = load_json_file(motors_file)
        motors = data if isinstance(data, list) else data.get("motors", [])
        for motor in motors:
            if motor.get("id") == motor_id or motor.get("name") == motor_id:
                return motor

    raise HTTPException(status_code=404, detail=f"Motor '{motor_id}' not found")


# ─────────────────────────────────────────────────────────────────────────────
# Bulk Fetch (for initial load)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/templates/all")
async def get_all_templates() -> dict:
    """
    Get all templates in one request for initial frontend load.
    Reduces number of API calls needed on startup.
    """
    return {
        "boards": list_templates("boards"),
        "toolboards": list_templates("toolboards"),
        "probes": list_templates("probes"),
        "extruders": list_templates("extruders"),
    }

