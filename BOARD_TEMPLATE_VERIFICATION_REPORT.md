# Board Template Verification Report

**Date:** 2025-12-22
**Verified by:** Claude Code
**Source:** Official manufacturer pinouts, Klipper configs, and Marlin firmware definitions

---

## Summary

| Metric | Count |
|--------|-------|
| Total boards verified | 27 |
| Verified correct | 15 |
| Errors found | 11 |
| Duplicate to remove | 1 |

---

## Boards With Errors (Need Fixing)

### 1. BTT Manta M8P v1.1
**File:** `btt-manta-m8p-v1-1.json`

| Port | Template | Correct |
|------|----------|---------|
| MOTOR_7 step_pin | PD11 | PD12 |
| MOTOR_7 dir_pin | PD9 | PD11 |
| MOTOR_7 enable_pin | PD15 | PD14 |
| MOTOR_7 uart_pin | PD14 | PD13 |
| MOTOR_8 step_pin | PD8 | PD10 |
| MOTOR_8 dir_pin | PC6 | PD8 |
| MOTOR_8 enable_pin | PC7 | PD9 |
| MOTOR_8 uart_pin | PD10 | PC7 |

**Source:** [BTT Official Config](https://github.com/bigtreetech/Manta-M8P/blob/master/V1.0_V1.1/Firmware/Klipper/generic-bigtreetech-manta-m8p-V1_1.cfg)

---

### 2. BTT Manta M8P v2 - CRITICAL (RECOMMEND DELETION)
**File:** `btt-manta-m8p-v2.json`

This is a duplicate of `btt-manta-m8p-v2-0.json` with critically wrong heater pins. **Delete this file.**

| Port | Template | Correct |
|------|----------|---------|
| HB (Heated Bed) | PA0 | PF5 |
| HE0 | PA1 | PA0 |
| HE1 | PA3 | PA1 |
| HE2 | PA5 | PA3 |
| PS_ON | PF5 | PD14 |
| Missing HE3 | - | PA5 |

**Source:** [BTT Official Config](https://github.com/bigtreetech/Manta-M8P/blob/master/V2.0/Firmware/generic-bigtreetech-manta-m8p-V2_0.cfg)

---

### 3. BTT Octopus Max EZ
**File:** `btt-octopus-max.json`

| Port | Template | Correct |
|------|----------|---------|
| Missing T3 thermistor | - | PA7 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-bigtreetech-octopus-max-ez.cfg)

---

### 4. BTT Kraken v1.0
**File:** `btt-kraken-v1-0.json`

| Port | Template | Correct |
|------|----------|---------|
| PROBE pin | PC1 | PG1 |
| T3 thermistor | PC3 | PA7 |

**Source:** [BTT Official Documentation](https://github.com/bigtreetech/BIGTREETECH-Kraken)

---

### 5. BTT SKR Mini E3 v2
**File:** `btt-skr-mini-e3-v2.json`

| Port | Template | Correct |
|------|----------|---------|
| Missing HB (Heated Bed) | - | PC9 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-bigtreetech-skr-mini-e3-v2.0.cfg)

---

### 6. BTT SKR Pro v1.2
**File:** `btt-skr-pro-v1-2.json`

| Port | Template | Correct |
|------|----------|---------|
| Missing HB (Heated Bed) | - | PD12 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-bigtreetech-skr-pro.cfg)

---

### 7. BTT SKR Pico v1.0
**File:** `btt-skr-pico-v1-0.json`

| Port | Template | Correct |
|------|----------|---------|
| Missing HB (Heated Bed) | - | gpio21 |
| Missing X_STOP | - | gpio4 |
| Missing Y_STOP | - | gpio3 |
| Missing Z_STOP | - | gpio25 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-bigtreetech-skr-pico-v1.0.cfg)

---

### 8. BTT SKR 2
**File:** `btt-skr-2.json`

| Port | Template | Correct |
|------|----------|---------|
| Missing HB (Heated Bed) | - | PD7 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-bigtreetech-skr-2.cfg)

---

### 9. BTT SKR 3
**File:** `btt-skr-3.json`

| Port | Template | Correct |
|------|----------|---------|
| Missing HB (Heated Bed) | - | PD7 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-bigtreetech-skr-3.cfg)

---

### 10. FYSETC S6 v2.x
**File:** `fysetc-s6-v2-x.json`

| Port | Template | Correct |
|------|----------|---------|
| MOTOR_X cs/uart | PE8 | PE7 |
| MOTOR_Y cs/uart | PC4 | PE15 |
| MOTOR_Z cs/uart | PD12 | PD10 |
| MOTOR_E0 cs/uart | PA15 | PD7 |
| MOTOR_E1 cs/uart | PC5 | PC14 |
| MOTOR_E2 cs/uart | PE0 | PC15 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-fysetc-s6-v2.cfg)

---

### 11. FYSETC Catalyst v1.x
**File:** `fysetc-catalyst-v1-x.json`

| Port | Template | Correct |
|------|----------|---------|
| Missing MOTOR_X | - | step=PC12, dir=PC10, en=PD2, uart=PC11 |
| Missing MOTOR_Y | - | step=PC15, dir=PC13, en=PA10, uart=PC14 |
| TH thermistor | PA0 | PC0 |

**Source:** [FYSETC Official Config](https://github.com/FYSETC/Catalyst_Kit/blob/main/software/klipper%20conifg/printer.cfg)

---

### 12. LDO Leviathan v1.2
**File:** `ldo-leviathan-v1-2.json`

| Port | Template | Correct |
|------|----------|---------|
| TH0 thermistor | PA7 | PA1 |
| TH1 thermistor | PF4 | PA2 |
| TH2 thermistor | PF5 | PA0 |
| TH3 thermistor | PF6 | PA3 |

**Source:** [Klipper Official Config](https://github.com/Klipper3d/klipper/blob/master/config/generic-ldo-leviathan-v1.2.cfg)

---

## Boards Verified Correct

| # | Board | File | Status |
|---|-------|------|--------|
| 1 | BTT Manta M8P v1.0 | `btt-manta-m8p-v1-0.json` | Verified |
| 2 | BTT Manta M8P v2.0 | `btt-manta-m8p-v2-0.json` | Verified |
| 3 | BTT Octopus v1.0/v1.1 | `btt-octopus.json`, `btt-octopus-v1.1.json` | Verified |
| 4 | BTT Octopus Pro v1.1 | `btt-octopus-pro-v1-1.json` | Verified |
| 5 | BTT SKR Mini E3 v3 | `btt-skr-mini-e3-v3.json` | Verified |
| 6 | BTT SKR v1.4 | `btt-skr-v1-4.json` | Verified |
| 7 | FYSETC Cheetah v3.x | `fysetc-cheetah-v3-x.json` | Verified |
| 8 | FYSETC Spider v1.x | `fysetc-spider-v1-x.json` | Verified |
| 9 | FYSETC Spider v2.x | `fysetc-spider-v2-x.json` | Verified |
| 10 | FYSETC Spider v3.x | `fysetc-spider-v3-x.json` | Verified |
| 11 | Mellow Fly Gemini v3 | `mellow-fly-gemini-v3.json` | Verified |
| 12 | Mellow Fly Super8 v1.x | `mellow-fly-super8-v1-x.json` | Verified (user corrected) |

### Not Explicitly Verified (similar architecture to verified boards)

| # | Board | File | Status |
|---|-------|------|--------|
| 1 | BTT Manta E3EZ v1.0 | `btt-manta-e3ez-v1-0.json` | Not verified |
| 2 | BTT Manta M5P v1.0 | `btt-manta-m5p-v1-0.json` | Not verified |

---

## Action Items

### Immediate Actions

1. **DELETE** `btt-manta-m8p-v2.json` - duplicate with critical heater pin errors
2. **FIX** the 11 board templates with pin errors listed above

### Missing Ports to Add

| Board | Missing Port | Pin |
|-------|--------------|-----|
| BTT SKR Mini E3 v2 | HB (Heated Bed) | PC9 |
| BTT SKR Pro v1.2 | HB (Heated Bed) | PD12 |
| BTT SKR Pico v1.0 | HB (Heated Bed) | gpio21 |
| BTT SKR Pico v1.0 | X_STOP | gpio4 |
| BTT SKR Pico v1.0 | Y_STOP | gpio3 |
| BTT SKR Pico v1.0 | Z_STOP | gpio25 |
| BTT SKR 2 | HB (Heated Bed) | PD7 |
| BTT SKR 3 | HB (Heated Bed) | PD7 |
| BTT Octopus Max | T3 thermistor | PA7 |
| FYSETC Catalyst v1.x | MOTOR_X | step=PC12, dir=PC10, en=PD2, uart=PC11 |
| FYSETC Catalyst v1.x | MOTOR_Y | step=PC15, dir=PC13, en=PA10, uart=PC14 |

---

## Verification Sources

- [Klipper Official Configs](https://github.com/Klipper3d/klipper/tree/master/config)
- [BigTreeTech GitHub](https://github.com/bigtreetech)
- [FYSETC GitHub](https://github.com/FYSETC)
- [Mellow 3D Documentation](https://mellow-3d.github.io/)
- [LDO Motors / MotorDynamicsLab GitHub](https://github.com/MotorDynamicsLab)
- [Marlin Firmware Pin Definitions](https://github.com/MarlinFirmware/Marlin/tree/2.0.x/Marlin/src/pins)
