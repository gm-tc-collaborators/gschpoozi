#!/usr/bin/env python3
"""
Integration tests for config generator with various printer configurations.

Tests cover:
- Single Z with various probes
- Multi-Z with z_tilt
- Quad Z with QGL
- Beacon and Cartographer probes
"""

import sys
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from generator.generator import ConfigGenerator
from wizard.state import WizardState


def create_base_state() -> WizardState:
    """Create a minimal valid state with common settings."""
    state = WizardState()
    
    # MCU
    state.set('mcu.main.board_type', 'btt-octopus-v1.1')
    state.set('mcu.main.serial', '/dev/serial/by-id/usb-test')
    
    # Printer
    state.set('printer.bed_size_x', 350)
    state.set('printer.bed_size_y', 350)
    state.set('printer.bed_size_z', 300)
    state.set('printer.kinematics', 'corexy')
    
    # X stepper
    state.set('stepper_x.motor_port', 'MOTOR_0')
    state.set('stepper_x.driver_type', 'TMC2209')
    state.set('stepper_x.driver_protocol', 'uart')
    state.set('stepper_x.run_current', 0.8)
    state.set('stepper_x.belt_pitch', 2)
    state.set('stepper_x.pulley_teeth', 20)
    
    # Y stepper
    state.set('stepper_y.motor_port', 'MOTOR_1')
    state.set('stepper_y.driver_type', 'TMC2209')
    state.set('stepper_y.driver_protocol', 'uart')
    state.set('stepper_y.run_current', 0.8)
    state.set('stepper_y.belt_pitch', 2)
    state.set('stepper_y.pulley_teeth', 20)
    
    # Z stepper (single)
    state.set('stepper_z.motor_port', 'MOTOR_2_1')
    state.set('stepper_z.z_motor_count', 1)
    state.set('stepper_z.driver_type', 'TMC2209')
    state.set('stepper_z.driver_protocol', 'uart')
    state.set('stepper_z.drive_type', 'leadscrew')
    state.set('stepper_z.leadscrew_pitch', 8)
    state.set('stepper_z.run_current', 0.8)
    state.set('stepper_z.endstop_type', 'probe')
    
    # Extruder
    state.set('extruder.location', 'mainboard')
    state.set('extruder.motor_port_mainboard', 'MOTOR_6')
    state.set('extruder.driver_type', 'TMC2209')
    state.set('extruder.driver_protocol', 'uart')
    state.set('extruder.run_current', 0.6)
    state.set('extruder.extruder_type', 'orbiter_v2')
    state.set('extruder.heater_location', 'mainboard')
    state.set('extruder.heater_port_mainboard', 'HE0')
    state.set('extruder.sensor_location', 'mainboard')
    state.set('extruder.sensor_port_mainboard', 'T0')
    state.set('extruder.sensor_type', 'Generic 3950')
    
    # Bed heater
    state.set('heater_bed.heater_pin', 'HB')
    state.set('heater_bed.sensor_port', 'TB')
    state.set('heater_bed.sensor_type', 'Generic 3950')
    
    return state


def test_single_z_tap_probe():
    """Test: Single Z motor with Tap probe."""
    print("Test: Single Z with Tap probe...", end=" ")
    state = create_base_state()
    state.set('probe.probe_type', 'tap')
    
    try:
        gen = ConfigGenerator(state)
        files = gen.generate()
        assert len(files) > 0, "No files generated"
        print(f"PASS ({len(files)} files)")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        return False


def test_triple_z_with_z_tilt():
    """Test: Triple Z motors with Z-Tilt leveling."""
    print("Test: Triple Z with Z-Tilt...", end=" ")
    state = create_base_state()
    
    # Triple Z
    state.set('stepper_z.z_motor_count', 3)
    state.set('stepper_z1.motor_port', 'MOTOR_3')
    state.set('stepper_z2.motor_port', 'MOTOR_4')
    
    # Z-Tilt
    state.set('bed_leveling.leveling_type', 'z_tilt')
    
    # Tap probe
    state.set('probe.probe_type', 'tap')
    
    try:
        gen = ConfigGenerator(state)
        files = gen.generate()
        assert len(files) > 0, "No files generated"
        
        # Check z_tilt is in leveling.cfg
        leveling_cfg = files.get('gschpoozi/leveling.cfg', '')
        assert '[z_tilt]' in leveling_cfg, "z_tilt section missing"
        
        # Check stepper_z1 and stepper_z2 are in hardware.cfg
        hardware_cfg = files.get('gschpoozi/hardware.cfg', '')
        assert '[stepper_z1]' in hardware_cfg, "stepper_z1 section missing"
        assert '[stepper_z2]' in hardware_cfg, "stepper_z2 section missing"
        
        print(f"PASS ({len(files)} files)")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_quad_z_with_qgl():
    """Test: Quad Z motors with Quad Gantry Leveling."""
    print("Test: Quad Z with QGL...", end=" ")
    state = create_base_state()
    
    # Quad Z
    state.set('stepper_z.z_motor_count', 4)
    state.set('stepper_z1.motor_port', 'MOTOR_3')
    state.set('stepper_z2.motor_port', 'MOTOR_4')
    state.set('stepper_z3.motor_port', 'MOTOR_5')
    
    # QGL
    state.set('bed_leveling.leveling_type', 'qgl')
    
    # Tap probe
    state.set('probe.probe_type', 'tap')
    
    try:
        gen = ConfigGenerator(state)
        files = gen.generate()
        assert len(files) > 0, "No files generated"
        
        # Check quad_gantry_level is in leveling.cfg
        leveling_cfg = files.get('gschpoozi/leveling.cfg', '')
        assert '[quad_gantry_level]' in leveling_cfg, "quad_gantry_level section missing"
        
        # Check all Z steppers are in hardware.cfg
        hardware_cfg = files.get('gschpoozi/hardware.cfg', '')
        assert '[stepper_z1]' in hardware_cfg, "stepper_z1 section missing"
        assert '[stepper_z2]' in hardware_cfg, "stepper_z2 section missing"
        assert '[stepper_z3]' in hardware_cfg, "stepper_z3 section missing"
        
        print(f"PASS ({len(files)} files)")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_beacon_probe_minimal():
    """Test: Beacon probe without bed_mesh configured (minimal)."""
    print("Test: Beacon probe (minimal, no bed_mesh)...", end=" ")
    state = create_base_state()
    
    # Beacon probe - minimal config (no bed_mesh settings)
    state.set('probe.probe_type', 'beacon')
    state.set('probe.serial', '/dev/serial/by-id/usb-Beacon')
    state.set('probe.x_offset', 0)
    state.set('probe.y_offset', 25)
    state.set('probe.homing_mode', 'contact')
    
    try:
        gen = ConfigGenerator(state)
        files = gen.generate()
        assert len(files) > 0, "No files generated"
        
        # Check beacon section is in probe.cfg
        probe_cfg = files.get('gschpoozi/probe.cfg', '')
        assert '[beacon]' in probe_cfg, "beacon section missing"
        assert 'mesh_main_direction:' in probe_cfg, "mesh_main_direction missing"
        assert 'mesh_runs:' in probe_cfg, "mesh_runs missing"
        
        print(f"PASS ({len(files)} files)")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_beacon_probe_with_bed_mesh():
    """Test: Beacon probe with full bed_mesh configuration."""
    print("Test: Beacon probe (with bed_mesh)...", end=" ")
    state = create_base_state()
    
    # Beacon probe with bed_mesh
    state.set('probe.probe_type', 'beacon')
    state.set('probe.serial', '/dev/serial/by-id/usb-Beacon')
    state.set('probe.x_offset', 0)
    state.set('probe.y_offset', 25)
    state.set('probe.homing_mode', 'contact')
    state.set('probe.bed_mesh.enabled', True)
    state.set('probe.bed_mesh.mesh_main_direction', 'y')
    state.set('probe.bed_mesh.mesh_runs', 3)
    state.set('probe.bed_mesh.probe_count', '15, 15')
    state.set('probe.bed_mesh.mesh_min', '30, 30')
    state.set('probe.bed_mesh.mesh_max', '320, 320')
    
    try:
        gen = ConfigGenerator(state)
        files = gen.generate()
        assert len(files) > 0, "No files generated"
        
        # Check beacon section
        probe_cfg = files.get('gschpoozi/probe.cfg', '')
        assert '[beacon]' in probe_cfg, "beacon section missing"
        assert 'mesh_main_direction: y' in probe_cfg, "mesh_main_direction should be y"
        assert 'mesh_runs: 3' in probe_cfg, "mesh_runs should be 3"
        
        # Check bed_mesh section (in leveling.cfg)
        leveling_cfg = files.get('gschpoozi/leveling.cfg', '')
        assert '[bed_mesh]' in leveling_cfg, "bed_mesh section missing"
        assert 'probe_count: 15, 15' in leveling_cfg, "probe_count should be 15, 15"
        
        print(f"PASS ({len(files)} files)")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cartographer_probe():
    """Test: Cartographer probe."""
    print("Test: Cartographer probe...", end=" ")
    state = create_base_state()
    
    # Cartographer probe
    state.set('probe.probe_type', 'cartographer')
    state.set('probe.serial', '/dev/serial/by-id/usb-Cartographer')
    state.set('probe.x_offset', 0)
    state.set('probe.y_offset', 20)
    state.set('probe.homing_mode', 'touch')
    
    try:
        gen = ConfigGenerator(state)
        files = gen.generate()
        assert len(files) > 0, "No files generated"
        
        # Check scanner section is in probe.cfg
        probe_cfg = files.get('gschpoozi/probe.cfg', '')
        assert '[scanner]' in probe_cfg, "scanner section missing"
        
        print(f"PASS ({len(files)} files)")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_triple_z_with_beacon():
    """Test: Triple Z with Z-Tilt and Beacon probe."""
    print("Test: Triple Z with Z-Tilt and Beacon...", end=" ")
    state = create_base_state()
    
    # Triple Z
    state.set('stepper_z.z_motor_count', 3)
    state.set('stepper_z1.motor_port', 'MOTOR_3')
    state.set('stepper_z2.motor_port', 'MOTOR_4')
    
    # Z-Tilt
    state.set('bed_leveling.leveling_type', 'z_tilt')
    
    # Beacon probe
    state.set('probe.probe_type', 'beacon')
    state.set('probe.serial', '/dev/serial/by-id/usb-Beacon')
    state.set('probe.x_offset', 0)
    state.set('probe.y_offset', 25)
    state.set('probe.homing_mode', 'contact')
    
    try:
        gen = ConfigGenerator(state)
        files = gen.generate()
        assert len(files) > 0, "No files generated"
        
        # Check z_tilt
        leveling_cfg = files.get('gschpoozi/leveling.cfg', '')
        assert '[z_tilt]' in leveling_cfg, "z_tilt section missing"
        
        # Check beacon
        probe_cfg = files.get('gschpoozi/probe.cfg', '')
        assert '[beacon]' in probe_cfg, "beacon section missing"
        
        # Check Z steppers
        hardware_cfg = files.get('gschpoozi/hardware.cfg', '')
        assert '[stepper_z1]' in hardware_cfg, "stepper_z1 section missing"
        assert '[stepper_z2]' in hardware_cfg, "stepper_z2 section missing"
        
        print(f"PASS ({len(files)} files)")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Config Generator Integration Tests")
    print("=" * 60)
    print()
    
    tests = [
        test_single_z_tap_probe,
        test_triple_z_with_z_tilt,
        test_quad_z_with_qgl,
        test_beacon_probe_minimal,
        test_beacon_probe_with_bed_mesh,
        test_cartographer_probe,
        test_triple_z_with_beacon,
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print()
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("All tests PASSED!")
        return 0
    else:
        print("Some tests FAILED!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
