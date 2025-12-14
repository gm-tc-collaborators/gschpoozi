"""
generator.py - Main config generator

Orchestrates loading state, rendering templates, and writing config files.
"""

import os
import sys
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
        "gschpoozi/mcu.cfg": "MCU definitions",
        "gschpoozi/steppers.cfg": "Stepper motors and drivers",
        "gschpoozi/extruder.cfg": "Extruder and hotend",
        "gschpoozi/bed.cfg": "Heated bed",
        "gschpoozi/fans.cfg": "Fan configuration",
        "gschpoozi/probe.cfg": "Probe and homing",
        "gschpoozi/leveling.cfg": "Bed leveling",
        "gschpoozi/macros.cfg": "G-code macros",
        "gschpoozi/tuning.cfg": "Tuning and optional features",
    }
    
    def __init__(
        self,
        state: WizardState = None,
        output_dir: Path = None,
        renderer: TemplateRenderer = None
    ):
        self.state = state or get_state()
        self.output_dir = output_dir or Path.home() / "printer_data" / "config"
        self.renderer = renderer or TemplateRenderer()
        
        # Section to file mapping
        self.file_mapping = {
            'mcu.main': 'gschpoozi/mcu.cfg',
            'mcu.toolboard': 'gschpoozi/mcu.cfg',
            'mcu.host': 'gschpoozi/mcu.cfg',
            'printer': 'gschpoozi/mcu.cfg',
            'stepper_x': 'gschpoozi/steppers.cfg',
            'tmc_stepper_x': 'gschpoozi/steppers.cfg',
            'stepper_y': 'gschpoozi/steppers.cfg',
            'tmc_stepper_y': 'gschpoozi/steppers.cfg',
            'stepper_z': 'gschpoozi/steppers.cfg',
            'tmc_stepper_z': 'gschpoozi/steppers.cfg',
            'extruder': 'gschpoozi/extruder.cfg',
            'heater_bed': 'gschpoozi/bed.cfg',
            'fan': 'gschpoozi/fans.cfg',
            'heater_fan': 'gschpoozi/fans.cfg',
            'controller_fan': 'gschpoozi/fans.cfg',
            'probe': 'gschpoozi/probe.cfg',
            'bltouch': 'gschpoozi/probe.cfg',
            'safe_z_home': 'gschpoozi/probe.cfg',
            'bed_mesh': 'gschpoozi/leveling.cfg',
            'z_tilt': 'gschpoozi/leveling.cfg',
            'quad_gantry_level': 'gschpoozi/leveling.cfg',
            'common.virtual_sdcard': 'gschpoozi/tuning.cfg',
            'common.idle_timeout': 'gschpoozi/tuning.cfg',
            'common.pause_resume': 'gschpoozi/tuning.cfg',
            'common.exclude_object': 'gschpoozi/tuning.cfg',
            'common.gcode_arcs': 'gschpoozi/tuning.cfg',
            'common.respond': 'gschpoozi/tuning.cfg',
            'common.save_variables': 'gschpoozi/tuning.cfg',
            'common.force_move': 'gschpoozi/tuning.cfg',
            'common.firmware_retraction': 'gschpoozi/tuning.cfg',
        }
    
    def get_context(self) -> Dict[str, Any]:
        """Get context for template rendering from wizard state."""
        context = self.state.export_for_generator()
        
        # Add board pin definitions (would come from board templates)
        # This is a placeholder - actual implementation would load from templates/boards/
        context['board'] = self._get_board_context()
        context['toolboard'] = self._get_toolboard_context()
        context['extruder_presets'] = self._get_extruder_presets()
        
        return context
    
    def _get_board_context(self) -> Dict[str, Any]:
        """Get main board pin definitions."""
        # Placeholder - would load from templates/boards/{board_type}.yaml
        board_type = self.state.get('mcu.main.board_type', 'other')
        
        # Return a generic structure for now
        return {
            'pins': {},  # Would be populated from board template
            'motor_ports': ['MOTOR0', 'MOTOR1', 'MOTOR2', 'MOTOR3', 'MOTOR4', 'MOTOR5'],
            'endstop_ports': ['ENDSTOP_X', 'ENDSTOP_Y', 'ENDSTOP_Z'],
            'fan_ports': ['FAN0', 'FAN1', 'FAN2', 'FAN3'],
            'heater_ports': ['HE0', 'HE1', 'HE2', 'HB'],
            'thermistor_ports': ['T0', 'T1', 'T2', 'TB'],
        }
    
    def _get_toolboard_context(self) -> Dict[str, Any]:
        """Get toolboard pin definitions."""
        if not self.state.get('mcu.toolboard.enabled'):
            return {}
        
        return {
            'pins': {},
            'motor_ports': ['MOTOR'],
            'fan_ports': ['FAN0', 'FAN1'],
            'heater_ports': ['HE'],
            'thermistor_ports': ['T0'],
            'endstop_ports': ['ENDSTOP'],
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

