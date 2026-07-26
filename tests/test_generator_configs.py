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


def test_cartographer_accelerometer_versions():
    """Test: Cartographer built-in accelerometer generates [adxl345] with version-correct cs_pin."""
    print("Test: Cartographer accelerometer V3/V4 cs_pin...", end=" ")
    try:
        for version, expected_pin in [('v3', 'cartographer:PA3'), ('v4', 'cartographer:PA0'), (None, 'cartographer:PA3')]:
            state = create_base_state()
            state.set('probe.probe_type', 'cartographer')
            state.set('probe.serial', '/dev/serial/by-id/usb-Cartographer')
            state.set('probe.x_offset', 0)
            state.set('probe.y_offset', 20)
            state.set('probe.homing_mode', 'touch')
            if version:
                state.set('probe.cartographer_version', version)
            state.set('tuning.accelerometer.enabled', True)
            state.set('tuning.accelerometer.source', 'cartographer')
            state.set('tuning.accelerometer.type', 'ADXL345')

            gen = ConfigGenerator(state)
            files = gen.generate()
            all_cfg = '\n'.join(files.values())
            assert '[adxl345]' in all_cfg, f"[adxl345] section missing (version={version})"
            assert f'cs_pin: {expected_pin}' in all_cfg, \
                f"expected cs_pin {expected_pin} for version={version}"
            # resonance_tester references adxl345, which must now be defined
            assert 'accel_chip: adxl345' in all_cfg, f"resonance_tester missing (version={version})"

        print("PASS")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_case_light_pwm_on_fan_port():
    """Test: PWM case light on a fan port pin generates slider-controllable output_pin."""
    print("Test: Case light PWM on fan port...", end=" ")
    try:
        state = create_base_state()
        state.set('lighting.case_light.enabled', True)
        state.set('lighting.case_light.type', 'pwm')
        state.set('lighting.case_light.location', 'mainboard')
        state.set('lighting.case_light.pin', 'PD13')  # Octopus FAN2

        files = ConfigGenerator(state).generate()
        cfg = files['gschpoozi/lighting.cfg']
        assert '[output_pin caselight]' in cfg, "output_pin section missing"
        assert 'pin: PD13' in cfg
        assert 'pwm: True' in cfg, "pwm missing - no slider in Mainsail/Fluidd"
        assert 'cycle_time: 0.01' in cfg, "cycle_time missing"
        assert 'shutdown_value: 0' in cfg
        assert 'gschpoozi/lighting.cfg' in files['printer.cfg'], "lighting.cfg not included"

        # On/off variant: no pwm
        state.set('lighting.case_light.type', 'onoff')
        cfg = ConfigGenerator(state).generate()['gschpoozi/lighting.cfg']
        assert '[output_pin caselight]' in cfg and 'pwm: True' not in cfg

        # Toolboard location gets prefix
        state.set('lighting.case_light.type', 'pwm')
        state.set('lighting.case_light.location', 'toolboard')
        cfg = ConfigGenerator(state).generate()['gschpoozi/lighting.cfg']
        assert 'pin: toolboard:PD13' in cfg

        print("PASS")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_case_light_neopixel_with_effects():
    """Test: Neopixel case light with led_effect presets, correct section ordering."""
    print("Test: Neopixel case light + LED effects...", end=" ")
    try:
        state = create_base_state()
        state.set('lighting.case_light.enabled', True)
        state.set('lighting.case_light.type', 'neopixel')
        state.set('lighting.case_light.location', 'mainboard')
        state.set('lighting.case_light.pin', 'PB0')
        state.set('lighting.case_light.chain_count', 20)
        state.set('lighting.case_light.color_order', 'GRBW')
        state.set('lighting.effects.enabled', True)
        state.set('lighting.effects.targets', ['neopixel:case_light'])
        state.set('lighting.effects.heating', True)
        state.set('lighting.effects.printing', True)

        cfg = ConfigGenerator(state).generate()['gschpoozi/lighting.cfg']
        assert '[neopixel case_light]' in cfg
        assert 'initial_WHITE' in cfg, "RGBW strip missing initial_WHITE"
        for name in ['lighting_idle', 'lighting_heating', 'lighting_printing', 'lighting_error']:
            assert f'[led_effect {name}]' in cfg, f"{name} preset missing"
        # led definitions must precede effects referencing them
        assert cfg.index('[neopixel case_light]') < cfg.index('[led_effect lighting_idle]')
        assert 'run_on_error: true' in cfg

        # Disabled lighting -> no sections generated
        cfg = ConfigGenerator(create_base_state()).generate().get('gschpoozi/lighting.cfg', '')
        assert '[output_pin' not in cfg and '[neopixel' not in cfg

        print("PASS")
        return True
    except Exception as e:
        print(f"FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_duet2_tmc2660_hardware_spi():
    """Test: Duet 2 WiFi/Ethernet with onboard TMC2660 drivers on hardware SPI bus."""
    print("Test: Duet 2 TMC2660 hardware SPI...", end=" ")
    try:
        state = create_base_state()
        state.set('mcu.main.board_type', 'duet2-wifi-ethernet')
        state.set('mcu.main.serial', '/dev/serial/by-id/usb-Klipper_sam4e8e_test')
        state.set('printer.kinematics', 'cartesian')
        for axis, port in [('x', 'DRIVE_0'), ('y', 'DRIVE_1'), ('z', 'DRIVE_2')]:
            state.set(f'stepper_{axis}.motor_port', port)
            state.set(f'stepper_{axis}.driver_type', 'TMC2660')
            state.set(f'stepper_{axis}.driver_protocol', 'spi')
            state.set(f'stepper_{axis}.hold_current', 0.5)  # must be dropped for TMC2660
        # Extruder on DRIVE_3, Duet heater/thermistor/fan ports
        state.set('extruder.motor_port_mainboard', 'DRIVE_3')
        state.set('extruder.driver_type', 'TMC2660')
        state.set('extruder.driver_protocol', 'spi')
        state.set('extruder.heater_port_mainboard', 'E0_OUT')
        state.set('extruder.sensor_port_mainboard', 'E0_TEMP')
        state.set('heater_bed.heater_pin', 'BED_OUT')
        state.set('heater_bed.sensor_port', 'BED_TEMP')
        state.set('fans.part_cooling.pin_mainboard', 'PC23')
        state.set('fans.hotend.pin_mainboard', 'PC26')

        files = ConfigGenerator(state).generate()
        hw = files['gschpoozi/hardware.cfg']

        assert '[tmc2660 stepper_x]' in hw, "tmc2660 section missing"
        assert 'cs_pin: PD14' in hw and 'cs_pin: PC9' in hw and 'cs_pin: PC10' in hw
        assert 'spi_bus: usart1' in hw, "hardware SPI bus missing"
        assert 'spi_software_miso_pin' not in hw, "software SPI emitted despite hardware bus"
        assert 'sense_resistor: 0.051' in hw, "TMC2660 sense_resistor default wrong"
        assert 'hold_current' not in hw, "hold_current emitted for TMC2660 (unsupported)"
        assert 'enable_pin: !PC6' in hw, "shared inverted enable pin missing"
        assert 'step_pin: PD6' in hw and 'step_pin: PD7' in hw and 'step_pin: PD8' in hw

        print("PASS")
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
        test_cartographer_accelerometer_versions,
        test_case_light_pwm_on_fan_port,
        test_case_light_neopixel_with_effects,
        test_duet2_tmc2660_hardware_spi,
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
