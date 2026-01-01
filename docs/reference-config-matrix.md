# Reference config capability matrix

Configs analyzed: **8** (from `reference-configs/*.cfg`)

## Per-config feature summary

| config | lines | leveling | z_motors | multi_mcu | has_tmc | idex |
|---|---:|---|---:|---:|---:|---:|
| `creality-ender3-v2.cfg` | 95 | none | 1 | no | no | no |
| `generic-btt-skr-3.cfg` | 185 | none | 1 | no | no | no |
| `ratrig-vcore3-300-base.cfg` | 164 | z_tilt | 3 | no | yes | no |
| `ratrig-vcore3-compiled.cfg` | 139 | none | 1 | no | no | no |
| `sample-idex.cfg` | 132 | none | 1 | no | no | yes |
| `voron-0.2-skr-mini-e3-v3-raw.cfg` | 417 | none | 1 | no | yes | no |
| `voron-2.4-octopus-raw.cfg` | 593 | qgl | 4 | no | yes | no |
| `voron-trident-skr13-raw.cfg` | 611 | z_tilt | 3 | yes | yes | no |

## Section frequency (how many configs include a section)

| section | count |
|---|---:|
| `extruder` | 8 |
| `stepper_x` | 7 |
| `fan` | 6 |
| `heater_bed` | 6 |
| `mcu` | 6 |
| `printer` | 6 |
| `stepper_y` | 6 |
| `stepper_z` | 6 |
| `tmc2209 extruder` | 4 |
| `tmc2209 stepper_x` | 4 |
| `tmc2209 stepper_y` | 4 |
| `tmc2209 stepper_z` | 4 |
| `board_pins` | 3 |
| `controller_fan controller_fan` | 3 |
| `gcode_macro PRINT_END` | 3 |
| `gcode_macro PRINT_START` | 3 |
| `idle_timeout` | 3 |
| `probe` | 3 |
| `stepper_z1` | 3 |
| `stepper_z2` | 3 |
| `tmc2209 stepper_z1` | 3 |
| `tmc2209 stepper_z2` | 3 |
| `display_status` | 2 |
| `heater_fan hotend_fan` | 2 |
| `homing_override` | 2 |
| `pause_resume` | 2 |
| `virtual_sdcard` | 2 |
| `z_tilt` | 2 |
| `bed_mesh` | 1 |
| `bed_screws` | 1 |
| `bltouch` | 1 |
| `dual_carriage` | 1 |
| `extruder1` | 1 |
| `gcode_macro _HOME_X` | 1 |
| `gcode_macro _HOME_Y` | 1 |
| `gcode_macro _HOME_Z` | 1 |
| `gcode_macro ACTIVATE_COPY_MODE` | 1 |
| `gcode_macro ACTIVATE_MIRROR_MODE` | 1 |
| `gcode_macro CANCEL_PRINT` | 1 |
| `gcode_macro G32` | 1 |
| `gcode_macro LOAD_FILAMENT` | 1 |
| `gcode_macro PARK` | 1 |
| `gcode_macro PARK_extruder` | 1 |
| `gcode_macro PARK_extruder1` | 1 |
| `gcode_macro PAUSE` | 1 |
| `gcode_macro RESUME` | 1 |
| `gcode_macro T0` | 1 |
| `gcode_macro T1` | 1 |
| `gcode_macro UNLOAD_FILAMENT` | 1 |
| `heater_fan extruder_fan` | 1 |
| `heater_fan toolhead_cooling_fan` | 1 |
| `include mainsail.cfg` | 1 |
| `input_shaper` | 1 |
| `mcu xye` | 1 |
| `quad_gantry_level` | 1 |
| `safe_z_home` | 1 |
| `skew_correction` | 1 |
| `stepper_z3` | 1 |
| `temperature_sensor host_temp` | 1 |
| `temperature_sensor mcu_temp` | 1 |
| `temperature_sensor raspberry_pi` | 1 |
| `temperature_sensor SKR_Pro` | 1 |
| `tmc2209 stepper_z3` | 1 |

## Notes

- This analysis is **structural** (sections/keys). It intentionally ignores values.
- `gcode:` bodies and macro scripts are not parsed; we only record that the key exists.
