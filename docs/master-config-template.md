# Master Config Template (derived from `reference-configs/`)

This document is a **spec**, not a literal single `printer.cfg`.

It answers: *“What sections do real-world configs use, and how should gschpoozi model them?”*

The reference set lives in [`reference-configs/`](reference-configs/) and currently includes:
- Voron 2.4 (QGL / 4Z)
- Voron Trident (Z-tilt / 3Z + dual MCU)
- Voron 0.2 (CoreXY / 1Z, sensorless homing patterns)
- RatRig V-Core 3 (Z-tilt / 3Z)
- Ender 3 V2 (basic Cartesian)
- Generic SKR 3 (board pin mapping reference)
- Sample IDEX (dual_carriage)

---

## Core sections (baseline “every printer”)

These appear in nearly all reference configs and should be treated as **required** capability:

- **MCU**
  - `[mcu]`
  - Optional: additional MCUs as `[mcu toolboard]`, `[mcu xye]`, etc.
- **Printer**
  - `[printer]` with `kinematics: corexy|cartesian|…`
- **Motion**
  - `[stepper_x]`, `[stepper_y]`, `[stepper_z]`
  - Endstop strategy varies (physical endstop vs virtual endstop via probe/TMC)
- **Hotend**
  - `[extruder]` (+ optional `[tmcXXXX extruder]`)
- **Bed**
  - `[heater_bed]` (common but not universal in “board-only” reference configs)
- **Cooling**
  - `[fan]` (part cooling)
  - Optional: `[heater_fan ...]`, `[controller_fan ...]`

---

## Driver blocks (optional, but very common)

References show heavy use of TMC drivers:

- **UART** (e.g. `TMC2209`):
  - `[tmc2209 stepper_x]`, `[tmc2209 stepper_y]`, `[tmc2209 stepper_z]`, `[tmc2209 extruder]`
- **SPI** (e.g. `TMC5160`):
  - `[tmc5160 stepper_x]` etc. (present in the existing `golden-configs/` Neptunus reference)

**gschpoozi mapping**: these are generated from the `tmc_*` templates in [`schema/config-sections.yaml`](schema/config-sections.yaml).

---

## Z leveling / bed compensation (choose by hardware)

Reference configs strongly cluster by number of Z motors:

### 1Z (most common)
- Optional: `[bed_mesh]` (probe-based)
- Optional: `[bed_screws]` (manual assistance)

### 3Z (Trident / V-Core)
- `[z_tilt]`
- Additional Z steppers:
  - `[stepper_z1]`, `[stepper_z2]`
  - plus TMC driver blocks for each if applicable

### 4Z (Voron 2.4)
- `[quad_gantry_level]`
- Additional Z steppers:
  - `[stepper_z1]`, `[stepper_z2]`, `[stepper_z3]`

**gschpoozi mapping**:
- `[z_tilt]` template: `bed_leveling.leveling_type == 'z_tilt'`
- `[quad_gantry_level]` template: `bed_leveling.leveling_type == 'qgl'`
- Additional Z steppers: `stepper_z.z_motor_count >= 2` implies generation of `stepper_z1..z3` blocks.

---

## Probes (optional; drives both homing strategy and mesh strategy)

Reference set includes:
- `[probe]` (inductive / generic)
- `[bltouch]` (servo probe)

gschpoozi additionally supports eddy probes (Beacon / Cartographer / BTT Eddy) via:
- `[beacon]` and `[scanner]` (Cartographer) templates in [`schema/config-sections.yaml`](schema/config-sections.yaml)

Common related sections:
- `[safe_z_home]` (probe-based Z homing)
- `[homing_override]` (advanced custom homing logic)

---

## Macros & UX sections (optional but common in “kit” configs)

Common macro patterns in reference configs:
- `[gcode_macro PRINT_START]`, `[gcode_macro PRINT_END]`
- `[pause_resume]`, `CANCEL_PRINT`, `PAUSE`, `RESUME`
- Kit-specific helper macros (e.g. `G32` for “home+level”)

Common status / print UX:
- `[display_status]`
- `[virtual_sdcard]`
- `[idle_timeout]`

**gschpoozi mapping**: macros are emitted via `gschpoozi/macros.cfg` and `gschpoozi/macros-config.cfg`.

---

## Advanced / out-of-scope (present in reference set, not yet “generator parity”)

These appear in `reference-configs/` but are not currently modeled 1:1 by gschpoozi’s generator:

- **IDEX / dual carriage**
  - `[dual_carriage]`, `extruder1`, tool-change macros (`T0`, `T1`)
- **Board pin reference blocks**
  - `[board_pins]` (documentation/pin mapping, not a runnable config feature)

The analyzer + regression harness will treat these as **known-but-unsupported** unless/until we implement them.

---

## How we will use this spec

1. Convert the reference configs into a **section/key matrix** (see [`docs/reference-config-matrix.md`](docs/reference-config-matrix.md)).
2. Keep an explicit “known sections” mapping (supported / ignored / unsupported).
3. Add tests so when a new reference config is added, we must classify any new section it introduces.

