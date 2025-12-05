# BTT Octopus v1.1

BigTreeTech Octopus v1.1 - 8 driver slots, STM32F446 MCU

## Board Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BTT OCTOPUS v1.1                                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ MOTOR_0  MOTOR_1  MOTOR_2.1 MOTOR_2.2 MOTOR_3  MOTOR_4  MOTOR_5 │   │
│  │   (X)      (Y)      (Z)      (Z1)      (Z2)     (Z3)     (E0)   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  HEATERS: HB (10A bed) | HE0 | HE1 | HE2 | HE3                         │
│  FANS:    FAN0 | FAN1 | FAN2 | FAN3 | FAN4 | FAN5                      │
│  TEMPS:   TB (bed) | T0 | T1 | T2 | T3                                 │
│  STOPS:   STOP_0 (X) | STOP_1 (Y) | STOP_2 (Z) | ... | STOP_7          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Motor Ports (Stepper Drivers)

| Port | Typical Use | Step Pin | Dir Pin | Enable Pin | UART/CS | Diag |
|------|-------------|----------|---------|------------|---------|------|
| MOTOR_0 | X Axis | PF13 | PF12 | PF14 | PC4 | PG6 |
| MOTOR_1 | Y Axis | PG0 | PG1 | PF15 | PD11 | PG9 |
| MOTOR_2_1 | Z Axis | PF11 | PG3 | PG5 | PC6 | PG10 |
| MOTOR_2_2 | Z1 Axis | PG4 | PC1 | PA0 | PC7 | PG11 |
| MOTOR_3 | Z2 Axis | PF9 | PF10 | PG2 | PF2 | PG12 |
| MOTOR_4 | Z3/E0 | PC13 | PF0 | PF1 | PE4 | PG13 |
| MOTOR_5 | E0/E1 | PE2 | PE3 | PD4 | PE1 | PG14 |
| MOTOR_6 | E1 | PE6 | PA14 | PE0 | PD3 | PG15 |

**Notes:**
- All drivers support both UART (TMC2208/2209) and SPI (TMC2240/5160)
- For sensorless homing, use the DIAG pins
- MOTOR_7 shares pins with MOTOR_6 (active when ACTIVE_LOW jumper set)

## Heater Ports

| Port | Label | Pin | Max Current | Notes |
|------|-------|-----|-------------|-------|
| HB | Heated Bed | PA1 | 10A | Use for heated bed only |
| HE0 | Heater 0 | PA2 | 5A | Primary hotend |
| HE1 | Heater 1 | PA3 | 5A | Second hotend or chamber |
| HE2 | Heater 2 | PB10 | 5A | |
| HE3 | Heater 3 | PB11 | 5A | |

**Warning:** Do not exceed current ratings! HB is the only port rated for typical heated beds.

## Fan Ports

| Port | Label | Pin | PWM | Notes |
|------|-------|-----|-----|-------|
| FAN0 | Part Cooling | PA8 | Yes | Voltage selectable (5V/12V/24V) |
| FAN1 | Hotend Fan | PE5 | Yes | Voltage selectable |
| FAN2 | Fan 2 | PD12 | Yes | Good for controller fan |
| FAN3 | Fan 3 | PD13 | Yes | |
| FAN4 | Fan 4 | PD14 | Yes | |
| FAN5 | Fan 5 | PD15 | Yes | |

**Jumper Settings:** Set voltage jumpers per-fan (VIN = 24V, 12V, or 5V)

## Thermistor Ports

| Port | Label | Pin | Notes |
|------|-------|-----|-------|
| TB | Bed Thermistor | PF3 | 4.7k pullup |
| T0 | Thermistor 0 | PF4 | Primary hotend |
| T1 | Thermistor 1 | PF5 | Second hotend |
| T2 | Thermistor 2 | PF6 | Chamber temp |
| T3 | Thermistor 3 | PF7 | |

## Endstop Ports

| Port | Label | Pin | Notes |
|------|-------|-----|-------|
| STOP_0 | X Endstop | PG6 | Directly wired to MOTOR_0 DIAG |
| STOP_1 | Y Endstop | PG9 | Directly wired to MOTOR_1 DIAG |
| STOP_2 | Z Endstop | PG10 | Directly wired to MOTOR_2_1 DIAG |
| STOP_3 | Extra | PG11 | |
| STOP_4 | Extra | PG12 | |
| STOP_5 | Extra | PG13 | |
| STOP_6 | Extra | PG14 | |
| STOP_7 | Extra | PG15 | |

**Sensorless Homing:** STOP_0-2 share pins with driver DIAG outputs

## Probe Port

| Signal | Pin | Notes |
|--------|-----|-------|
| Probe Signal | PB7 | For inductive probe or BLTouch signal |
| Servo/BLTouch | PB6 | PWM output for BLTouch deploy/retract |

## Other Ports

| Function | Pin | Notes |
|----------|-----|-------|
| NeoPixel | PB0 | WS2812 LED strip |
| Filament Sensor | PG11 | Same as STOP_3 |
| Power Detection | PC0 | 24V input for power loss |
| PS_ON | PE11 | ATX power supply control |

## MCU Information

- **MCU:** STM32F446ZET6
- **Clock:** 180MHz
- **Flash via USB:**
  ```
  make menuconfig
  # Select: STM32F446, 32KiB bootloader, USB (on PA11/PA12)
  make
  make flash FLASH_DEVICE=/dev/serial/by-id/usb-Klipper_stm32f446xx_*
  ```

## Common Configurations

### Voron 2.4 / Trident (Quad Z)
- X: MOTOR_0
- Y: MOTOR_1
- Z: MOTOR_2_1
- Z1: MOTOR_2_2
- Z2: MOTOR_3
- Z3: MOTOR_4
- E: MOTOR_5

### VzBot / Switchwire (Single or Triple Z)
- X: MOTOR_0
- Y: MOTOR_1
- Z: MOTOR_2_1 (and Z1, Z2 if triple)
- E: MOTOR_4 or MOTOR_5

## Links

- [BTT GitHub - Octopus](https://github.com/bigtreetech/BIGTREETECH-OCTOPUS-V1.0)
- [Pinout Diagram (PDF)](https://github.com/bigtreetech/BIGTREETECH-OCTOPUS-V1.0/blob/master/Hardware/BIGTREETECH%20Octopus%20-%20PIN.pdf)

