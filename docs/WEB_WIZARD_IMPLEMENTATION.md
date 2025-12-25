# gschpoozi Web Wizard Implementation Plan

## Overview

This document describes the implementation of a web-based wizard interface for gschpoozi. The web wizard provides a visual, guided experience for configuring Klipper printers, complementing the existing CLI wizard.

## Goals

1. **Accessibility** - Users can configure printers without SSH/terminal knowledge
2. **Visual Feedback** - Real-time config preview, pin conflict visualization
3. **Mobile Support** - Configure from phone while at the printer
4. **Reuse Existing Logic** - Same templates, schema, and generator as CLI

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Wizard Steps (React Router)                                         │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │    │
│  │  │Printer │→│Kinema- │→│Steppers│→│ TMC    │→│ Probe  │→│Review  │ │    │
│  │  │ Info   │ │ tics   │ │& Motors│ │Drivers │ │& Mesh  │ │Generate│ │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐      │
│  │                    Wizard State (React Context)                    │      │
│  │  - Mirrors .wizard-state structure                                │      │
│  │  - Validated on each change                                       │      │
│  │  - Persisted to localStorage for recovery                         │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐      │
│  │                    Live Config Preview Panel                       │      │
│  │  - Shows generated Klipper config in real-time                    │      │
│  │  - Syntax highlighting                                            │      │
│  │  - Section tabs (hardware.cfg, macros.cfg, etc.)                  │      │
│  └───────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ REST API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PYTHON BACKEND (FastAPI)                           │
│                                                                              │
│  Endpoints:                                                                  │
│  ──────────────────────────────────────────────────────────────────────────  │
│  GET  /api/schema              → menu-schema.yaml as JSON                   │
│  GET  /api/boards              → List available board templates             │
│  GET  /api/boards/{name}       → Single board template                      │
│  GET  /api/toolboards          → List available toolboard templates         │
│  GET  /api/probes              → List available probe templates             │
│  GET  /api/motors              → Motor database                             │
│  POST /api/validate            → Validate partial wizard state              │
│  POST /api/preview             → Generate preview config (no save)          │
│  POST /api/generate            → Generate and save config files             │
│  GET  /api/state               → Load saved wizard state                    │
│  POST /api/state               → Save wizard state                          │
│  WS   /api/moonraker           → Proxy to Moonraker (optional)              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ File I/O
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXISTING GSCHPOOZI FILES                              │
│                                                                              │
│  templates/boards/*.json       - Board pin definitions                      │
│  templates/toolboards/*.json   - Toolboard definitions                      │
│  templates/probes/*.json       - Probe configurations                       │
│  templates/motors/*.json       - Motor database                             │
│  schema/menu-schema.yaml       - Wizard structure & validation              │
│  schema/config-sections.yaml   - Jinja2 templates for config generation     │
│  scripts/generator/generator.py - Config generation logic                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Project Setup & Backend API

#### 1.1 Directory Structure

```
gschpoozi/
├── web/                          # NEW - Web wizard
│   ├── frontend/                 # React application
│   │   ├── src/
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── pages/            # Wizard step pages
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── context/          # State management
│   │   │   ├── api/              # API client functions
│   │   │   ├── utils/            # Helpers, validation
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   ├── backend/                  # FastAPI server
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app entry
│   │   ├── routers/
│   │   │   ├── schema.py         # Schema endpoints
│   │   │   ├── templates.py      # Board/probe/motor endpoints
│   │   │   ├── generator.py      # Config generation endpoints
│   │   │   └── state.py          # Wizard state endpoints
│   │   ├── services/
│   │   │   ├── schema_parser.py  # Parse menu-schema.yaml
│   │   │   ├── validator.py      # State validation
│   │   │   └── generator.py      # Wrapper for generator.py
│   │   └── models/
│   │       ├── wizard_state.py   # Pydantic models
│   │       └── responses.py      # API response models
│   │
│   ├── requirements.txt          # Python dependencies
│   └── README.md                 # Setup instructions
│
├── templates/                    # Existing
├── schema/                       # Existing
├── scripts/                      # Existing
└── docs/                         # Existing
```

#### 1.2 Backend Dependencies

**File:** `web/requirements.txt`

```
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
pydantic>=2.0
pyyaml>=6.0
jinja2>=3.1.0
python-multipart>=0.0.6
websockets>=11.0
aiofiles>=23.0
httpx>=0.24.0  # For Moonraker proxy
```

#### 1.3 FastAPI Application

**File:** `web/backend/main.py`

```python
#!/usr/bin/env python3
"""
gschpoozi Web Wizard - Backend API

Provides REST API for the React frontend to interact with
gschpoozi templates and generator.
"""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import schema, templates, generator, state

# Determine project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
TEMPLATES_DIR = PROJECT_ROOT / "templates"
SCHEMA_DIR = PROJECT_ROOT / "schema"

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
        "http://localhost:3000",  # CRA dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(schema.router, prefix="/api", tags=["Schema"])
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
    }


# In production, serve frontend static files
FRONTEND_BUILD = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_BUILD.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

#### 1.4 Schema Parser Service

**File:** `web/backend/services/schema_parser.py`

```python
"""
Parse menu-schema.yaml and convert to JSON for frontend consumption.
"""

import yaml
from pathlib import Path
from typing import Any, Dict, List, Optional
from functools import lru_cache


class SchemaParser:
    def __init__(self, schema_path: Path):
        self.schema_path = schema_path
        self._schema = None

    @property
    def schema(self) -> Dict[str, Any]:
        if self._schema is None:
            with open(self.schema_path, 'r') as f:
                self._schema = yaml.safe_load(f)
        return self._schema

    def get_full_schema(self) -> Dict[str, Any]:
        """Return complete schema as JSON-serializable dict."""
        return self.schema

    def get_section(self, section_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific section by ID (e.g., '2.3' for X Axis)."""
        return self._find_section(self.schema.get('sections', []), section_id)

    def _find_section(self, sections: List[Dict], target_id: str) -> Optional[Dict]:
        for section in sections:
            if section.get('id') == target_id:
                return section
            if 'subsections' in section:
                found = self._find_section(section['subsections'], target_id)
                if found:
                    return found
        return None

    def get_parameters_for_section(self, section_id: str) -> List[Dict[str, Any]]:
        """Get all parameters for a section, with conditions evaluated."""
        section = self.get_section(section_id)
        if not section:
            return []
        return section.get('parameters', [])

    def validate_value(self, param: Dict, value: Any) -> tuple[bool, Optional[str]]:
        """
        Validate a single parameter value against its schema definition.

        Returns (is_valid, error_message).
        """
        param_type = param.get('type', 'string')
        required = param.get('required', False)

        # Check required
        if required and (value is None or value == ''):
            return False, f"Required field '{param.get('name')}' is missing"

        if value is None or value == '':
            return True, None  # Optional and empty is OK

        # Type validation
        if param_type == 'int':
            try:
                int_val = int(value)
                if 'range' in param:
                    min_val, max_val = param['range']
                    if not (min_val <= int_val <= max_val):
                        return False, f"Value must be between {min_val} and {max_val}"
            except (ValueError, TypeError):
                return False, "Must be an integer"

        elif param_type == 'float':
            try:
                float_val = float(value)
                if 'range' in param:
                    min_val, max_val = param['range']
                    if not (min_val <= float_val <= max_val):
                        return False, f"Value must be between {min_val} and {max_val}"
            except (ValueError, TypeError):
                return False, "Must be a number"

        elif param_type == 'choice':
            options = param.get('options', [])
            if value not in options:
                return False, f"Must be one of: {', '.join(options)}"

        elif param_type == 'bool':
            if not isinstance(value, bool) and value not in ['true', 'false', True, False]:
                return False, "Must be true or false"

        elif param_type == 'pin':
            # Basic pin validation (could be enhanced)
            if not isinstance(value, str):
                return False, "Pin must be a string"

        return True, None


@lru_cache()
def get_schema_parser(schema_dir: str) -> SchemaParser:
    """Get cached schema parser instance."""
    return SchemaParser(Path(schema_dir) / "menu-schema.yaml")
```

#### 1.5 Templates Router

**File:** `web/backend/routers/templates.py`

```python
"""
API endpoints for board, toolboard, probe, and motor templates.
"""

import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Paths relative to project root
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
TEMPLATES_DIR = PROJECT_ROOT / "templates"


def load_json_file(filepath: Path) -> dict:
    """Load and parse a JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)


def list_templates(subdir: str) -> List[dict]:
    """List all templates in a subdirectory."""
    template_dir = TEMPLATES_DIR / subdir
    if not template_dir.exists():
        return []

    templates = []
    for filepath in sorted(template_dir.glob("*.json")):
        try:
            data = load_json_file(filepath)
            templates.append({
                "id": filepath.stem,
                "name": data.get("name", filepath.stem),
                "manufacturer": data.get("manufacturer", "Unknown"),
                "description": data.get("description", ""),
            })
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
# Motor Database
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/motors")
async def list_motors() -> List[dict]:
    """List all motors in the motor database."""
    # Motors might be in a single file or directory
    motors_file = TEMPLATES_DIR / "motors" / "motor_database.json"
    if motors_file.exists():
        data = load_json_file(motors_file)
        return data.get("motors", [])

    # Or individual files
    return list_templates("motors")


@router.get("/motors/{motor_id}")
async def get_motor(motor_id: str) -> dict:
    """Get a specific motor's specifications."""
    # Try motor database first
    motors_file = TEMPLATES_DIR / "motors" / "motor_database.json"
    if motors_file.exists():
        data = load_json_file(motors_file)
        for motor in data.get("motors", []):
            if motor.get("id") == motor_id:
                return motor

    # Try individual file
    filepath = TEMPLATES_DIR / "motors" / f"{motor_id}.json"
    if filepath.exists():
        return load_json_file(filepath)

    raise HTTPException(status_code=404, detail=f"Motor '{motor_id}' not found")
```

#### 1.6 Generator Router

**File:** `web/backend/routers/generator.py`

```python
"""
API endpoints for config generation and preview.
"""

import sys
import json
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Add scripts to path for importing generator
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts" / "generator"))

router = APIRouter()


class GenerateRequest(BaseModel):
    """Request body for config generation."""
    wizard_state: Dict[str, Any]
    output_dir: Optional[str] = None  # None = preview only, don't save


class GenerateResponse(BaseModel):
    """Response from config generation."""
    success: bool
    files: Dict[str, str]  # filename -> content
    errors: list[str] = []
    warnings: list[str] = []


class ValidateRequest(BaseModel):
    """Request body for validation."""
    wizard_state: Dict[str, Any]
    section: Optional[str] = None  # Validate specific section or all


class ValidateResponse(BaseModel):
    """Response from validation."""
    valid: bool
    errors: Dict[str, list[str]] = {}  # field -> list of errors
    warnings: Dict[str, list[str]] = {}


@router.post("/validate", response_model=ValidateResponse)
async def validate_state(request: ValidateRequest) -> ValidateResponse:
    """
    Validate wizard state (partial or complete).

    Can validate a specific section or the entire state.
    Returns field-level errors and warnings.
    """
    errors = {}
    warnings = {}

    state = request.wizard_state

    # Basic validation examples - expand based on menu-schema.yaml
    # Kinematics validation
    if 'printer.kinematics' in state:
        kinematics = state['printer.kinematics']
        valid_types = ['cartesian', 'corexy', 'corexz', 'delta', 'hybrid_corexy']
        if kinematics not in valid_types:
            errors['printer.kinematics'] = [f"Invalid kinematics type: {kinematics}"]

    # Current validation
    for axis in ['x', 'y', 'z']:
        key = f'stepper_{axis}.run_current'
        if key in state:
            current = float(state[key])
            if current > 2.5:
                errors[key] = [f"Run current {current}A exceeds safe limit (2.5A)"]
            elif current > 2.0:
                warnings[key] = [f"Run current {current}A is high - ensure adequate cooling"]

    # Temperature limits
    if 'extruder.max_temp' in state:
        max_temp = int(state['extruder.max_temp'])
        if max_temp > 300:
            errors['extruder.max_temp'] = ["Max temp exceeds safe limit (300C)"]

    if 'heater_bed.max_temp' in state:
        max_temp = int(state['heater_bed.max_temp'])
        if max_temp > 130:
            warnings['heater_bed.max_temp'] = ["Bed max temp above 130C - verify heater rating"]

    # Pin conflict detection
    used_pins = {}
    for key, value in state.items():
        if '_pin' in key or key.startswith('pins.'):
            pin = str(value).lstrip('^!~')  # Remove modifiers
            if pin and pin != 'None':
                if pin in used_pins:
                    if key not in errors:
                        errors[key] = []
                    errors[key].append(f"Pin {pin} already used by {used_pins[pin]}")
                else:
                    used_pins[pin] = key

    return ValidateResponse(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )


@router.post("/preview", response_model=GenerateResponse)
async def preview_config(request: GenerateRequest) -> GenerateResponse:
    """
    Generate config preview without saving to disk.

    Returns all generated config file contents.
    """
    try:
        # Import generator module
        from generator import ConfigGenerator

        # Create temporary state file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(request.wizard_state, f)
            state_file = f.name

        # Create temporary output directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Run generator
            generator = ConfigGenerator(
                state_file=state_file,
                output_dir=temp_dir,
                schema_dir=str(PROJECT_ROOT / "schema"),
                templates_dir=str(PROJECT_ROOT / "templates"),
            )

            generator.generate()

            # Collect generated files
            files = {}
            for cfg_file in Path(temp_dir).glob("*.cfg"):
                files[cfg_file.name] = cfg_file.read_text()

        return GenerateResponse(
            success=True,
            files=files,
        )

    except Exception as e:
        return GenerateResponse(
            success=False,
            files={},
            errors=[str(e)],
        )


@router.post("/generate", response_model=GenerateResponse)
async def generate_config(request: GenerateRequest) -> GenerateResponse:
    """
    Generate config files and save to specified directory.

    If output_dir is not specified, uses default location.
    """
    if not request.output_dir:
        raise HTTPException(
            status_code=400,
            detail="output_dir is required for saving configs"
        )

    output_path = Path(request.output_dir).expanduser()

    try:
        from generator import ConfigGenerator

        # Create temporary state file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(request.wizard_state, f)
            state_file = f.name

        # Ensure output directory exists
        output_path.mkdir(parents=True, exist_ok=True)

        # Run generator
        generator = ConfigGenerator(
            state_file=state_file,
            output_dir=str(output_path),
            schema_dir=str(PROJECT_ROOT / "schema"),
            templates_dir=str(PROJECT_ROOT / "templates"),
        )

        generator.generate()

        # Collect generated files
        files = {}
        for cfg_file in output_path.glob("*.cfg"):
            files[cfg_file.name] = cfg_file.read_text()

        return GenerateResponse(
            success=True,
            files=files,
        )

    except Exception as e:
        return GenerateResponse(
            success=False,
            files={},
            errors=[str(e)],
        )
```

---

### Phase 2: React Frontend Setup

#### 2.1 Initialize React Project

```bash
cd gschpoozi/web
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Additional dependencies
npm install react-router-dom           # Routing
npm install @tanstack/react-query      # API state management
npm install zustand                    # Client state management
npm install react-hook-form            # Form handling
npm install zod                        # Validation
npm install @monaco-editor/react       # Config preview with syntax highlight
npm install lucide-react               # Icons
npm install clsx tailwind-merge        # Styling utilities

# Dev dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 2.2 Wizard State Context

**File:** `web/frontend/src/context/WizardContext.tsx`

```tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Types matching .wizard-state structure
export interface WizardState {
  // Printer basics
  'printer.name'?: string;
  'printer.kinematics'?: string;
  'printer.bed_size_x'?: number;
  'printer.bed_size_y'?: number;
  'printer.max_z'?: number;

  // Board selection
  'mcu.main.board'?: string;
  'mcu.main.serial'?: string;
  'mcu.toolboard.enabled'?: boolean;
  'mcu.toolboard.type'?: string;

  // Steppers
  'stepper_x.driver_type'?: string;
  'stepper_x.run_current'?: number;
  // ... etc

  // Allow any string key for flexibility
  [key: string]: any;
}

interface WizardContextType {
  state: WizardState;
  updateField: (key: string, value: any) => void;
  updateFields: (fields: Partial<WizardState>) => void;
  resetState: () => void;
  loadState: (state: WizardState) => void;
  getFieldValue: <T>(key: string, defaultValue?: T) => T | undefined;
  isFieldSet: (key: string) => boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

// Reducer for state updates
type Action =
  | { type: 'UPDATE_FIELD'; key: string; value: any }
  | { type: 'UPDATE_FIELDS'; fields: Partial<WizardState> }
  | { type: 'RESET' }
  | { type: 'LOAD'; state: WizardState };

function wizardReducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.key]: action.value };
    case 'UPDATE_FIELDS':
      return { ...state, ...action.fields };
    case 'RESET':
      return {};
    case 'LOAD':
      return action.state;
    default:
      return state;
  }
}

// Local storage persistence
const STORAGE_KEY = 'gschpoozi-wizard-state';

function loadFromStorage(): WizardState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: WizardState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, {}, loadFromStorage);

  // Persist to localStorage on changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const value: WizardContextType = {
    state,
    updateField: (key, value) => dispatch({ type: 'UPDATE_FIELD', key, value }),
    updateFields: (fields) => dispatch({ type: 'UPDATE_FIELDS', fields }),
    resetState: () => dispatch({ type: 'RESET' }),
    loadState: (newState) => dispatch({ type: 'LOAD', state: newState }),
    getFieldValue: (key, defaultValue) => state[key] ?? defaultValue,
    isFieldSet: (key) => key in state && state[key] !== undefined && state[key] !== '',
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
}
```

#### 2.3 API Client

**File:** `web/frontend/src/api/client.ts`

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// Template APIs
export const templatesApi = {
  listBoards: () => fetchApi<BoardSummary[]>('/boards'),
  getBoard: (id: string) => fetchApi<BoardTemplate>(`/boards/${id}`),
  listToolboards: () => fetchApi<ToolboardSummary[]>('/toolboards'),
  getToolboard: (id: string) => fetchApi<ToolboardTemplate>(`/toolboards/${id}`),
  listProbes: () => fetchApi<ProbeSummary[]>('/probes'),
  getProbe: (id: string) => fetchApi<ProbeTemplate>(`/probes/${id}`),
  listMotors: () => fetchApi<MotorSummary[]>('/motors'),
};

// Schema API
export const schemaApi = {
  getFullSchema: () => fetchApi<WizardSchema>('/schema'),
  getSection: (id: string) => fetchApi<SchemaSection>(`/schema/sections/${id}`),
};

// Generator APIs
export const generatorApi = {
  validate: (state: Record<string, any>, section?: string) =>
    fetchApi<ValidationResponse>('/validate', {
      method: 'POST',
      body: JSON.stringify({ wizard_state: state, section }),
    }),

  preview: (state: Record<string, any>) =>
    fetchApi<GenerateResponse>('/preview', {
      method: 'POST',
      body: JSON.stringify({ wizard_state: state }),
    }),

  generate: (state: Record<string, any>, outputDir: string) =>
    fetchApi<GenerateResponse>('/generate', {
      method: 'POST',
      body: JSON.stringify({ wizard_state: state, output_dir: outputDir }),
    }),
};

// State APIs
export const stateApi = {
  load: () => fetchApi<{ state: Record<string, any> }>('/state'),
  save: (state: Record<string, any>) =>
    fetchApi<{ success: boolean }>('/state', {
      method: 'POST',
      body: JSON.stringify({ state }),
    }),
};

// Types
export interface BoardSummary {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
}

export interface BoardTemplate extends BoardSummary {
  mcu: string;
  pins: Record<string, any>;
  default_config: Record<string, any>;
}

export interface ToolboardSummary {
  id: string;
  name: string;
  manufacturer: string;
}

export interface ToolboardTemplate extends ToolboardSummary {
  connection_types: string[];
  pins: Record<string, any>;
}

export interface ProbeSummary {
  id: string;
  name: string;
  type: string;
}

export interface ProbeTemplate extends ProbeSummary {
  default_config: Record<string, any>;
}

export interface MotorSummary {
  id: string;
  name: string;
  manufacturer: string;
  rated_current: number;
}

export interface WizardSchema {
  version: string;
  sections: SchemaSection[];
}

export interface SchemaSection {
  id: string;
  name: string;
  description?: string;
  condition?: string;
  parameters?: SchemaParameter[];
  subsections?: SchemaSection[];
}

export interface SchemaParameter {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'choice' | 'pin';
  required?: boolean;
  default?: any;
  options?: string[];
  range?: [number, number];
  description?: string;
  condition?: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

export interface GenerateResponse {
  success: boolean;
  files: Record<string, string>;
  errors: string[];
  warnings: string[];
}
```

#### 2.4 Wizard Step Component Example

**File:** `web/frontend/src/pages/KinematicsStep.tsx`

```tsx
import { useWizard } from '../context/WizardContext';
import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../api/client';

const KINEMATICS_OPTIONS = [
  { value: 'cartesian', label: 'Cartesian', description: 'Standard bed-slinger or moving gantry' },
  { value: 'corexy', label: 'CoreXY', description: 'Fixed bed, dual motor XY movement' },
  { value: 'corexz', label: 'CoreXZ', description: 'Moving bed Y, CoreXZ gantry' },
  { value: 'delta', label: 'Delta', description: 'Three tower delta printer' },
  { value: 'hybrid_corexy', label: 'Hybrid CoreXY (AWD)', description: 'CoreXY with 4 XY motors' },
];

export function KinematicsStep() {
  const { state, updateField, updateFields } = useWizard();

  // Fetch boards for selection
  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: templatesApi.listBoards,
  });

  const handleKinematicsChange = (value: string) => {
    updateField('printer.kinematics', value);

    // Set defaults based on kinematics
    if (value === 'hybrid_corexy') {
      updateField('printer.awd_enabled', true);
    } else {
      updateField('printer.awd_enabled', false);
    }
  };

  const handleBoardChange = async (boardId: string) => {
    updateField('mcu.main.board', boardId);

    // Load board template and set defaults
    try {
      const board = await templatesApi.getBoard(boardId);
      updateFields({
        'mcu.main.mcu_type': board.mcu,
        // Apply board defaults
        ...Object.entries(board.default_config || {}).reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, any>),
      });
    } catch (error) {
      console.error('Failed to load board template:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Printer Kinematics</h2>
        <p className="text-gray-600 mb-6">
          Select your printer's motion system. This determines how motors control movement.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {KINEMATICS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleKinematicsChange(option.value)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                state['printer.kinematics'] === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{option.label}</div>
              <div className="text-sm text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Mainboard Selection</h2>
        <p className="text-gray-600 mb-6">
          Select your printer's control board. This determines available pins and features.
        </p>

        {isLoading ? (
          <div>Loading boards...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards?.map((board) => (
              <button
                key={board.id}
                onClick={() => handleBoardChange(board.id)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  state['mcu.main.board'] === board.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{board.name}</div>
                <div className="text-sm text-gray-400">{board.manufacturer}</div>
                {board.description && (
                  <div className="text-sm text-gray-500 mt-1">{board.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bed size inputs */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Print Volume</h2>
        <div className="grid grid-cols-3 gap-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">X (mm)</label>
            <input
              type="number"
              value={state['printer.bed_size_x'] || ''}
              onChange={(e) => updateField('printer.bed_size_x', Number(e.target.value))}
              className="w-full p-2 border rounded"
              placeholder="300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Y (mm)</label>
            <input
              type="number"
              value={state['printer.bed_size_y'] || ''}
              onChange={(e) => updateField('printer.bed_size_y', Number(e.target.value))}
              className="w-full p-2 border rounded"
              placeholder="300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Z (mm)</label>
            <input
              type="number"
              value={state['printer.max_z'] || ''}
              onChange={(e) => updateField('printer.max_z', Number(e.target.value))}
              className="w-full p-2 border rounded"
              placeholder="350"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2.5 Config Preview Component

**File:** `web/frontend/src/components/ConfigPreview.tsx`

```tsx
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useWizard } from '../context/WizardContext';
import { generatorApi } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';

export function ConfigPreview() {
  const { state } = useWizard();
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('hardware.cfg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce state changes to avoid excessive API calls
  const debouncedState = useDebounce(state, 500);

  useEffect(() => {
    async function generatePreview() {
      // Skip if state is mostly empty
      if (Object.keys(debouncedState).length < 5) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await generatorApi.preview(debouncedState);
        if (response.success) {
          setFiles(response.files);
          // Set active file to first available if current doesn't exist
          if (!response.files[activeFile]) {
            const firstFile = Object.keys(response.files)[0];
            if (firstFile) setActiveFile(firstFile);
          }
        } else {
          setError(response.errors.join('\n'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Preview generation failed');
      } finally {
        setLoading(false);
      }
    }

    generatePreview();
  }, [debouncedState]);

  const fileNames = Object.keys(files);

  return (
    <div className="h-full flex flex-col border rounded-lg overflow-hidden">
      {/* File tabs */}
      <div className="flex border-b bg-gray-50 overflow-x-auto">
        {fileNames.map((filename) => (
          <button
            key={filename}
            onClick={() => setActiveFile(filename)}
            className={`px-4 py-2 text-sm whitespace-nowrap ${
              activeFile === filename
                ? 'bg-white border-b-2 border-blue-500 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {filename}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}

        {error ? (
          <div className="p-4 text-red-600 bg-red-50">
            <div className="font-medium">Preview Error</div>
            <pre className="mt-2 text-sm whitespace-pre-wrap">{error}</pre>
          </div>
        ) : (
          <Editor
            height="100%"
            language="ini"
            value={files[activeFile] || '# Select options to generate preview...'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
            theme="vs-light"
          />
        )}
      </div>
    </div>
  );
}
```

---

### Phase 3: Wizard Flow & Navigation

#### 3.1 Main App Router

**File:** `web/frontend/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WizardProvider } from './context/WizardContext';
import { WizardLayout } from './layouts/WizardLayout';

// Wizard steps
import { WelcomeStep } from './pages/WelcomeStep';
import { KinematicsStep } from './pages/KinematicsStep';
import { SteppersStep } from './pages/SteppersStep';
import { TMCDriversStep } from './pages/TMCDriversStep';
import { ProbeStep } from './pages/ProbeStep';
import { ExtruderStep } from './pages/ExtruderStep';
import { FeaturesStep } from './pages/FeaturesStep';
import { ReviewStep } from './pages/ReviewStep';
import { GenerateStep } from './pages/GenerateStep';

const queryClient = new QueryClient();

// Define wizard steps for navigation
export const WIZARD_STEPS = [
  { path: 'welcome', label: 'Welcome', component: WelcomeStep },
  { path: 'kinematics', label: 'Kinematics & Board', component: KinematicsStep },
  { path: 'steppers', label: 'Steppers', component: SteppersStep },
  { path: 'tmc', label: 'TMC Drivers', component: TMCDriversStep },
  { path: 'probe', label: 'Probe & Leveling', component: ProbeStep },
  { path: 'extruder', label: 'Extruder & Hotend', component: ExtruderStep },
  { path: 'features', label: 'Features', component: FeaturesStep },
  { path: 'review', label: 'Review', component: ReviewStep },
  { path: 'generate', label: 'Generate', component: GenerateStep },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WizardProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WizardLayout />}>
              <Route index element={<Navigate to="/wizard/welcome" replace />} />
              {WIZARD_STEPS.map((step) => (
                <Route
                  key={step.path}
                  path={`wizard/${step.path}`}
                  element={<step.component />}
                />
              ))}
            </Route>
          </Routes>
        </BrowserRouter>
      </WizardProvider>
    </QueryClientProvider>
  );
}
```

#### 3.2 Wizard Layout with Sidebar

**File:** `web/frontend/src/layouts/WizardLayout.tsx`

```tsx
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { WIZARD_STEPS } from '../App';
import { ConfigPreview } from '../components/ConfigPreview';
import { useWizard } from '../context/WizardContext';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

export function WizardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useWizard();

  const currentStepIndex = WIZARD_STEPS.findIndex(
    (step) => location.pathname.includes(step.path)
  );

  const goToStep = (index: number) => {
    if (index >= 0 && index < WIZARD_STEPS.length) {
      navigate(`/wizard/${WIZARD_STEPS[index].path}`);
    }
  };

  const goNext = () => goToStep(currentStepIndex + 1);
  const goPrev = () => goToStep(currentStepIndex - 1);

  // Simple step completion check (expand based on required fields)
  const isStepComplete = (stepPath: string): boolean => {
    switch (stepPath) {
      case 'kinematics':
        return !!state['printer.kinematics'] && !!state['mcu.main.board'];
      case 'steppers':
        return !!state['stepper_x.run_current'] && !!state['stepper_y.run_current'];
      // Add more checks...
      default:
        return false;
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar navigation */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">gschpoozi</h1>
          <p className="text-sm text-gray-400">Klipper Config Wizard</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = currentStepIndex === index;
              const isComplete = isStepComplete(step.path);
              const isPast = index < currentStepIndex;

              return (
                <li key={step.path}>
                  <button
                    onClick={() => goToStep(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {isComplete || isPast ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                    <span>{step.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => {
              if (confirm('Reset all wizard data?')) {
                localStorage.removeItem('gschpoozi-wizard-state');
                window.location.reload();
              }
            }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Reset Wizard
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Step content */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>

        {/* Navigation buttons */}
        <div className="border-t p-4 flex justify-between">
          <button
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>

          <button
            onClick={goNext}
            disabled={currentStepIndex === WIZARD_STEPS.length - 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {currentStepIndex === WIZARD_STEPS.length - 2 ? 'Review' : 'Next'}
          </button>
        </div>
      </div>

      {/* Config preview panel (collapsible) */}
      <div className="w-96 border-l bg-gray-50">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b font-medium">Config Preview</div>
          <div className="flex-1">
            <ConfigPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 4: Advanced Features

#### 4.1 Pin Conflict Visualization

**File:** `web/frontend/src/components/PinMapper.tsx`

```tsx
import { useMemo } from 'react';
import { useWizard } from '../context/WizardContext';

interface PinMapperProps {
  boardPins: Record<string, any>;
}

export function PinMapper({ boardPins }: PinMapperProps) {
  const { state } = useWizard();

  // Build map of used pins
  const usedPins = useMemo(() => {
    const map: Record<string, { field: string; label: string }> = {};

    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'string' && value.match(/^[!^~]*P[A-Z]\d+$/)) {
        const pin = value.replace(/^[!^~]+/, '');
        map[pin] = {
          field: key,
          label: key.split('.').pop() || key,
        };
      }
    }

    return map;
  }, [state]);

  // Find conflicts
  const conflicts = useMemo(() => {
    const pinCounts: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'string' && value.match(/^[!^~]*P[A-Z]\d+$/)) {
        const pin = value.replace(/^[!^~]+/, '');
        if (!pinCounts[pin]) pinCounts[pin] = [];
        pinCounts[pin].push(key);
      }
    }

    return Object.entries(pinCounts)
      .filter(([_, fields]) => fields.length > 1)
      .map(([pin, fields]) => ({ pin, fields }));
  }, [state]);

  return (
    <div className="space-y-4">
      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="font-medium text-red-800">Pin Conflicts Detected</div>
          <ul className="mt-2 text-sm text-red-700">
            {conflicts.map(({ pin, fields }) => (
              <li key={pin}>
                <strong>{pin}</strong> used by: {fields.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pin usage summary */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {Object.entries(boardPins.gpio || {}).map(([pin, info]) => {
          const used = usedPins[pin];
          const hasConflict = conflicts.some((c) => c.pin === pin);

          return (
            <div
              key={pin}
              className={`p-2 rounded border ${
                hasConflict
                  ? 'bg-red-100 border-red-300'
                  : used
                  ? 'bg-green-100 border-green-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
              title={used ? `Used by: ${used.field}` : 'Available'}
            >
              <div className="font-mono">{pin}</div>
              {used && <div className="truncate text-gray-600">{used.label}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### 4.2 Moonraker Integration (Optional)

**File:** `web/backend/routers/moonraker.py`

```python
"""
Optional Moonraker API proxy for live printer interaction.
"""

import httpx
from fastapi import APIRouter, WebSocket, HTTPException
from typing import Optional

router = APIRouter()

MOONRAKER_URL = "http://localhost:7125"


@router.get("/moonraker/info")
async def get_printer_info():
    """Get basic printer info from Moonraker."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{MOONRAKER_URL}/printer/info")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Moonraker unavailable: {e}")


@router.get("/moonraker/objects")
async def query_printer_objects(objects: str):
    """
    Query printer objects from Moonraker.

    Example: ?objects=configfile,toolhead,extruder
    """
    obj_list = objects.split(",")
    query = "&".join([f"{obj}" for obj in obj_list])

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MOONRAKER_URL}/printer/objects/query?{query}"
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Moonraker unavailable: {e}")


@router.post("/moonraker/gcode")
async def send_gcode(gcode: str):
    """Send G-code command to printer."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MOONRAKER_URL}/printer/gcode/script",
                json={"script": gcode}
            )
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Moonraker unavailable: {e}")


@router.websocket("/moonraker/ws")
async def moonraker_websocket(websocket: WebSocket):
    """
    WebSocket proxy to Moonraker for real-time updates.

    Forwards messages between frontend and Moonraker.
    """
    await websocket.accept()

    try:
        async with httpx.AsyncClient() as client:
            # This is a simplified example - real implementation would
            # maintain a WebSocket connection to Moonraker
            while True:
                data = await websocket.receive_text()
                # Forward to Moonraker and return response
                # Implementation depends on Moonraker's WebSocket API
                await websocket.send_text(f"Received: {data}")
    except Exception as e:
        await websocket.close(code=1001)
```

---

### Phase 5: Deployment

#### 5.1 Docker Deployment

**File:** `web/Dockerfile`

```dockerfile
# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production image
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Copy gschpoozi files (templates, schema, scripts)
COPY ../templates ./templates
COPY ../schema ./schema
COPY ../scripts ./scripts

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**File:** `web/docker-compose.yml`

```yaml
version: '3.8'

services:
  gschpoozi-web:
    build: .
    ports:
      - "8000:8000"
    volumes:
      # Mount for development
      - ../templates:/app/templates:ro
      - ../schema:/app/schema:ro
      # Persist wizard states
      - wizard-states:/app/states
    environment:
      - MOONRAKER_URL=http://host.docker.internal:7125
    restart: unless-stopped

volumes:
  wizard-states:
```

#### 5.2 Standalone Script

**File:** `web/run.py`

```python
#!/usr/bin/env python3
"""
Start gschpoozi web wizard.

Usage:
    python run.py                    # Start on default port 8000
    python run.py --port 3000        # Custom port
    python run.py --dev              # Development mode with hot reload
"""

import argparse
import subprocess
import sys
from pathlib import Path

WEB_DIR = Path(__file__).parent


def main():
    parser = argparse.ArgumentParser(description='Run gschpoozi web wizard')
    parser.add_argument('--port', type=int, default=8000, help='Port to run on')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--dev', action='store_true', help='Development mode')
    args = parser.parse_args()

    # Check if frontend is built
    frontend_dist = WEB_DIR / 'frontend' / 'dist'
    if not frontend_dist.exists() and not args.dev:
        print("Frontend not built. Building...")
        subprocess.run(['npm', 'run', 'build'], cwd=WEB_DIR / 'frontend', check=True)

    # Start uvicorn
    cmd = [
        sys.executable, '-m', 'uvicorn',
        'backend.main:app',
        '--host', args.host,
        '--port', str(args.port),
    ]

    if args.dev:
        cmd.append('--reload')
        print(f"Starting in development mode on http://{args.host}:{args.port}")
        print("Note: Run 'npm run dev' in frontend/ for hot-reloading frontend")
    else:
        print(f"Starting gschpoozi web wizard on http://{args.host}:{args.port}")

    subprocess.run(cmd, cwd=WEB_DIR)


if __name__ == '__main__':
    main()
```

---

## File Changes Summary

| Directory | New Files | Purpose |
|-----------|-----------|---------|
| `web/backend/` | `main.py`, routers, services | FastAPI backend |
| `web/frontend/` | React app | User interface |
| `web/` | `requirements.txt`, `Dockerfile`, `run.py` | Setup & deployment |
| `docs/` | This file | Documentation |

---

## Testing Plan

### Backend Tests

```python
# web/backend/tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_list_boards():
    response = client.get("/api/boards")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_validate_state():
    response = client.post("/api/validate", json={
        "wizard_state": {
            "printer.kinematics": "corexy",
            "stepper_x.run_current": 1.2,
        }
    })
    assert response.status_code == 200
    assert "valid" in response.json()
```

### Frontend Tests

```typescript
// web/frontend/src/__tests__/WizardContext.test.tsx
import { render, screen } from '@testing-library/react';
import { WizardProvider, useWizard } from '../context/WizardContext';

function TestComponent() {
  const { state, updateField } = useWizard();
  return (
    <div>
      <span data-testid="value">{state['test.field'] || 'empty'}</span>
      <button onClick={() => updateField('test.field', 'hello')}>Set</button>
    </div>
  );
}

test('updates wizard state', () => {
  render(
    <WizardProvider>
      <TestComponent />
    </WizardProvider>
  );

  expect(screen.getByTestId('value')).toHaveTextContent('empty');
  screen.getByText('Set').click();
  expect(screen.getByTestId('value')).toHaveTextContent('hello');
});
```

---

## Future Enhancements

1. **Import existing config** - Parse existing printer.cfg and populate wizard state
2. **Export to GitHub Gist** - Share configurations easily
3. **Configuration profiles** - Save/load named profiles (e.g., "Voron 2.4 350")
4. **Community templates** - Browse community-shared configurations
5. **Diff view** - Show changes between regenerated config and existing
6. **Firmware builder integration** - Build and flash Klipper MCU firmware
7. **PWA support** - Install as app, work offline
8. **Multi-language** - i18n support for international users

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Moonraker API](https://moonraker.readthedocs.io/en/latest/web_api/)
