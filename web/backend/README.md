# gschpoozi Web Wizard - Backend API

FastAPI backend for the gschpoozi web-based Klipper configuration wizard.

## Features

- **Templates API**: Serve board, toolboard, probe, extruder, and motor templates
- **Generator API**: Preview and generate Klipper config files
- **State API**: Save, load, backup, and restore wizard state
- **Validation API**: Validate configuration with field-level error messages
- **Config Import**: Parse existing Klipper configs into wizard state

## Development

### Prerequisites

- Python 3.10+
- pip

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
```

Or with uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

When running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Templates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/boards` | GET | List all mainboard templates |
| `/api/boards/{id}` | GET | Get specific board template |
| `/api/toolboards` | GET | List all toolboard templates |
| `/api/toolboards/{id}` | GET | Get specific toolboard template |
| `/api/probes` | GET | List all probe templates |
| `/api/probes/{id}` | GET | Get specific probe template |
| `/api/extruders` | GET | List all extruder presets |
| `/api/extruders/{id}` | GET | Get specific extruder preset |
| `/api/motors` | GET | List all motors in database |
| `/api/motors/{id}` | GET | Get specific motor specs |
| `/api/templates/all` | GET | Get all templates in one request |

### Generator

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/validate` | POST | Validate wizard state |
| `/api/preview` | POST | Generate config preview |
| `/api/generate` | POST | Generate and save config files |

### State Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Load saved wizard state |
| `/api/state` | POST | Save wizard state |
| `/api/state` | DELETE | Clear wizard state |
| `/api/state/backups` | GET | List available backups |
| `/api/state/restore/{name}` | POST | Restore from backup |
| `/api/state/import` | POST | Import existing Klipper config |

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/info` | GET | Project info |

## Directory Structure

```
backend/
├── main.py              # FastAPI application entry
├── requirements.txt     # Python dependencies
├── routers/
│   ├── templates.py     # Template endpoints
│   ├── generator.py     # Generation endpoints
│   └── state.py         # State management endpoints
├── services/            # Business logic (future)
└── models/              # Pydantic models (future)
```

