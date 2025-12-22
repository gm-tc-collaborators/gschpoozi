"""
macro_defaults.py - Smart defaults engine for macro configuration

Automatically determines appropriate macro defaults based on:
- Probe type (Beacon, Cartographer, Eddy, BLTouch, etc.)
- Kinematics (CoreXY, Cartesian, Delta)
- Chamber sensor presence
- Filament sensor configuration
- LED configuration
- Brush/bucket configuration

This allows the wizard to pre-populate sensible values before
the user even starts configuring macros.
"""

from typing import Any, Dict, Optional


def get_smart_defaults(state) -> Dict[str, Any]:
    """
    Generate smart macro defaults based on current hardware configuration.

    Args:
        state: WizardState instance with hardware configuration

    Returns:
        Dictionary of macro setting keys -> values
    """
    defaults = {}

    # Get hardware configuration
    kinematics = state.get("printer.kinematics", "cartesian")
    probe_type = state.get("probe.type", "none")
    probe_mode = state.get("probe.mode", "")  # contact/proximity/touch/scan

    # Check for chamber sensor
    chamber_cfg = state.get("temperature_sensors.chamber", {})
    has_chamber_sensor = (
        isinstance(chamber_cfg, dict) and
        chamber_cfg.get("enabled", False)
    )

    # Check for filament sensor
    filament_sensor = state.get("filament_sensor", {})
    has_filament_sensor = (
        isinstance(filament_sensor, dict) and
        filament_sensor.get("enabled", False)
    )

    # Get bed dimensions for park positions
    bed_x = state.get("printer.bed_x", 250)
    bed_y = state.get("printer.bed_y", 250)
    max_z = state.get("printer.max_z", 300)

    # ═══════════════════════════════════════════════════════════════════════════════
    # KINEMATICS-BASED DEFAULTS
    # ═══════════════════════════════════════════════════════════════════════════════

    if kinematics in ("corexy", "corexz"):
        # CoreXY printers typically park at back
        defaults["park_position"] = "back"
        defaults["pause_position"] = "back"
        # Suggest voron-style preset
        defaults["_suggested_preset"] = "voron_style"
    elif kinematics == "cartesian":
        # Bed slingers park at front to avoid bed collision
        defaults["park_position"] = "front"
        defaults["pause_position"] = "front"
        defaults["_suggested_preset"] = "bed_slinger"
    elif kinematics == "delta":
        # Delta printers park at center-top
        defaults["park_position"] = "center"
        defaults["pause_position"] = "center"
        defaults["_suggested_preset"] = "beginner_safe"

    # ═══════════════════════════════════════════════════════════════════════════════
    # PROBE-BASED DEFAULTS
    # ═══════════════════════════════════════════════════════════════════════════════

    # Z calibration command based on probe type and mode
    z_cal_enabled = True
    z_cal_command = ""

    if probe_type == "beacon":
        if probe_mode == "contact":
            z_cal_command = "BEACON_CALIBRATE_NOZZLE_TEMP_OFFSET"
            defaults["always_home_z"] = True
        else:  # proximity mode
            z_cal_enabled = False
            defaults["always_home_z"] = False
    elif probe_type == "cartographer":
        if probe_mode == "touch":
            z_cal_command = "CARTOGRAPHER_TOUCH"
            defaults["always_home_z"] = True
        else:  # scan mode
            z_cal_enabled = False
            defaults["always_home_z"] = False
    elif probe_type == "btt_eddy":
        # Eddy doesn't have nozzle-based z calibration
        z_cal_enabled = False
        defaults["always_home_z"] = False
    elif probe_type == "klicky":
        # Klicky uses standard z calibration
        z_cal_command = ""  # Uses default homing
        defaults["always_home_z"] = True
    elif probe_type in ("bltouch", "inductive", "capacitive"):
        z_cal_enabled = False
        defaults["always_home_z"] = False
    else:
        z_cal_enabled = False

    defaults["z_calibration_enabled"] = z_cal_enabled
    defaults["z_calibration_command"] = z_cal_command

    # Level at temp - recommended for induction/eddy probes
    if probe_type in ("beacon", "cartographer", "btt_eddy", "inductive"):
        defaults["level_bed_at_temp"] = True

    # ═══════════════════════════════════════════════════════════════════════════════
    # CHAMBER SENSOR DEFAULTS
    # ═══════════════════════════════════════════════════════════════════════════════

    if has_chamber_sensor:
        # Enable heat soak features
        defaults["heat_soak_enabled"] = True
        defaults["heat_soak_time"] = 10
        defaults["chamber_temp_default"] = 40
        defaults["chamber_timeout"] = 30
        defaults["chamber_wait"] = True
        # Don't turn off fans immediately (exhaust may be needed)
        defaults["turn_off_fans"] = False
        defaults["fan_off_delay"] = 300
        # Suggest enclosed preset
        defaults["_suggested_preset"] = "enclosed_hightemp"
    else:
        defaults["heat_soak_enabled"] = False
        defaults["heat_soak_time"] = 0
        defaults["chamber_temp_default"] = 0
        defaults["chamber_wait"] = False

    # ═══════════════════════════════════════════════════════════════════════════════
    # FILAMENT SENSOR DEFAULTS
    # ═══════════════════════════════════════════════════════════════════════════════

    if has_filament_sensor:
        defaults["filament_sensor_enabled"] = True
        defaults["runout_pause"] = True
        defaults["runout_gcode"] = "M600"
        defaults["insert_delay"] = 1
    else:
        defaults["filament_sensor_enabled"] = False

    # ═══════════════════════════════════════════════════════════════════════════════
    # LED DEFAULTS
    # ═══════════════════════════════════════════════════════════════════════════════

    leds = state.get("leds", [])
    has_leds = isinstance(leds, list) and len(leds) > 0

    if has_leds:
        defaults["led_enabled"] = True
        # Use first LED as status LED
        if leds[0].get("name"):
            defaults["led_name"] = leds[0]["name"]
        else:
            defaults["led_name"] = "status_led"
    else:
        defaults["led_enabled"] = False

    # ═══════════════════════════════════════════════════════════════════════════════
    # BRUSH/BUCKET DEFAULTS (check if user has configured nozzle cleaning)
    # ═══════════════════════════════════════════════════════════════════════════════

    # For now, check if CoreXY and suggest brush usage
    if kinematics in ("corexy", "corexz"):
        # Suggest brush position at back of bed
        defaults["brush_x"] = bed_x / 2
        defaults["brush_y"] = bed_y - 3  # Near max Y
        defaults["brush_z"] = 1.0
        defaults["brush_width"] = 30.0
        # Bucket next to brush
        defaults["bucket_x"] = bed_x / 2 + 50
        defaults["bucket_y"] = bed_y - 3
        defaults["bucket_z"] = 5.0
    else:
        # Cartesian - suggest front positions
        defaults["brush_x"] = 5
        defaults["brush_y"] = 5
        defaults["brush_z"] = 1.0
        defaults["bucket_x"] = 50
        defaults["bucket_y"] = 5
        defaults["bucket_z"] = 5.0

    # ═══════════════════════════════════════════════════════════════════════════════
    # MOVEMENT SPEED DEFAULTS (based on kinematics)
    # ═══════════════════════════════════════════════════════════════════════════════

    if kinematics in ("corexy", "corexz"):
        defaults["travel_speed"] = 300
        defaults["z_travel_speed"] = 15
        defaults["homing_speed"] = 80
    elif kinematics == "delta":
        defaults["travel_speed"] = 200
        defaults["z_travel_speed"] = 50  # Delta has fast Z
        defaults["homing_speed"] = 50
    else:  # cartesian
        defaults["travel_speed"] = 150
        defaults["z_travel_speed"] = 10
        defaults["homing_speed"] = 50

    # ═══════════════════════════════════════════════════════════════════════════════
    # PARK POSITION COORDINATES
    # ═══════════════════════════════════════════════════════════════════════════════

    # Calculate actual park coordinates based on bed size
    park_pos = defaults.get("park_position", "front")
    if park_pos == "front":
        defaults["park_x"] = bed_x / 2
        defaults["park_y"] = 5
    elif park_pos == "back":
        defaults["park_x"] = bed_x / 2
        defaults["park_y"] = bed_y - 5
    elif park_pos == "center":
        defaults["park_x"] = bed_x / 2
        defaults["park_y"] = bed_y / 2

    defaults["park_z_max"] = max_z - 10

    # ═══════════════════════════════════════════════════════════════════════════════
    # PURGE DEFAULTS
    # ═══════════════════════════════════════════════════════════════════════════════

    # Line purge position at front-left by default
    defaults["purge_x"] = 5
    defaults["purge_y"] = 5
    defaults["purge_amount"] = 30.0
    defaults["purge_speed"] = 3.0
    defaults["purge_clearance"] = 10.0

    # ═══════════════════════════════════════════════════════════════════════════════
    # FILAMENT LOAD/UNLOAD DEFAULTS (based on extruder type)
    # ═══════════════════════════════════════════════════════════════════════════════

    extruder_type = state.get("extruder.type", "")

    if "bowden" in extruder_type.lower():
        # Bowden needs longer load/unload
        defaults["load_length"] = 450
        defaults["unload_length"] = 450
        defaults["load_speed"] = 300
        defaults["unload_speed"] = 300
    else:
        # Direct drive
        defaults["load_length"] = 100
        defaults["unload_length"] = 100
        defaults["load_speed"] = 300
        defaults["unload_speed"] = 300

    defaults["load_prime"] = 50
    defaults["load_prime_speed"] = 150
    defaults["unload_tip_shape"] = True

    return defaults


def get_suggested_preset(state) -> str:
    """
    Get the suggested preset name based on hardware configuration.

    Args:
        state: WizardState instance

    Returns:
        Preset name string (beginner_safe, voron_style, etc.)
    """
    defaults = get_smart_defaults(state)
    return defaults.get("_suggested_preset", "beginner_safe")


def apply_smart_defaults(state, force: bool = False) -> int:
    """
    Apply smart defaults to macro configuration if not already set.

    Args:
        state: WizardState instance
        force: If True, overwrite existing values

    Returns:
        Number of defaults applied
    """
    defaults = get_smart_defaults(state)
    applied = 0

    for key, value in defaults.items():
        # Skip internal keys
        if key.startswith("_"):
            continue

        state_key = f"macros.{key}"
        current = state.get(state_key)

        # Apply if not set or force=True
        if current is None or force:
            state.set(state_key, value)
            applied += 1

    if applied > 0:
        state.save()

    return applied


def get_probe_capabilities(probe_type: str, probe_mode: str = "") -> Dict[str, bool]:
    """
    Get capabilities of a probe type for macro generation.

    Args:
        probe_type: Type of probe (beacon, cartographer, btt_eddy, etc.)
        probe_mode: Mode for probes that support multiple modes

    Returns:
        Dictionary of capability flags
    """
    caps = {
        "supports_scan": False,
        "supports_rapid_scan": False,
        "supports_touch": False,
        "supports_contact": False,
        "needs_deploy": False,
        "has_z_calibration": False,
        "adaptive_mesh_native": True,  # Most modern Klipper supports this
    }

    if probe_type == "beacon":
        caps["supports_scan"] = True
        caps["has_z_calibration"] = (probe_mode == "contact")
        caps["supports_contact"] = True
    elif probe_type == "cartographer":
        caps["supports_scan"] = True
        caps["has_z_calibration"] = (probe_mode == "touch")
        caps["supports_touch"] = True
    elif probe_type == "btt_eddy":
        caps["supports_rapid_scan"] = True
    elif probe_type == "klicky":
        caps["needs_deploy"] = True
    elif probe_type == "bltouch":
        caps["needs_deploy"] = True  # Deploys automatically but has deploy command

    return caps


def get_mesh_method(probe_type: str, probe_mode: str = "") -> str:
    """
    Get the appropriate bed mesh method for a probe type.

    Args:
        probe_type: Type of probe
        probe_mode: Mode for multi-mode probes

    Returns:
        Method string for BED_MESH_CALIBRATE (scan, rapid_scan, or empty for default)
    """
    if probe_type == "beacon":
        return "scan"
    elif probe_type == "cartographer":
        return "scan"
    elif probe_type == "btt_eddy":
        return "rapid_scan"
    else:
        return ""  # Use default method


def get_z_calibration_gcode(probe_type: str, probe_mode: str = "") -> str:
    """
    Get the Z calibration G-code command for a probe type.

    Args:
        probe_type: Type of probe
        probe_mode: Mode for multi-mode probes

    Returns:
        G-code command string (empty if no calibration needed)
    """
    if probe_type == "beacon" and probe_mode == "contact":
        return "BEACON_CALIBRATE_NOZZLE_TEMP_OFFSET"
    elif probe_type == "cartographer" and probe_mode == "touch":
        return "CARTOGRAPHER_TOUCH"
    else:
        return ""
