# gschpoozi Web Configurator

A fancy web-based Klipper configuration wizard with interactive 3D printer models.

![gschpoozi Web Wizard](../Assets/gschpoozi_og_image_v2_compressed.png)

## Features

✨ **Interactive 3D Printer Models** - Click on components to configure them
📝 **Live Config Preview** - See your Klipper config update in real-time
💾 **State Management** - Save, load, backup, and restore your configuration
📥 **Config Import** - Import existing `printer.cfg` files (reverse engineering)
🎨 **Modern UI** - Beautiful React frontend with Tailwind CSS
🐳 **Docker Ready** - Easy deployment with Docker Compose

## Quick Start

### Development Mode

1. **Start the Backend**
   ```bash
   cd web/backend
   python -m venv venv

   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate

   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend** (in a new terminal)
   ```bash
   cd web/frontend
   npm install
   npm run dev
   ```

3. **Open your browser** at http://localhost:5173

### Production Deployment (Docker)

```bash
cd web
docker-compose up --build
```

Then access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Architecture

```
web/
├── frontend/              # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── three/     # React Three Fiber 3D scene
│   │   │   ├── panels/    # Configuration panels
│   │   │   └── preview/   # Monaco Editor preview
│   │   ├── pages/         # Route pages
│   │   ├── stores/        # Zustand state management
│   │   ├── hooks/         # Custom React hooks
│   │   └── services/      # API client
│   └── package.json
│
├── backend/               # FastAPI Python backend
│   ├── routers/           # API route handlers
│   │   ├── templates.py   # Board/toolboard/probe templates
│   │   ├── generator.py   # Config generation
│   │   └── state.py       # State management
│   ├── main.py            # FastAPI app
│   └── requirements.txt
│
├── docker-compose.yml     # Multi-container orchestration
├── Dockerfile.frontend    # Frontend build & nginx
└── Dockerfile.backend     # Python backend
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development builds
- **React Three Fiber** for 3D rendering
- **@react-three/drei** for 3D helpers
- **Zustand** for state management
- **TanStack Query** for API state
- **Monaco Editor** for config preview
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **FastAPI** for REST API
- **Pydantic** for validation
- **Uvicorn** for ASGI server
- Uses existing gschpoozi generator

## API Endpoints

### Templates
- `GET /api/boards` - List all mainboard templates
- `GET /api/boards/{id}` - Get specific board with pins
- `GET /api/toolboards` - List toolboard templates
- `GET /api/probes` - List probe templates
- `GET /api/extruders` - List extruder presets
- `GET /api/motors` - Motor database
- `GET /api/templates/all` - All templates in one call

### Generator
- `POST /api/validate` - Validate wizard state
- `POST /api/preview` - Generate config preview
- `POST /api/generate` - Generate and save configs

### State
- `GET /api/state` - Load saved state
- `POST /api/state` - Save state
- `DELETE /api/state` - Clear state
- `GET /api/state/backups` - List backups
- `POST /api/state/restore/{name}` - Restore backup
- `POST /api/state/import` - Import existing config

## Workflow

1. **Select Kinematics** - Choose CoreXY, Cartesian, Delta, or Hybrid
2. **Configure MCU** - Select mainboard and serial connection
3. **Configure Components** - Click 3D model parts to configure:
   - Steppers (X, Y, Z, extruder)
   - Hotend and heated bed
   - Probe
   - Fans
4. **Preview & Export** - Watch live preview, then export configs

## Hybrid CLI Integration

The web wizard works great alongside the CLI wizard:

- Use **CLI wizard on the printer** to auto-detect serial paths and CAN UUIDs
- Use **Web wizard anywhere** for visual configuration
- State files are compatible between both

## Development

### Frontend Hot Reload
The Vite dev server supports hot module replacement - changes appear instantly.

### Backend Hot Reload
Uvicorn with `--reload` watches for Python changes:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Adding New Board Templates
1. Add JSON file to `templates/boards/`
2. Backend automatically picks it up
3. Frontend dropdown updates on refresh

## License

MIT License - See [LICENSE](../LICENSE)
