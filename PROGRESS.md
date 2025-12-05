# gschpoozi Development Progress

> Last updated: 2024-12-05

## Project Status: Alpha (In Development)

---

## ✅ Completed Features

### Core Framework
- [x] Interactive configuration wizard (`scripts/configure.sh`)
- [x] Hardware setup Python script (`scripts/setup-hardware.py`)
- [x] Config generator (`scripts/generate-config.py`)
- [x] Klippain board importer (`scripts/import-klippain-boards.py`)
- [x] Moonraker update manager integration

### Wizard Features
- [x] KIAUH-style text menu interface
- [x] Printer profile loading (P key)
- [x] Board selection with port count validation
- [x] Toolboard selection
- [x] Kinematics selection (CoreXY, CoreXY AWD, Cartesian, CoreXZ)
- [x] Z stepper count (1-4) with auto leveling method
- [x] Per-axis stepper driver selection
- [x] Extruder conditional on toolboard (smart port calculation)
- [x] State persistence between sessions

### Leveling Methods (Auto-configured)
- [x] 1 Z motor: No leveling
- [x] 2 Z motors: Bed Tilt
- [x] 3 Z motors: Z Tilt Adjust
- [x] 4 Z motors: Quad Gantry Level (QGL)

---

## 📦 Templates

### Main Boards (27 total)
| Board | Motors | Source |
|-------|--------|--------|
| BTT Octopus v1.0/v1.1 | 8 | Klippain |
| BTT Octopus Pro v1.1 | 8 | Klippain |
| BTT Octopus Max | 10 | Klippain |
| BTT Kraken v1.0 | 8 | Klippain |
| BTT Manta M8P v1.0/v1.1/v2.0 | 8 | Klippain |
| BTT Manta M5P v1.0 | 5 | Klippain |
| BTT Manta E3EZ v1.0 | 5 | Klippain |
| BTT SKR 2 | 5 | Klippain |
| BTT SKR 3 | 5 | Klippain |
| BTT SKR v1.4 | 5 | Klippain |
| BTT SKR Pro v1.2 | 4 | Klippain |
| BTT SKR Mini E3 v2 | 4 | Klippain |
| BTT SKR Mini E3 v3 | 4 | Klippain |
| BTT SKR Pico v1.0 | 4 | Klippain |
| Fysetc Spider v1.x/v2.x/v3.x | 8 | Klippain |
| Fysetc S6 v2.x | 6 | Klippain |
| Fysetc Catalyst v1.x | 2 | Klippain |
| Fysetc Cheetah v3.x | 4 | Klippain |
| LDO Leviathan v1.2 | 6 | Klippain |
| Mellow Fly Gemini v3 | 4 | Klippain |
| Mellow Fly Super8 v1.x | 8 | Klippain |

### Toolhead Boards (17 total)
| Board | MCU | Connection | Source |
|-------|-----|------------|--------|
| BTT EBB36/42 v1.0 | STM32 | CAN | Klippain |
| BTT EBB36/42 v1.1 | STM32 | CAN | Klippain |
| BTT EBB36/42 v1.2 | STM32 | CAN | Klippain |
| BTT SB2209 v1.0 | STM32 | CAN | Klippain |
| BTT SB2209 RP2040 v1.0 | RP2040 | CAN | Klippain |
| BTT SB2240 v1.0 | STM32 | CAN | Klippain |
| Mellow SHT36/42 v1.x | STM32 | CAN | Klippain |
| Mellow SHT36 v2.x | STM32 | CAN | Klippain |
| Mellow SHT36 v3.x | STM32 | CAN | Klippain |
| Mellow SB2040 v1/v2 | RP2040 | CAN | Klippain |
| Mellow SB2040 Pro | RP2040 | CAN | Klippain |
| Fysetc SB Can TH v1.x | STM32 | CAN | Klippain |
| LDO Nitehawk-SB v1.0 | RP2040 | USB | Klippain |
| **LDO Nitehawk-36** | RP2040 | USB | Manual |
| **Orbitool SO3** | STM32F042 | USB | Manual |

### Printer Profiles (3 total)
| Profile | Kinematics | Z Motors | Leveling |
|---------|------------|----------|----------|
| Voron 2.4 250mm | CoreXY | 4 | QGL |
| Voron 2.4 300mm | CoreXY | 4 | QGL |
| Voron 2.4 350mm | CoreXY | 4 | QGL |

### Probes (1 total)
| Probe | Type | Source |
|-------|------|--------|
| Beacon | Eddy Current (USB) | Manual |

### Extruder Profiles (9 total)
| Extruder | Gear Ratio | Rotation Distance |
|----------|------------|-------------------|
| Sherpa Mini | 50:10 | 22.67895 |
| Orbiter v2.0 | 7.5:1 | 4.637 |
| Orbiter v2.5 | 7.5:1 | 4.637 |
| Smart Orbiter v3 | 7.5:1 | 4.69 |
| Clockwork 2 | 50:10 | 22.6789511 |
| Galileo 2 | 9:1 | 47.088 |
| LGX Lite | 44:8 | 8 |
| BMG | 50:17 | 22.6789511 |
| WW-BMG | 50:17 | 22.6789511 |

---

## 🔧 Supported Kinematics

| Kinematics | Axes | Status |
|------------|------|--------|
| CoreXY | X, Y | ✅ |
| CoreXY AWD | X, X1, Y, Y1 | ✅ |
| Cartesian | X, Y | ✅ |
| CoreXZ | X, Z | ✅ |

---

## 🧪 Beta Tester Coverage

### Neptunus (Voron 2.4 300mm)
| Component | Template | Status |
|-----------|----------|--------|
| BTT Octopus v1.0 | `btt-octopus.json` | ✅ |
| LDO Nitehawk-36 | `ldo-nitehawk-36.json` | ✅ |
| Beacon Rev H | `beacon.json` | ✅ |
| Sherpa Mini | `extruders.json` | ✅ |
| Orbiter v2.5 | `extruders.json` | ✅ |
| Voron 2.4 300mm | `voron-2.4-300.json` | ✅ |
| AWD upgrade | `corexy-awd` | ✅ |

---

## 📝 TODO / Roadmap

### High Priority
- [ ] Full wizard flow testing
- [ ] Config generation with actual pin mappings
- [ ] Installation script for printer deployment
- [ ] Macro templates (PRINT_START, PRINT_END, etc.)

### Medium Priority
- [ ] More printer profiles (Voron Trident, VzBot, Ratrig)
- [ ] More probe templates (Klicky, TAP, BLTouch)
- [ ] Input shaper configuration
- [ ] Bed mesh configuration

### Low Priority
- [ ] Web-based wizard (future)
- [ ] Config validation scripts
- [ ] Automated testing

---

## 📂 File Structure

```
gschpoozi/
├── scripts/
│   ├── configure.sh           # Main wizard
│   ├── setup-hardware.py      # Port assignment
│   ├── generate-config.py     # Config generator
│   └── import-klippain-boards.py
├── templates/
│   ├── boards/                # 27 main boards
│   ├── toolboards/            # 17 toolhead boards
│   ├── profiles/              # Printer profiles
│   ├── probes/                # Probe templates
│   └── extruders/             # Extruder profiles
├── README.md
├── PROGRESS.md                # This file
└── LICENSE                    # GPL-3.0
```

---

## 🔗 Sources & Attribution

- Board templates extracted from [Klippain](https://github.com/Frix-x/klippain) (GPL-3.0)
- Orbitool SO3 from [Orbiter-Toolboards](https://github.com/RobertLorincz/Orbiter-Toolboards)
- LDO Nitehawk-36 from [MotorDynamicsLab](https://github.com/MotorDynamicsLab/Nitehawk-36)
- Beacon probe from [beacon3d.com](https://beacon3d.com/)

