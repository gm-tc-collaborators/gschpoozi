# gschpoozi Web Configurator

An interactive 3D Klipper configuration wizard built with React and Three.js.

## Features

- **3D Interactive Printer Model** - Click on components to configure them
- **Kinematics-Aware** - Different printer models for CoreXY, Cartesian, Delta, etc.
- **Live Config Preview** - See your Klipper config update in real-time
- **Visual Status Feedback** - Components glow based on configuration status
- **State Persistence** - Your progress is saved automatically
- **Export/Import** - Save and share configurations

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Fast dev/build
- **React Three Fiber** - 3D rendering
- **drei** - R3F helpers
- **Zustand** - State management
- **TanStack Query** - API state
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Monaco Editor** - Config preview

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── three/          # 3D scene components
│   │   ├── PrinterScene.tsx
│   │   └── ...
│   ├── panels/         # Configuration panels
│   │   ├── ConfigPanel.tsx
│   │   ├── MCUPanel.tsx
│   │   ├── StepperPanel.tsx
│   │   └── ...
│   ├── preview/        # Config preview
│   └── layout/         # App layout
├── stores/
│   └── wizardStore.ts  # Zustand state
├── pages/
│   ├── KinematicsSelect.tsx
│   └── Configurator.tsx
├── types/
│   └── wizard.ts       # TypeScript types
└── App.tsx
```

## Backend

The web configurator works with the gschpoozi FastAPI backend for:
- Board template loading
- Config generation
- Validation

See `../backend/` for the backend implementation.

## Deployment

### Docker

```bash
docker build -t gschpoozi-web .
docker run -p 3000:3000 gschpoozi-web
```

### Static Hosting

Build and deploy to any static host (Vercel, Netlify, etc.):

```bash
npm run build
# Deploy dist/ folder
```

## License

MIT
