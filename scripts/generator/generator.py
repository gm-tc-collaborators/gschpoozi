"""
generator.py - Main config generator

Orchestrates loading state, rendering templates, and writing config files.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from wizard.state import WizardState, get_state
from generator.templates import TemplateRenderer


class ConfigGenerator:
    """Generates Klipper configuration files from wizard state."""

    # Output file structure
    OUTPUT_FILES = {
        "printer.cfg": "Main configuration (includes only)",
        "gschpoozi/hardware.cfg": "MCU, steppers, extruder, bed, fans",
        "gschpoozi/probe.cfg": "Probe and homing",
        "gschpoozi/leveling.cfg": "Bed leveling",
        "gschpoozi/macros.cfg": "G-code macros",
        "gschpoozi/macros-config.cfg": "Macro configuration variables",
        "gschpoozi/tuning.cfg": "Tuning and optional features",
    }

    def __init__(
        self,
        state: WizardState = None,
        output_dir: Path = None,
        renderer: TemplateRenderer = None,
        templates_dir: Path = None
    ):
        self.state = state or get_state()
        self.output_dir = output_dir or Path.home() / "printer_data" / "config"
        self.renderer = renderer or TemplateRenderer()
        self.templates_dir = templates_dir or self._find_templates_dir()

        # Section to file mapping
        self.file_mapping = {
            'mcu.main': 'gschpoozi/hardware.cfg',
            'mcu.toolboard': 'gschpoozi/hardware.cfg',
            'mcu.host': 'gschpoozi/hardware.cfg',
            'printer': 'gschpoozi/hardware.cfg',
            'stepper_x': 'gschpoozi/hardware.cfg',
            'tmc_stepper_x': 'gschpoozi/hardware.cfg',
            'stepper_x1': 'gschpoozi/hardware.cfg',
            'tmc_stepper_x1': 'gschpoozi/hardware.cfg',
            'stepper_y': 'gschpoozi/hardware.cfg',
            'tmc_stepper_y': 'gschpoozi/hardware.cfg',
            'stepper_y1': 'gschpoozi/hardware.cfg',
            'tmc_stepper_y1': 'gschpoozi/hardware.cfg',
            'stepper_z': 'gschpoozi/hardware.cfg',
            'tmc_stepper_z': 'gschpoozi/hardware.cfg',
            'extruder': 'gschpoozi/hardware.cfg',
            'tmc_extruder': 'gschpoozi/hardware.cfg',
            'heater_bed': 'gschpoozi/hardware.cfg',
            'fan': 'gschpoozi/hardware.cfg',
            'heater_fan': 'gschpoozi/hardware.cfg',
            'controller_fan': 'gschpoozi/hardware.cfg',
            'multi_pin': 'gschpoozi/hardware.cfg',
            'fan_generic': 'gschpoozi/hardware.cfg',
            'probe': 'gschpoozi/probe.cfg',
            'bltouch': 'gschpoozi/probe.cfg',
            'beacon': 'gschpoozi/probe.cfg',
            'cartographer': 'gschpoozi/probe.cfg',
            'btt_eddy': 'gschpoozi/probe.cfg',
            'safe_z_home': 'gschpoozi/probe.cfg',
            'bed_mesh': 'gschpoozi/leveling.cfg',
            'z_tilt': 'gschpoozi/leveling.cfg',
            'quad_gantry_level': 'gschpoozi/leveling.cfg',
            'temperature_sensor': 'gschpoozi/hardware.cfg',
            'neopixel': 'gschpoozi/hardware.cfg',
            'filament_switch_sensor': 'gschpoozi/hardware.cfg',
            'common.virtual_sdcard': 'gschpoozi/tuning.cfg',
            'common.idle_timeout': 'gschpoozi/tuning.cfg',
            'common.pause_resume': 'gschpoozi/tuning.cfg',
            'common.exclude_object': 'gschpoozi/tuning.cfg',
            'common.gcode_arcs': 'gschpoozi/tuning.cfg',
            'common.respond': 'gschpoozi/tuning.cfg',
            'common.save_variables': 'gschpoozi/tuning.cfg',
            'common.force_move': 'gschpoozi/tuning.cfg',
            'common.firmware_retraction': 'gschpoozi/tuning.cfg',
            'common.macro_config': 'gschpoozi/macros-config.cfg',
            'common.bed_mesh_macro': 'gschpoozi/macros.cfg',
        }

    def _find_templates_dir(self) -> Path:
        """Find the templates directory."""
        module_dir = Path(__file__).parent
        candidates = [
            module_dir.parent.parent / "templates",
            module_dir.parent / "templates",
            Path.home() / "gschpoozi" / "templates",
        ]
        for path in candidates:
            if path.exists():
                return path
        return candidates[0]  # Return first as default

    def get_context(self) -> Dict[str, Any]:
        """Get context for template rendering from wizard state."""
        context = self.state.export_for_generator()

        # Load board pin definitions from JSON files
        context['board'] = self._load_board_definition(
            self.state.get('mcu.main.board_type', 'other')
        )
        context['toolboard'] = self._load_toolboard_definition(
            self.state.get('mcu.toolboard.board_type', None)
        )
        context['extruder_presets'] = self._get_extruder_presets()

        return context

    def _load_board_definition(self, board_type: str) -> Dict[str, Any]:
        """Load main board pin definitions from JSON file."""
        if not board_type or board_type == 'other':
            return self._get_manual_board_context()

        board_file = self.templates_dir / "boards" / f"{board_type}.json"
        if board_file.exists():
            try:
                with open(board_file) as f:
                    board_data = json.load(f)
                return self._transform_board_data(board_data)
            except (json.JSONDecodeError, IOError):
                pass

        return self._get_manual_board_context()

    def _load_toolboard_definition(self, board_type: str) -> Dict[str, Any]:
        """Load toolboard pin definitions from JSON file."""
        if not board_type or not self.state.get('mcu.toolboard.connection_type'):
            return {}

        board_file = self.templates_dir / "toolboards" / f"{board_type}.json"
        if board_file.exists():
            try:
                with open(board_file) as f:
                    board_data = json.load(f)
                return self._transform_board_data(board_data)
            except (json.JSONDecodeError, IOError):
                pass

        return self._get_manual_toolboard_context()

    def _transform_board_data(self, board_data: Dict) -> Dict[str, Any]:
        """Transform board JSON data to template-friendly format."""
        pins = {}

        # Transform motor ports
        for port_name, port_data in board_data.get('motor_ports', {}).items():
            pins[port_name] = {
                'step': port_data.get('step_pin'),
                'dir': port_data.get('dir_pin'),
                'enable': port_data.get('enable_pin'),
                'uart': port_data.get('uart_pin'),
                'cs': port_data.get('cs_pin'),
                'diag': port_data.get('diag_pin'),
            }

        # Transform heater ports
        for port_name, port_data in board_data.get('heater_ports', {}).items():
            pins[port_name] = {'signal': port_data.get('pin')}

        # Transform fan ports
        for port_name, port_data in board_data.get('fan_ports', {}).items():
            pins[port_name] = {'signal': port_data.get('pin')}

        # Transform thermistor ports
        for port_name, port_data in board_data.get('thermistor_ports', {}).items():
            pins[port_name] = {'signal': port_data.get('pin')}

        # Transform endstop ports
        for port_name, port_data in board_data.get('endstop_ports', {}).items():
            pins[port_name] = {'signal': port_data.get('pin')}

        # Get SPI config
        spi_config = {}
        for spi_name, spi_data in board_data.get('spi_config', {}).items():
            spi_config = {
                'miso': spi_data.get('miso_pin'),
                'mosi': spi_data.get('mosi_pin'),
                'sclk': spi_data.get('sck_pin'),
            }
            break  # Use first SPI config

        return {
            'id': board_data.get('id'),
            'name': board_data.get('name'),
            'pins': pins,
            'spi': spi_config,
            'motor_ports': list(board_data.get('motor_ports', {}).keys()),
            'heater_ports': list(board_data.get('heater_ports', {}).keys()),
            'fan_ports': list(board_data.get('fan_ports', {}).keys()),
            'thermistor_ports': list(board_data.get('thermistor_ports', {}).keys()),
            'endstop_ports': list(board_data.get('endstop_ports', {}).keys()),
            'defaults': board_data.get('default_assignments', {}),
        }

    def _get_manual_board_context(self) -> Dict[str, Any]:
        """Get fallback context for manual pin entry boards."""
        return {
            'id': 'manual',
            'name': 'Manual Configuration',
            'pins': {},
            'spi': {},
            'motor_ports': [],
            'heater_ports': [],
            'fan_ports': [],
            'thermistor_ports': [],
            'endstop_ports': [],
            'defaults': {},
        }

    def _get_manual_toolboard_context(self) -> Dict[str, Any]:
        """Get fallback context for manual toolboard pin entry."""
        return {
            'id': 'manual',
            'name': 'Manual Configuration',
            'pins': {},
            'motor_ports': [],
            'fan_ports': [],
            'heater_ports': [],
            'thermistor_ports': [],
            'endstop_ports': [],
        }

    def _get_extruder_presets(self) -> Dict[str, Any]:
        """Get extruder preset values."""
        return {
            'sherpa_mini': {
                'rotation_distance': 22.67895,
                'gear_ratio': '50:10',
                'default_pa': 0.04,
            },
            'orbiter_v2': {
                'rotation_distance': 4.637,
                'gear_ratio': '7.5:1',
                'default_pa': 0.025,
            },
            'smart_orbiter_v3': {
                'rotation_distance': 4.69,
                'gear_ratio': '7.5:1',
                'default_pa': 0.015,
            },
            'clockwork2': {
                'rotation_distance': 22.6789511,
                'gear_ratio': '50:10',
                'default_pa': 0.04,
            },
            'galileo2': {
                'rotation_distance': 47.088,
                'gear_ratio': '9:1',
                'default_pa': 0.035,
            },
            'lgx_lite': {
                'rotation_distance': 8,
                'gear_ratio': '44:8',
                'default_pa': 0.04,
            },
            'bmg': {
                'rotation_distance': 22.6789511,
                'gear_ratio': '50:17',
                'default_pa': 0.05,
            },
            'vz_hextrudort_8t': {
                'rotation_distance': 22.2,
                'gear_ratio': '50:8',
                'default_pa': 0.02,
            },
            'vz_hextrudort_10t': {
                'rotation_distance': 22.2,
                'gear_ratio': '50:10',
                'default_pa': 0.02,
            },
            'custom': {
                'rotation_distance': 22.6789511,
                'gear_ratio': '50:10',
                'default_pa': 0.04,
            },
        }

    def generate(self) -> Dict[str, str]:
        """
        Generate all configuration files.

        Returns:
            Dict mapping file paths to their contents
        """
        context = self.get_context()
        rendered = self.renderer.render_all(context)

        # Group by output file
        files: Dict[str, List[str]] = {}

        for section_key, content in rendered.items():
            file_path = self.file_mapping.get(section_key, 'gschpoozi/misc.cfg')

            if file_path not in files:
                files[file_path] = []

            files[file_path].append(content)

        # Combine sections and add headers
        result = {}

        for file_path, sections in files.items():
            header = self._generate_header(file_path)
            content = header + "\n".join(sections)
            result[file_path] = content

        # Generate main printer.cfg with includes
        result['printer.cfg'] = self._generate_printer_cfg()

        # Generate user-overrides.cfg if it doesn't exist
        user_overrides_path = self.output_dir / "user-overrides.cfg"
        if not user_overrides_path.exists():
            result['user-overrides.cfg'] = self._generate_user_overrides()

        return result

    def _generate_header(self, file_path: str) -> str:
        """Generate file header with metadata."""
        description = self.OUTPUT_FILES.get(file_path, "Configuration")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return f"""#######################################
# {description}
# Generated by gschpoozi v2.0
# {timestamp}
#
# DO NOT EDIT - Changes will be overwritten
# Use user-overrides.cfg for customizations
#######################################

"""

    def _generate_printer_cfg(self) -> str:
        """Generate main printer.cfg with includes."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        includes = [
            "gschpoozi/mcu.cfg",
            "gschpoozi/steppers.cfg",
            "gschpoozi/extruder.cfg",
            "gschpoozi/bed.cfg",
            "gschpoozi/fans.cfg",
            "gschpoozi/probe.cfg",
            "gschpoozi/leveling.cfg",
            "gschpoozi/macros.cfg",
            "gschpoozi/tuning.cfg",
            "user-overrides.cfg",
        ]

        lines = [
            "#######################################",
            "# Klipper Configuration",
            f"# Generated by gschpoozi v2.0",
            f"# {timestamp}",
            "#",
            "# Edit user-overrides.cfg for customizations",
            "#######################################",
            "",
        ]

        for include in includes:
            lines.append(f"[include {include}]")

        lines.append("")

        return "\n".join(lines)

    def _generate_user_overrides(self) -> str:
        """Generate initial user-overrides.cfg."""
        return """#######################################
# User Overrides
#
# This file is preserved during config regeneration.
# Add your customizations here.
#######################################

# Example: Override stepper current
# [tmc2209 stepper_x]
# run_current: 1.2

# Example: Add custom macro
# [gcode_macro MY_MACRO]
# gcode:
#     G28

"""

    def write_files(self, files: Dict[str, str] = None) -> List[Path]:
        """
        Write generated files to disk.

        Args:
            files: Optional pre-generated files dict

        Returns:
            List of written file paths
        """
        if files is None:
            files = self.generate()

        written = []

        # Ensure gschpoozi directory exists
        gschpoozi_dir = self.output_dir / "gschpoozi"
        gschpoozi_dir.mkdir(parents=True, exist_ok=True)

        for file_path, content in files.items():
            full_path = self.output_dir / file_path

            # Create parent directories if needed
            full_path.parent.mkdir(parents=True, exist_ok=True)

            # Don't overwrite user-overrides.cfg if it exists
            if file_path == 'user-overrides.cfg' and full_path.exists():
                continue

            with open(full_path, 'w') as f:
                f.write(content)

            written.append(full_path)

        return written

    def preview(self) -> str:
        """Generate a preview of all config files."""
        files = self.generate()

        lines = ["=" * 60]
        lines.append("CONFIGURATION PREVIEW")
        lines.append("=" * 60)

        for file_path in sorted(files.keys()):
            lines.append("")
            lines.append(f"--- {file_path} ---")
            lines.append(files[file_path])

        return "\n".join(lines)


def main():
    """CLI entry point for testing."""
    generator = ConfigGenerator()

    if len(sys.argv) > 1 and sys.argv[1] == '--preview':
        print(generator.preview())
    else:
        files = generator.write_files()
        print(f"Generated {len(files)} files:")
        for path in files:
            print(f"  - {path}")


if __name__ == "__main__":
    main()

