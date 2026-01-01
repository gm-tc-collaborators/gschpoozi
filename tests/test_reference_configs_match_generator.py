#!/usr/bin/env python3
"""
Regression harness for reference configs.

This does two things:
1) Ensures we can parse every file in reference-configs/ and that its derived
   features match the manifest expectations.
2) For scenarios that overlap with gschpoozi's generator (QGL / Z-tilt / bed_mesh
   structure), generate a config and compare *structure* (sections present),
   not values.

We intentionally do NOT try to match pins, PID values, serial IDs, etc.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, Set

# Add scripts/ to path
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from generator.generator import ConfigGenerator  # noqa: E402
from wizard.state import WizardState  # noqa: E402
from tools.reference_config_analyzer import parse_cfg_text  # noqa: E402


def _combined_sections_from_generated(files: Dict[str, str]) -> Set[str]:
    sections: Set[str] = set()
    for _, content in files.items():
        parsed = parse_cfg_text(content, filename="<generated>")
        sections.update(parsed.sections.keys())
    return sections


def _mk_min_state_for_scenario(scenario_id: str) -> WizardState:
    """
    Minimal WizardState for structural generation tests.
    We use a single known board and only test for the expected top-level sections.
    """
    s = WizardState()
    s.set("mcu.main.board_type", "btt-octopus-v1.1")
    s.set("mcu.main.serial", "/dev/serial/by-id/usb-test")

    s.set("printer.bed_size_x", 300)
    s.set("printer.bed_size_y", 300)
    s.set("printer.bed_size_z", 300)
    s.set("printer.kinematics", "corexy")

    # XY steppers
    s.set("stepper_x.motor_port", "MOTOR_0")
    s.set("stepper_x.driver_type", "TMC2209")
    s.set("stepper_x.driver_protocol", "uart")
    s.set("stepper_x.run_current", 0.8)
    s.set("stepper_x.belt_pitch", 2)
    s.set("stepper_x.pulley_teeth", 20)

    s.set("stepper_y.motor_port", "MOTOR_1")
    s.set("stepper_y.driver_type", "TMC2209")
    s.set("stepper_y.driver_protocol", "uart")
    s.set("stepper_y.run_current", 0.8)
    s.set("stepper_y.belt_pitch", 2)
    s.set("stepper_y.pulley_teeth", 20)

    # Z base
    s.set("stepper_z.motor_port", "MOTOR_2_1")
    s.set("stepper_z.driver_type", "TMC2209")
    s.set("stepper_z.driver_protocol", "uart")
    s.set("stepper_z.drive_type", "leadscrew")
    s.set("stepper_z.leadscrew_pitch", 8)
    s.set("stepper_z.run_current", 0.8)
    s.set("stepper_z.endstop_type", "probe")

    # Probe
    s.set("probe.probe_type", "tap")

    # Extruder
    s.set("extruder.location", "mainboard")
    s.set("extruder.motor_port_mainboard", "MOTOR_6")
    s.set("extruder.driver_type", "TMC2209")
    s.set("extruder.driver_protocol", "uart")
    s.set("extruder.run_current", 0.6)
    s.set("extruder.extruder_type", "orbiter_v2")
    s.set("extruder.heater_location", "mainboard")
    s.set("extruder.heater_port_mainboard", "HE0")
    s.set("extruder.sensor_location", "mainboard")
    s.set("extruder.sensor_port_mainboard", "T0")
    s.set("extruder.sensor_type", "Generic 3950")

    # Bed
    s.set("heater_bed.heater_pin", "HB")
    s.set("heater_bed.sensor_port", "TB")
    s.set("heater_bed.sensor_type", "Generic 3950")

    if scenario_id == "corexy_qgl_4z":
        s.set("stepper_z.z_motor_count", 4)
        s.set("stepper_z1.motor_port", "MOTOR_3")
        s.set("stepper_z2.motor_port", "MOTOR_4")
        s.set("stepper_z3.motor_port", "MOTOR_5")
        s.set("bed_leveling.leveling_type", "qgl")
    elif scenario_id in ("corexy_ztilt_3z", "corexy_ztilt_3z_dual_mcu"):
        s.set("stepper_z.z_motor_count", 3)
        s.set("stepper_z1.motor_port", "MOTOR_3")
        s.set("stepper_z2.motor_port", "MOTOR_4")
        s.set("bed_leveling.leveling_type", "z_tilt")
    else:
        # default single-z
        s.set("stepper_z.z_motor_count", 1)

    return s


def main() -> int:
    ref_dir = REPO_ROOT / "reference-configs"
    manifest_path = ref_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    configs = manifest.get("configs", [])
    assert configs, "manifest.json has no configs"

    # 1) Parse reference configs and verify derived feature expectations
    for entry in configs:
        file = entry["file"]
        expected = entry.get("expected_features", {})
        text = (ref_dir / file).read_text(encoding="utf-8", errors="replace")
        parsed = parse_cfg_text(text, filename=file)
        for k, v in expected.items():
            got = parsed.features.get(k)
            assert (
                got == v
            ), f"{file}: expected feature {k}={v} but got {got} (derived)"

    # 2) Structural generator comparisons for overlapping scenarios only
    scenario_requirements = {
        "corexy_qgl_4z": {"quad_gantry_level", "stepper_z1", "stepper_z2", "stepper_z3"},
        "corexy_ztilt_3z": {"z_tilt", "stepper_z1", "stepper_z2"},
        "corexy_ztilt_3z_dual_mcu": {"z_tilt", "stepper_z1", "stepper_z2"},
    }

    for entry in configs:
        scenario_id = entry["scenario_id"]
        if scenario_id not in scenario_requirements:
            continue

        state = _mk_min_state_for_scenario(scenario_id)
        gen = ConfigGenerator(state)
        files = gen.generate()
        gen_sections = _combined_sections_from_generated(files)

        required = scenario_requirements[scenario_id]
        missing = sorted([s for s in required if s not in gen_sections])
        assert not missing, f"{scenario_id}: generator missing sections: {missing}"

    print("PASS: reference configs parsed + generator structural checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

