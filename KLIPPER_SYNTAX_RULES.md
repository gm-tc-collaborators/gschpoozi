# Klipper Configuration Syntax Rules

**MANDATORY REFERENCE FOR CONFIG GENERATION**

This document defines the **exact syntax rules** for generating valid Klipper configurations. These rules are NON-NEGOTIABLE. Violating them can cause hardware damage, fires, or injury.

**Golden Rule: NEVER INVENT ANYTHING. Only use pins, section names, parameters, and values documented here or in official Klipper documentation.**

---

## Table of Contents

1. [Fundamental Syntax](#1-fundamental-syntax)
2. [Pin Configuration](#2-pin-configuration)
3. [Multi-MCU Configuration](#3-multi-mcu-configuration)
4. [Section Types & Required Parameters](#4-section-types--required-parameters)
5. [Valid Sensor Types](#5-valid-sensor-types)
6. [TMC Driver Configuration](#6-tmc-driver-configuration)
7. [Probe Configuration](#7-probe-configuration)
8. [Fan Configuration](#8-fan-configuration)
9. [G-Code Macros & Jinja2](#9-g-code-macros--jinja2)
10. [Section Ordering](#10-section-ordering)
11. [Safety Limits](#11-safety-limits)
12. [Common Mistakes](#12-common-mistakes)

---

## 1. Fundamental Syntax

### 1.1 Parameter Separator: COLON ONLY

```ini
# CORRECT
step_pin: PE9
microsteps: 16
rotation_distance: 40.0

# WRONG - WILL BREAK KLIPPER
step_pin = PE9
microsteps = 16
```

### 1.2 Section Headers

```ini
# CORRECT - lowercase, underscores, brackets
[stepper_x]
[extruder]
[heater_bed]
[heater_fan hotend_fan]
[gcode_macro START_PRINT]

# WRONG - will fail or cause undefined behavior
[Stepper_X]          # No uppercase
[EXTRUDER]           # No uppercase
[heater-bed]         # No hyphens
```

### 1.3 Value Types

| Type | Correct | Wrong |
|------|---------|-------|
| Integer | `microsteps: 16` | `microsteps: 16.0` |
| Float | `rotation_distance: 40.0` | (actually accepts both) |
| Pin | `step_pin: PE9` | `step_pin: "PE9"` |
| Boolean | Use 0/1 or omit | `true`/`false` not supported |
| String | `serial: /dev/ttyUSB0` | Usually unquoted |

### 1.4 Comments

```ini
# Full line comment - CORRECT
step_pin: PE9  # Inline comment - allowed but discouraged

; This is NOT a valid comment format in Klipper
```

### 1.5 Multi-line Values (gcode, pins)

Multi-line values MUST be indented with spaces or tabs:

```ini
[gcode_macro EXAMPLE]
gcode:
    G28           # Indented - part of gcode
    G1 X100       # Indented - part of gcode
    M400          # Indented - part of gcode

[multi_pin example]
pins:
    PA8,
    PD12
```

---

## 2. Pin Configuration

### 2.1 Valid Pin Name Format

Klipper uses **hardware pin names**, NOT Arduino-style numbering.

```ini
# CORRECT - STM32 style pin names
PA0, PA1, PA2, ... PA15
PB0, PB1, PB2, ... PB15
PC0, PC1, ... PF15
# etc.

# WRONG - Arduino style
D0, D1, A0, A1, GPIO0, PIN_23
```

### 2.2 Pin Modifiers

Modifiers go **BEFORE** the pin name, in this order: `^` or `~` first, then `!`

| Modifier | Meaning | Example | Use Case |
|----------|---------|---------|----------|
| `!` | Invert (active low) | `!PA4` | Enable pins (usually active low) |
| `^` | Pull-up resistor | `^PA4` | Endstops, switches |
| `~` | Pull-down resistor | `~PA4` | Rarely used |
| `^!` | Pull-up AND invert | `^!PA4` | Endstops with NC switches |

```ini
# CORRECT modifier placement
enable_pin: !PF2          # Active low enable
endstop_pin: ^PA1         # Pull-up on endstop
endstop_pin: ^!PA1        # Pull-up AND inverted (NC switch)
sensor_pin: ~PB0          # Pull-down (rare)

# WRONG - modifiers after pin name
enable_pin: PF2!          # WRONG ORDER
endstop_pin: PA1^         # WRONG ORDER
endstop_pin: !^PA1        # WRONG - ^ must come before !
```

### 2.3 Special Pin Values

```ini
# Virtual endstop (for sensorless homing or probe-as-z-endstop)
endstop_pin: tmc2209_stepper_x:virtual_endstop
endstop_pin: probe:z_virtual_endstop

# Multi-pin reference (MUST define [multi_pin] section first)
pin: multi_pin:my_fan_pins

# No pin (disable feature)
# Simply omit the parameter or comment it out
```

---

## 3. Multi-MCU Configuration

### 3.1 MCU Section Names

```ini
# Primary MCU - no suffix needed
[mcu]
serial: /dev/serial/by-id/usb-Klipper_stm32f446xx_XXXXX

# Secondary MCUs - MUST have name after space
[mcu toolhead]
serial: /dev/serial/by-id/usb-Klipper_stm32g0b1xx_XXXXX

[mcu EBBCan]
canbus_uuid: abcdef123456

# WRONG
[mcu_toolhead]     # Underscore instead of space
[MCU toolhead]     # Uppercase
```

### 3.2 Multi-MCU Pin References

When referencing pins on secondary MCUs, prefix with `mcuname:`

```ini
# Pins on PRIMARY MCU (no prefix)
[stepper_x]
step_pin: PE9
dir_pin: PF1
enable_pin: !PF2

# Pins on SECONDARY MCU (with prefix)
[extruder]
step_pin: toolhead:PD0        # Pin PD0 on 'toolhead' MCU
dir_pin: toolhead:PD1
enable_pin: !toolhead:PD2
heater_pin: toolhead:PB13
sensor_pin: toolhead:PA3

# WRONG formats
step_pin: PD0@toolhead        # Wrong separator
step_pin: toolhead.PD0        # Wrong separator
step_pin: TOOLHEAD:PD0        # Case must match [mcu toolhead]
```

### 3.3 MCU Connection Types

```ini
# USB Serial
[mcu]
serial: /dev/serial/by-id/usb-Klipper_stm32f446xx_XXXX-if00

# CAN Bus
[mcu toolhead]
canbus_uuid: abcdef123456
canbus_interface: can0

# UART (rare, for older boards)
[mcu]
serial: /dev/ttyAMA0
baud: 250000
```

---

## 4. Section Types & Required Parameters

### 4.1 [mcu] - Microcontroller

```ini
# USB Serial
[mcu]
serial: /dev/serial/by-id/usb-Klipper_stm32f446xx_XXXX   # REQUIRED

# OR CAN Bus
[mcu toolhead]
canbus_uuid: abcdef123456   # REQUIRED for CAN
```

### 4.2 [printer] - Kinematics

```ini
[printer]
kinematics: corexy          # REQUIRED: cartesian, corexy, corexz, delta, etc.
max_velocity: 500           # REQUIRED (mm/s)
max_accel: 10000            # REQUIRED (mm/s^2)
max_z_velocity: 30          # Optional but recommended
max_z_accel: 350            # Optional but recommended
```

Valid kinematics values:
- `cartesian`
- `corexy`
- `corexz`
- `delta`
- `deltesian`
- `polar`
- `winch`
- `hybrid_corexy`
- `hybrid_corexz`

### 4.3 [stepper_x/y/z] - Motion Steppers

```ini
[stepper_x]
step_pin: PE9               # REQUIRED
dir_pin: PF1                # REQUIRED
enable_pin: !PF2            # REQUIRED (usually inverted)
rotation_distance: 40       # REQUIRED (mm per full rotation)
microsteps: 16              # REQUIRED (16, 32, 64, etc.)
endstop_pin: ^PG6           # REQUIRED
position_endstop: 0         # REQUIRED
position_max: 350           # REQUIRED

# Optional but common
position_min: 0
homing_speed: 50
second_homing_speed: 10
homing_retract_dist: 5
homing_positive_dir: false
```

### 4.4 [extruder] - Extruder

```ini
[extruder]
step_pin: PE2               # REQUIRED
dir_pin: PE3                # REQUIRED
enable_pin: !PD4            # REQUIRED
rotation_distance: 22.67    # REQUIRED (calibrate for your extruder)
microsteps: 32              # REQUIRED
nozzle_diameter: 0.4        # REQUIRED
filament_diameter: 1.75     # REQUIRED
heater_pin: PA2             # REQUIRED
sensor_type: Generic 3950   # REQUIRED (see valid types below)
sensor_pin: PF4             # REQUIRED
control: pid                # REQUIRED: pid or watermark
pid_Kp: 26.213              # REQUIRED for pid control
pid_Ki: 1.304               # REQUIRED for pid control
pid_Kd: 131.721             # REQUIRED for pid control
min_temp: 0                 # REQUIRED (NEVER below 0)
max_temp: 300               # REQUIRED

# Optional but common
gear_ratio: 50:10           # For geared extruders
full_steps_per_rotation: 200
max_extrude_only_distance: 100
pressure_advance: 0.04
min_extrude_temp: 170
```

### 4.5 [heater_bed] - Heated Bed

```ini
[heater_bed]
heater_pin: PA1             # REQUIRED
sensor_type: Generic 3950   # REQUIRED
sensor_pin: PF3             # REQUIRED
control: pid                # REQUIRED
pid_Kp: 54.027              # REQUIRED for pid
pid_Ki: 0.770               # REQUIRED for pid
pid_Kd: 948.182             # REQUIRED for pid
min_temp: 0                 # REQUIRED
max_temp: 120               # REQUIRED
```

### 4.6 [fan] - Part Cooling Fan

```ini
[fan]
pin: PA8                    # REQUIRED

# Optional
max_power: 1.0
kick_start_time: 0.5
off_below: 0.10
cycle_time: 0.010
```

### 4.7 [heater_fan] - Hotend Cooling Fan

```ini
[heater_fan hotend_fan]     # Name after space is required
pin: PE5                    # REQUIRED
heater: extruder            # REQUIRED

# Optional
heater_temp: 50.0
fan_speed: 1.0
```

### 4.8 [controller_fan] - Electronics Fan

```ini
[controller_fan electronics_fan]
pin: PD15                   # REQUIRED

# Optional
stepper: stepper_x, stepper_y, stepper_z
heater: heater_bed, extruder
idle_timeout: 60
idle_speed: 0.5
```

### 4.9 [temperature_sensor] - Temperature Monitoring

```ini
[temperature_sensor chamber]
sensor_type: Generic 3950   # REQUIRED
sensor_pin: PA5             # REQUIRED for thermistors

# Built-in MCU sensor
[temperature_sensor mcu]
sensor_type: temperature_mcu

# Host (Raspberry Pi) sensor
[temperature_sensor raspberry_pi]
sensor_type: temperature_host
```

### 4.10 [bed_mesh] - Bed Leveling

```ini
[bed_mesh]
speed: 300
horizontal_move_z: 5
mesh_min: 30, 30            # REQUIRED
mesh_max: 320, 320          # REQUIRED
probe_count: 5, 5
algorithm: bicubic
```

### 4.11 [safe_z_home] - Safe Homing

```ini
[safe_z_home]
home_xy_position: 175, 175  # REQUIRED (center of bed typically)
z_hop: 10
z_hop_speed: 5
```

### 4.12 [quad_gantry_level] / [z_tilt] - Gantry Leveling

```ini
[quad_gantry_level]
gantry_corners:             # REQUIRED
    -60,-10
    410,420
points:                     # REQUIRED
    50,25
    50,275
    300,275
    300,25
speed: 300
horizontal_move_z: 10
retries: 5
retry_tolerance: 0.0075
```

```ini
[z_tilt]
z_positions:                # REQUIRED
    -50, 150
    400, 150
points:                     # REQUIRED
    30, 150
    270, 150
speed: 200
horizontal_move_z: 10
retries: 5
retry_tolerance: 0.0075
```

---

## 5. Valid Sensor Types

### 5.1 Built-in Thermistors

These are the EXACT strings to use for `sensor_type`:

```ini
sensor_type: Generic 3950
sensor_type: ATC Semitec 104GT-2
sensor_type: ATC Semitec 104NT-4-R025H42G
sensor_type: EPCOS 100K B57560G104F
sensor_type: Honeywell 100K 135-104LAG-J01
sensor_type: NTC 100K MGB18-104F39050L32
sensor_type: SliceEngineering 450
sensor_type: TDK NTCG104LH104JT1
```

### 5.2 RTD Sensors (PT100/PT1000)

```ini
# PT100 via MAX31865
sensor_type: PT100 ITS90
spi_bus: spi1
cs_pin: PA4
rtd_nominal_r: 100
rtd_reference_r: 430
rtd_num_of_wires: 2

# PT1000 via MAX31865
sensor_type: PT1000
spi_bus: spi1
cs_pin: PA4
rtd_nominal_r: 1000
rtd_reference_r: 4300
rtd_num_of_wires: 2
```

### 5.3 Thermocouple Sensors

```ini
# Type K via MAX31855
sensor_type: MAX31855
spi_bus: spi1
cs_pin: PA4

# Any type via MAX31856
sensor_type: MAX31856
spi_bus: spi1
cs_pin: PA4
tc_type: K              # K, J, N, R, S, T, E, or B
```

### 5.4 Special Sensor Types

```ini
# MCU internal temperature
sensor_type: temperature_mcu

# Host (Raspberry Pi) temperature
sensor_type: temperature_host
```

---

## 6. TMC Driver Configuration

### 6.1 TMC2209 (UART)

```ini
[tmc2209 stepper_x]         # Section name format: tmc2209 stepper_name
uart_pin: PC4               # REQUIRED

# Common optional parameters
run_current: 0.8            # Amps (check motor specs)
stealthchop_threshold: 999999
interpolate: true

# Sensorless homing
diag_pin: ^PG6
driver_SGTHRS: 100          # 0-255, higher = more sensitive
```

### 6.2 TMC2240 (SPI or UART)

```ini
# SPI mode
[tmc2240 stepper_x]
cs_pin: PC4                 # REQUIRED for SPI
spi_bus: spi1               # REQUIRED for SPI
run_current: 0.8

# OR UART mode
[tmc2240 stepper_x]
uart_pin: PC4               # REQUIRED for UART
run_current: 0.8

# Sensorless homing
diag0_pin: ^!PG6
driver_SGT: 1               # -64 to 63
```

### 6.3 TMC5160 (SPI)

```ini
[tmc5160 stepper_x]
cs_pin: PC4                 # REQUIRED
spi_bus: spi1               # REQUIRED
run_current: 1.0

# Sensorless homing
diag1_pin: ^!PG6
driver_SGT: 1               # -64 to 63
```

### 6.4 Valid TMC Section Names

```ini
[tmc2209 stepper_x]
[tmc2209 stepper_y]
[tmc2209 stepper_z]
[tmc2209 stepper_z1]
[tmc2209 extruder]
[tmc2209 extruder1]

# WRONG
[tmc2209_stepper_x]         # Underscore instead of space
[TMC2209 stepper_x]         # Uppercase
```

---

## 7. Probe Configuration

### 7.1 [probe] - Generic Inductive/Capacitive Probe

```ini
[probe]
pin: ^PB7                   # REQUIRED (usually needs pull-up)
x_offset: 0                 # REQUIRED
y_offset: 25                # REQUIRED
z_offset: 0                 # REQUIRED (calibrate with PROBE_CALIBRATE)
speed: 5
samples: 2
sample_retract_dist: 2.0
samples_result: median
samples_tolerance: 0.01
samples_tolerance_retries: 3
```

### 7.2 [bltouch] - BLTouch/3DTouch Probe

```ini
[bltouch]
sensor_pin: ^PB7            # REQUIRED (usually needs pull-up)
control_pin: PB6            # REQUIRED
x_offset: 0
y_offset: 25
z_offset: 0                 # Calibrate with PROBE_CALIBRATE
speed: 5
samples: 2
sample_retract_dist: 3.0
stow_on_each_sample: false
probe_with_touch_mode: false
```

### 7.3 [beacon] - Beacon Eddy Current Probe

```ini
[beacon]
serial: /dev/serial/by-id/usb-Beacon_Beacon_RevH_XXXXX-if00   # REQUIRED
x_offset: 0
y_offset: 25
mesh_main_direction: x
mesh_runs: 2
contact_max_hotend_temperature: 180

# With Beacon, stepper_z uses virtual endstop
[stepper_z]
endstop_pin: probe:z_virtual_endstop
homing_retract_dist: 0
```

---

## 8. Fan Configuration

### 8.1 Fan Section Types

| Section | Purpose | Required Parameters |
|---------|---------|---------------------|
| `[fan]` | Part cooling (M106/M107) | `pin` |
| `[heater_fan name]` | Hotend cooling | `pin`, `heater` |
| `[controller_fan name]` | Electronics cooling | `pin` |
| `[fan_generic name]` | Generic controllable fan | `pin` |
| `[temperature_fan name]` | Temp-controlled fan | `pin`, `sensor_type`, `target_temp` |

### 8.2 Multi-Pin Fans

```ini
# Define multi_pin FIRST
[multi_pin dual_part_fan]
pins: PA8, PD12

# Reference with multi_pin: prefix
[fan]
pin: multi_pin:dual_part_fan
```

### 8.3 Multi-MCU Fan Pins

```ini
[multi_pin dual_hotend_fan]
pins: PA8, toolhead:PA1     # Mix of main MCU and toolhead pins

[heater_fan hotend_fan]
pin: multi_pin:dual_hotend_fan
heater: extruder
```

---

## 9. G-Code Macros & Jinja2

### 9.1 Basic Structure

```ini
[gcode_macro MACRO_NAME]
description: What this macro does
gcode:
    G28                     # Commands must be indented
    G1 X100 Y100 F3000
```

### 9.2 Jinja2 Syntax

```ini
[gcode_macro PREHEAT]
gcode:
    # Variable assignment
    {% set bed_temp = params.BED|default(60)|float %}
    {% set extruder_temp = params.EXTRUDER|default(200)|float %}

    # Expression in G-code (single braces)
    M140 S{bed_temp}
    M104 S{extruder_temp}

    # Conditional
    {% if bed_temp > 80 %}
        M117 High temp bed
    {% endif %}
```

### 9.3 Parameter Access

```ini
# params.NAME - ALWAYS UPPERCASE
{% set speed = params.SPEED|default(100)|float %}
{% set count = params.COUNT|default(1)|int %}

# rawparams - unparsed string
M117 {rawparams}
```

### 9.4 Printer State Access

```ini
# Position
printer.toolhead.position.x
printer.toolhead.position.y
printer.toolhead.position.z

# Homing state
printer.toolhead.homed_axes      # "", "x", "xy", "xyz"

# Temperatures
printer.extruder.temperature
printer.extruder.target
printer.heater_bed.temperature

# Print status
printer.print_stats.state        # "standby", "printing", "paused"

# Named sections (use brackets)
printer["heater_fan hotend_fan"].speed
printer["gcode_macro MY_MACRO"].my_variable
```

### 9.5 Persistent Variables

```ini
[gcode_macro COUNTER]
variable_count: 0           # Declare with variable_ prefix

gcode:
    {% set current = printer["gcode_macro COUNTER"].count %}
    SET_GCODE_VARIABLE MACRO=COUNTER VARIABLE=count VALUE={current + 1}
```

---

## 10. Section Ordering

**CRITICAL: Sections must be defined BEFORE they are referenced.**

### 10.1 Required Order

1. `[mcu]` sections - define MCUs first
2. `[multi_pin]` sections - before fans that use them
3. `[stepper_*]` sections - before homing/leveling
4. `[extruder]` / `[heater_bed]` - before verify_heater
5. `[verify_heater]` sections - after heaters
6. `[probe]` / `[bltouch]` - before bed_mesh
7. `[bed_mesh]` / leveling sections
8. `[gcode_macro]` sections - typically last

### 10.2 Include Order

```ini
# printer.cfg
[include gschpoozi/mcu.cfg]           # MCUs first
[include gschpoozi/steppers.cfg]      # Motion
[include gschpoozi/extruder.cfg]      # Heating
[include gschpoozi/fans.cfg]          # Fans
[include gschpoozi/probe.cfg]         # Probing
[include gschpoozi/macros.cfg]        # Macros last
```

---

## 11. Safety Limits

### 11.1 Temperature Limits

```ini
# EXTRUDER
min_temp: 0                 # NEVER below 0 (disables sensor check!)
max_temp: 300               # All-metal hotend max
max_temp: 260               # PTFE-lined hotend max (PTFE degrades >260)

# HEATED BED
min_temp: 0
max_temp: 120               # Typical safe max

# CHAMBER
max_temp: 80                # Typical safe max
```

### 11.2 Movement Limits

```ini
position_max: 350           # NEVER exceed physical travel
position_min: 0             # Or negative if using offset homing
homing_retract_dist: 5      # Safety retract after endstop
```

### 11.3 Required Safety Sections

```ini
[verify_heater extruder]
max_error: 120
check_gain_time: 60
heating_gain: 2

[verify_heater heater_bed]
max_error: 120
check_gain_time: 90
heating_gain: 1
```

---

## 12. Common Mistakes

### 12.1 Syntax Errors

| Wrong | Correct | Issue |
|-------|---------|-------|
| `step_pin = PE9` | `step_pin: PE9` | Use colon, not equals |
| `PA4!` | `!PA4` | Modifier before pin |
| `PA4^` | `^PA4` | Modifier before pin |
| `!^PA4` | `^!PA4` | Pull-up before invert |
| `[Stepper_X]` | `[stepper_x]` | Lowercase only |
| `toolhead.PA1` | `toolhead:PA1` | Colon for MCU prefix |
| `multi_pin.name` | `multi_pin:name` | Colon for multi_pin |

### 12.2 Missing Dependencies

| Error | Cause | Fix |
|-------|-------|-----|
| `Unknown pin chip name 'multi_pin'` | multi_pin defined after use | Move [multi_pin] earlier |
| `Unknown pin chip name 'toolhead'` | MCU not defined | Add [mcu toolhead] section |
| `Unknown heater 'extruder'` | verify_heater before extruder | Move [extruder] earlier |

### 12.3 Invalid Values

| Wrong | Why | Correct |
|-------|-----|---------|
| `sensor_type: NTC 3950` | Not exact name | `sensor_type: Generic 3950` |
| `min_temp: -10` | Disables safety | `min_temp: 0` |
| `kinematics: CoreXY` | Case sensitive | `kinematics: corexy` |

### 12.4 Pin Conflicts

**NEVER assign the same pin to multiple functions.**

```ini
# WRONG - PA8 used twice
[fan]
pin: PA8

[heater_fan hotend]
pin: PA8          # CONFLICT!
```

---

## Quick Reference Card

| Category | Correct | Wrong |
|----------|---------|-------|
| Parameter | `key: value` | `key = value` |
| Pin invert | `!PA4` | `PA4!` |
| Pin pullup | `^PA4` | `PA4^` |
| Combined | `^!PA4` | `!^PA4` |
| Multi-MCU | `toolhead:PA1` | `PA1@toolhead` |
| Section | `[stepper_x]` | `[Stepper_X]` |
| Named section | `[heater_fan fan1]` | `[heater_fan_fan1]` |
| Multi-pin ref | `multi_pin:name` | `multi_pin.name` |
| Jinja2 expr | `{variable}` | `${variable}` |
| Jinja2 stmt | `{% if x %}` | `{ if x }` |
| TMC section | `[tmc2209 stepper_x]` | `[tmc2209_stepper_x]` |

---

## Sources & Verification

Always verify against official documentation:
- [Klipper Config Reference](https://www.klipper3d.org/Config_Reference.html)
- [Klipper Command Templates](https://www.klipper3d.org/Command_Templates.html)
- [Klipper Status Reference](https://www.klipper3d.org/Status_Reference.html)
- [TMC Drivers](https://www.klipper3d.org/TMC_Drivers.html)

**NEVER invent pins, section names, or parameter names. If unsure, check the official documentation or the board template JSON files.**
