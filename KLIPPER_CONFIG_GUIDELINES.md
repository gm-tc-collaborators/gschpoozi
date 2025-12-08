# Klipper Configuration Guidelines

This document provides comprehensive guidelines for generating valid Klipper configuration files. All agents working on this project **MUST** follow these rules.

**Official Reference:** [Klipper Config Reference](https://www.klipper3d.org/Config_Reference.html)

---

## Table of Contents

1. [Syntax Requirements](#syntax-requirements)
2. [Pin Configuration](#pin-configuration)
3. [Section Naming](#section-naming)
4. [Section Ordering](#section-ordering)
5. [Multi-Pin Configuration](#multi-pin-configuration)
6. [Include Directives](#include-directives)
7. [G-Code Macros & Jinja2](#g-code-macros--jinja2)
8. [Printer Object Reference](#printer-object-reference)
9. [Common Configuration Patterns](#common-configuration-patterns)
10. [Safety Rules](#safety-rules)

---

## Syntax Requirements

### Parameter Format: COLON, NOT EQUALS

Klipper uses **colon (`:`)** for ALL parameters. This is the most common mistake.

```ini
# CORRECT - Always use colon
[stepper_x]
step_pin: PE9
dir_pin: PF1
enable_pin: !PF2
microsteps: 16
rotation_distance: 40
position_max: 350

# WRONG - Will break Klipper
step_pin = PE9
microsteps = 16
```

### Indentation Rules

- Section headers `[section_name]` start at column 0
- Parameters within sections start at column 0
- Multi-line values (like `gcode:`) require indented continuation lines
- Use consistent indentation: 4 spaces OR 1 tab (don't mix)

```ini
[gcode_macro START_PRINT]
description: Prepare printer for printing
gcode:
    # Indented lines are part of the gcode block
    G28
    G1 Z10 F3000
    M117 Ready to print
```

### Comments

```ini
# Full line comment
step_pin: PE9  # Inline comment (allowed but discouraged)
```

### Value Types

| Type | Example | Notes |
|------|---------|-------|
| Integer | `microsteps: 16` | No decimals |
| Float | `rotation_distance: 40.0` | Use decimal point |
| Boolean | `full_steps_per_rotation: 200` | No true/false, use 0/1 or omit |
| String | `serial: /dev/serial/by-id/...` | Usually unquoted |
| Pin | `step_pin: PE9` | Hardware names |

---

## Pin Configuration

### Pin Naming Convention

Klipper uses **hardware pin names**, not Arduino-style numbering.

```ini
# CORRECT - Hardware names
step_pin: PA4
endstop_pin: PC7
heater_pin: PD2

# WRONG - Arduino-style (do NOT use)
step_pin: D23
endstop_pin: A14
```

### Pin Modifiers

Modifiers go **BEFORE** the pin name, can be combined:

| Modifier | Meaning | Example |
|----------|---------|---------|
| `!` | Invert polarity (active low) | `!PA4` |
| `^` | Enable internal pull-up resistor | `^PA4` |
| `~` | Enable internal pull-down resistor | `~PA4` |

```ini
# Combined modifiers (order: ^ or ~ first, then !)
enable_pin: !PF2          # Active low enable
endstop_pin: ^PA1         # Pull-up on endstop
endstop_pin: ^!PA1        # Pull-up AND inverted
sensor_pin: ~PB0          # Pull-down resistor
```

### Multi-MCU Pin References

When using multiple MCUs, prefix pins with the MCU name:

```ini
[mcu]
serial: /dev/serial/by-id/usb-main-board

[mcu toolhead]
serial: /dev/serial/by-id/usb-toolhead

[extruder]
step_pin: toolhead:PD0        # Pin on toolhead MCU
dir_pin: toolhead:PD1
heater_pin: toolhead:PB13
sensor_pin: toolhead:PA3

[stepper_x]
step_pin: PE9                  # Pin on main MCU (no prefix)
```

---

## Section Naming

### Format Rules

- Section names are **lowercase** with underscores
- Instance names (after space) can have mixed case but lowercase preferred
- Numbers must appear at the **END** of macro names

```ini
# CORRECT section naming
[stepper_x]
[stepper_y]
[extruder]
[extruder1]                           # Additional extruders
[heater_bed]
[fan]
[heater_fan hotend_fan]               # Named instance
[temperature_sensor chamber]
[filament_switch_sensor e0_sensor]
[gcode_macro START_PRINT]             # Macro names are case-insensitive
[gcode_macro MY_MACRO_25]             # Numbers at end OK

# WRONG
[Stepper_X]                           # No uppercase
[HEATER_BED]                          # No uppercase
[gcode_macro 25_MY_MACRO]             # Numbers can't be at start
```

### Common Section Types

```ini
# Motion
[stepper_x], [stepper_y], [stepper_z], [stepper_z1]
[extruder], [extruder1], [extruder2]

# Heating
[heater_bed]
[heater_generic chamber_heater]
[verify_heater extruder]

# Temperature Monitoring
[temperature_sensor mcu_temp]
[temperature_fan exhaust_fan]

# Fans
[fan]                                  # Part cooling (M106/M107)
[heater_fan hotend_fan]
[controller_fan electronics_fan]
[fan_generic aux_fan]

# Probing & Leveling
[probe], [bltouch], [beacon]
[bed_mesh]
[z_tilt], [quad_gantry_level]
[screws_tilt_adjust]

# Input/Output
[output_pin caselight]
[pwm_tool]
[servo my_servo]

# Sensors
[filament_switch_sensor runout]
[filament_motion_sensor encoder]
```

---

## Section Ordering

**CRITICAL:** Some sections create resources that other sections depend on. Define dependencies FIRST.

### Required Order

```ini
# 1. MCU definitions FIRST (creates pin namespaces)
[mcu]
serial: /dev/serial/by-id/usb-main

[mcu toolhead]
serial: /dev/serial/by-id/usb-toolhead

# 2. Multi-pin definitions BEFORE sections that use them
[multi_pin my_fan_pins]
pins: PA8, PD12

# 3. Sections that USE multi_pin come AFTER
[fan]
pin: multi_pin:my_fan_pins

# 4. Heaters before verify_heater
[extruder]
heater_pin: PA2
sensor_pin: PA3
# ...

[verify_heater extruder]
max_error: 120

# 5. Steppers before homing/leveling that references them
[stepper_z]
# ...

[stepper_z1]
# ...

[z_tilt]
z_positions: ...    # References stepper_z, stepper_z1
```

### Include Order

```ini
# printer.cfg - includes processed top-to-bottom
[include gschpoozi/mcu.cfg]           # MCU definitions first
[include gschpoozi/multi_pin.cfg]     # Multi-pin definitions
[include gschpoozi/steppers.cfg]      # Motion hardware
[include gschpoozi/extruder.cfg]      # Extruder & hotend
[include gschpoozi/fans.cfg]          # Fans (may use multi_pin)
[include gschpoozi/bed.cfg]           # Heated bed
[include gschpoozi/probe.cfg]         # Probing hardware
[include gschpoozi/homing.cfg]        # Homing behavior
[include gschpoozi/macros.cfg]        # G-code macros (last)
```

---

## Multi-Pin Configuration

The `[multi_pin]` section allows controlling multiple pins as a single logical pin. Common use: dual part cooling fans.

### Syntax

```ini
# Define the multi_pin FIRST
[multi_pin dual_part_fan]
pins: PA8, PD12

# Reference it with multi_pin: prefix
[fan]
pin: multi_pin:dual_part_fan
```

### Multi-MCU Multi-Pin

```ini
[multi_pin dual_hotend_fan]
pins: PA8, toolhead:PA1

[heater_fan hotend_fan]
pin: multi_pin:dual_hotend_fan
heater: extruder
heater_temp: 50.0
```

### Common Error

```
Unknown pin chip name 'multi_pin'
```

**Cause:** The `[multi_pin]` section is defined AFTER the section that uses it.
**Fix:** Move `[multi_pin]` section earlier in the config or include file.

---

## Include Directives

### Syntax

```ini
[include relative/path/to/file.cfg]
[include gschpoozi/*.cfg]              # Glob patterns supported
```

### Rules

- Paths are relative to the file containing the include
- Glob patterns (`*`, `**`) are supported
- Included files are processed in-place (as if pasted)
- Circular includes will cause errors

### Best Practice: Modular Config Structure

```
~/printer_data/config/
├── printer.cfg              # Main file with includes
├── gschpoozi/               # Generated configs (don't edit)
│   ├── hardware.cfg
│   ├── steppers.cfg
│   ├── fans.cfg
│   └── macros.cfg
└── user_overrides.cfg       # User customizations
```

```ini
# printer.cfg
[include gschpoozi/*.cfg]
[include user_overrides.cfg]    # User overrides LAST (wins)

# Duplicate parameters: LAST definition wins
```

---

## G-Code Macros & Jinja2

Klipper macros use **Jinja2 templating** (NOT Python).

### Basic Macro Structure

```ini
[gcode_macro MACRO_NAME]
description: What this macro does
gcode:
    # G-code commands here (indented)
    G28
    G1 X100 Y100 F3000
```

### Jinja2 Expressions

```ini
[gcode_macro PREHEAT]
gcode:
    # Variable assignment with {% set %}
    {% set bed_temp = params.BED|default(60)|float %}
    {% set extruder_temp = params.EXTRUDER|default(200)|float %}

    # Expression evaluation with { }
    M140 S{bed_temp}           # Set bed temp
    M104 S{extruder_temp}      # Set extruder temp

    # Conditional with {% if %}
    {% if bed_temp > 80 %}
        M117 High temp bed preheat
    {% endif %}
```

### Parameter Access

```ini
[gcode_macro EXAMPLE]
gcode:
    # params.NAME - always UPPERCASE, always strings
    {% set speed = params.SPEED|default(100)|float %}
    {% set count = params.COUNT|default(1)|int %}
    {% set message = params.MSG|default("Hello") %}

    # rawparams - unparsed parameter string (for M117, etc.)
    M117 {rawparams}
```

### Printer State Access

```ini
[gcode_macro SMART_HOME]
gcode:
    # Check if already homed
    {% if printer.toolhead.homed_axes != "xyz" %}
        G28
    {% endif %}

    # Access current position
    {% set current_z = printer.toolhead.position.z %}

    # Access temperatures
    {% set hotend_temp = printer.extruder.temperature %}
    {% set bed_temp = printer.heater_bed.temperature %}

    # Access fan speed (0.0-1.0)
    {% set fan_pct = printer.fan.speed * 100 %}
```

### Persistent Variables

```ini
[gcode_macro COUNTER]
variable_count: 0              # Declare with variable_ prefix (lowercase)
gcode:
    # Read variable
    {% set current = printer["gcode_macro COUNTER"].count %}

    # Update variable (persists between calls)
    SET_GCODE_VARIABLE MACRO=COUNTER VARIABLE=count VALUE={current + 1}

    M117 Count: {current + 1}
```

### Save/Restore G-Code State

```ini
[gcode_macro PARK]
gcode:
    SAVE_GCODE_STATE NAME=park_state

    G90                        # Absolute positioning
    G1 X10 Y10 Z50 F3000

    RESTORE_GCODE_STATE NAME=park_state
```

### Action Commands

```ini
[gcode_macro SAFE_MOVE]
gcode:
    {% if printer.toolhead.homed_axes != "xyz" %}
        # Output message to console
        {action_respond_info("Printer not homed! Homing first...")}
        G28
    {% endif %}

    {% if params.Z|float > printer.toolhead.axis_maximum.z %}
        # Abort with error
        {action_raise_error("Z position exceeds maximum!")}
    {% endif %}
```

### Delayed G-Code

```ini
[delayed_gcode CLEAR_DISPLAY]
initial_duration: 0            # 0 = don't run at startup
gcode:
    M117                       # Clear display

[gcode_macro SHOW_MESSAGE]
gcode:
    M117 {params.MSG|default("Ready")}
    UPDATE_DELAYED_GCODE ID=CLEAR_DISPLAY DURATION=5
```

### CRITICAL: Evaluation vs Execution Timing

```ini
# WARNING: This won't work as expected!
[gcode_macro BROKEN_EXAMPLE]
gcode:
    M104 S200                  # Command to set temp
    # The temperature check below evaluates BEFORE M104 executes!
    {% if printer.extruder.temperature > 190 %}
        M117 Hot enough         # Will never trigger
    {% endif %}
```

**The entire Jinja2 template evaluates FIRST, then all resulting G-code executes.**

---

## Printer Object Reference

Access printer state via `printer.<object>.<field>` in macros.

### Core Objects

```python
# Toolhead position & state
printer.toolhead.position.x          # Current X
printer.toolhead.position.y          # Current Y
printer.toolhead.position.z          # Current Z
printer.toolhead.homed_axes          # String: "", "x", "xy", "xyz"
printer.toolhead.axis_maximum.x      # Max X from config
printer.toolhead.axis_minimum.z      # Min Z from config
printer.toolhead.max_velocity        # Current max velocity
printer.toolhead.max_accel           # Current max acceleration

# G-code state
printer.gcode_move.gcode_position.x  # G-code coordinate X
printer.gcode_move.speed             # Current feedrate (mm/s)
printer.gcode_move.speed_factor      # M220 percentage / 100
printer.gcode_move.extrude_factor    # M221 percentage / 100
printer.gcode_move.absolute_coordinates  # Boolean

# Extruder
printer.extruder.temperature         # Current temp
printer.extruder.target              # Target temp
printer.extruder.power               # Heater power (0.0-1.0)
printer.extruder.can_extrude         # Boolean (above min_extrude_temp)

# Heated bed
printer.heater_bed.temperature
printer.heater_bed.target
printer.heater_bed.power

# Fan
printer.fan.speed                    # 0.0-1.0

# Print status
printer.print_stats.state            # "standby", "printing", "paused", "complete", "cancelled", "error"
printer.print_stats.filename
printer.print_stats.print_duration   # Seconds

# System state
printer.idle_timeout.state           # "Idle", "Printing", "Ready"
printer.webhooks.state               # "ready", "startup", "shutdown", "error"
```

### Accessing Named Sections

```python
# Sections with spaces use bracket notation
printer["heater_fan hotend_fan"].speed
printer["temperature_sensor chamber"].temperature
printer["gcode_macro MY_MACRO"].my_variable

# TMC drivers
printer["tmc2209 stepper_x"].run_current
```

---

## Common Configuration Patterns

### Dual Part Cooling Fans

```ini
[multi_pin part_cooling]
pins: PA8, PD12

[fan]
pin: multi_pin:part_cooling
max_power: 1.0
kick_start_time: 0.5
off_below: 0.10
```

### Hotend Fan (Auto-on with Heater)

```ini
[heater_fan hotend_fan]
pin: PA1
heater: extruder
heater_temp: 50.0
fan_speed: 1.0
```

### Controller/Electronics Fan

```ini
[controller_fan electronics_fan]
pin: PD15
kick_start_time: 0.5
heater: heater_bed, extruder       # Run when any heater active
idle_timeout: 60                    # Seconds after idle before off
```

### Temperature-Controlled Fan

```ini
[temperature_fan exhaust_fan]
pin: PD14
sensor_type: temperature_host      # Or use a thermistor
min_temp: 0
max_temp: 100
target_temp: 50.0
control: pid
pid_Kp: 1.0
pid_Ki: 0.5
pid_Kd: 2.0
```

### Filament Runout Sensor

```ini
[filament_switch_sensor runout_sensor]
switch_pin: ^PA4                   # Pull-up enabled
pause_on_runout: True
runout_gcode:
    M117 Filament runout!
    PAUSE
insert_gcode:
    M117 Filament inserted
```

### Chamber Heater

```ini
[heater_generic chamber]
heater_pin: PB0
sensor_type: Generic 3950
sensor_pin: PA5
control: pid
pid_Kp: 30
pid_Ki: 2
pid_Kd: 100
min_temp: 0
max_temp: 80

[verify_heater chamber]
max_error: 180
check_gain_time: 120
heating_gain: 1
```

---

## Safety Rules

### Temperature Limits

```ini
# SAFE extruder limits
[extruder]
min_temp: 0                        # NEVER below 0 (disables sensor check!)
max_temp: 300                      # All-metal hotend
max_temp: 260                      # PTFE-lined hotend (PTFE degrades >260C)

# SAFE bed limits
[heater_bed]
min_temp: 0
max_temp: 120                      # Typical safe max for most beds
```

### Required Safety Sections

```ini
[verify_heater extruder]
max_error: 120                     # Max temp deviation before error
check_gain_time: 60                # Seconds to reach target
heating_gain: 2                    # Min temp increase required

[verify_heater heater_bed]
max_error: 120
check_gain_time: 90
heating_gain: 1
```

### Movement Limits

```ini
[stepper_x]
position_min: 0
position_max: 350                  # NEVER exceed physical limits
position_endstop: 0

[printer]
max_velocity: 500                  # Machine-appropriate limits
max_accel: 10000
max_z_velocity: 30
max_z_accel: 350
```

### Pin Safety

- **NEVER duplicate pin assignments** - causes undefined behavior
- Always run validation before committing config changes
- Use explicit MCU prefixes when using multiple MCUs

---

## Quick Reference Card

| Rule | Correct | Wrong |
|------|---------|-------|
| Parameter separator | `step_pin: PE9` | `step_pin = PE9` |
| Pin invert | `!PA4` | `PA4!` |
| Pin pullup | `^PA4` | `PA4^` |
| Combined modifiers | `^!PA4` | `!^PA4` |
| Multi-MCU pin | `toolhead:PA1` | `PA1@toolhead` |
| Section name | `[stepper_x]` | `[Stepper_X]` |
| Named section | `[heater_fan my_fan]` | `[heater_fan My_Fan]` |
| Jinja2 expression | `{variable}` | `${variable}` |
| Jinja2 statement | `{% if x %}` | `{ if x }` |
| Multi-pin reference | `multi_pin:name` | `multi_pin.name` |

---

## Sources

- [Klipper Config Reference](https://www.klipper3d.org/Config_Reference.html)
- [Klipper Command Templates](https://www.klipper3d.org/Command_Templates.html)
- [Klipper Status Reference](https://www.klipper3d.org/Status_Reference.html)
- [Klipper FAQ](https://www.klipper3d.org/FAQ.html)
- [Voron Macros Guide](https://docs.vorondesign.com/community/howto/voidtrance/Klipper_Macros_Beginners_Guide.html)
