#!/usr/bin/env python3
"""
Movement Safety Validator for Klipper Configurations
Checks position limits to prevent crashes and mechanical damage

This is a generic validator with sensible defaults.
For your specific printer, you may want to adjust the limits
or create a printer-specific configuration.
"""

import sys
import re
from pathlib import Path


class MovementValidator:
    # Default safe limits - these are generous defaults
    # Adjust for your specific printer!
    DEFAULT_LIMITS = {
        'stepper_x': {
            'position_min': -10,   # Allow small negative for bed clips etc
            'position_max': 500,   # Generous max - adjust for your printer
            'name': 'X axis',
        },
        'stepper_y': {
            'position_min': -10,
            'position_max': 500,
            'name': 'Y axis',
        },
        'stepper_z': {
            'position_min': -5,    # Allow negative for Z offset
            'position_max': 500,
            'name': 'Z axis',
        },
    }

    # Safe homing speed ranges (mm/s)
    SAFE_HOMING_SPEED = {
        'min': 5,
        'max': 150,
        'recommended_max': 80,
    }

    def __init__(self, config_file):
        self.config_file = Path(config_file)
        self.errors = []
        self.warnings = []

    def read_config(self):
        """Read configuration file"""
        try:
            with open(self.config_file, 'r') as f:
                return f.read()
        except FileNotFoundError:
            self.errors.append(f"Config file not found: {self.config_file}")
            return ""

    def check_stepper_section(self, content, section_name, limits):
        """Check movement limits for a specific stepper section"""
        # Find the section
        pattern = rf'\[{re.escape(section_name)}\](.*?)(?=\n\[|\Z)'
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            return  # Section not found, that's OK

        section_content = match.group(1)

        # Check position_max
        max_match = re.search(r'position_max:\s*(-?\d+\.?\d*)', section_content)
        if max_match:
            pos_max = float(max_match.group(1))

            if pos_max > limits['position_max']:
                self.warnings.append(
                    f"[{section_name}] position_max very high: {pos_max}mm "
                    f"(default limit: {limits['position_max']}mm) "
                    f"- verify this matches your printer!"
                )

        # Check position_min
        min_match = re.search(r'position_min:\s*(-?\d+\.?\d*)', section_content)
        if min_match:
            pos_min = float(min_match.group(1))

            if pos_min < limits['position_min']:
                self.warnings.append(
                    f"[{section_name}] position_min quite low: {pos_min}mm "
                    f"(default limit: {limits['position_min']}mm) "
                    f"- verify this is intentional"
                )

        # Check homing_speed
        homing_match = re.search(r'homing_speed:\s*(-?\d+\.?\d*)', section_content)
        if homing_match:
            homing_speed = float(homing_match.group(1))

            if homing_speed > self.SAFE_HOMING_SPEED['max']:
                self.errors.append(
                    f"[{section_name}] homing_speed too high: {homing_speed}mm/s "
                    f"(maximum safe: {self.SAFE_HOMING_SPEED['max']}mm/s) "
                    f"- may cause skipped steps or crashes"
                )
            elif homing_speed > self.SAFE_HOMING_SPEED['recommended_max']:
                self.warnings.append(
                    f"[{section_name}] homing_speed higher than recommended: {homing_speed}mm/s "
                    f"(recommended max: {self.SAFE_HOMING_SPEED['recommended_max']}mm/s)"
                )
            elif homing_speed < self.SAFE_HOMING_SPEED['min']:
                self.warnings.append(
                    f"[{section_name}] homing_speed very slow: {homing_speed}mm/s "
                    f"(may take excessive time)"
                )

    def check_extruder_limits(self, content):
        """Check extruder-specific movement limits"""
        pattern = r'\[extruder\](.*?)(?=\n\[|\Z)'
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            return

        section_content = match.group(1)

        # Check max_extrude_only_distance
        max_extrude_match = re.search(
            r'max_extrude_only_distance:\s*(-?\d+\.?\d*)',
            section_content
        )
        if max_extrude_match:
            max_extrude = float(max_extrude_match.group(1))

            if max_extrude > 1000:
                self.warnings.append(
                    f"[extruder] max_extrude_only_distance very high: {max_extrude}mm "
                    f"(typical: 50-200mm, filament loading: 400-600mm)"
                )

        # Check for disabled extrusion limits (safety risk)
        if re.search(r'max_extrude_only_distance:\s*99999', section_content):
            self.errors.append(
                "[extruder] Extrusion limits effectively disabled (99999mm) "
                "- safety feature bypassed!"
            )

    def validate(self):
        """Run all validation checks"""
        content = self.read_config()

        if not content:
            return False

        # Check each stepper axis
        for section_name, limits in self.DEFAULT_LIMITS.items():
            self.check_stepper_section(content, section_name, limits)

        # Check extruder
        self.check_extruder_limits(content)

        return len(self.errors) == 0

    def report(self):
        """Print validation report"""
        if self.errors:
            print("MOVEMENT SAFETY ERRORS:")
            for error in self.errors:
                print(f"  ERROR: {error}")
            print()

        if self.warnings:
            print("MOVEMENT SAFETY WARNINGS:")
            for warning in self.warnings:
                print(f"  WARNING: {warning}")
            print()

        if not self.errors and not self.warnings:
            print("Movement limits OK")
            return True

        return len(self.errors) == 0


def main():
    if len(sys.argv) != 2:
        print("Usage: validate-movement.py <config-file>")
        sys.exit(1)

    validator = MovementValidator(sys.argv[1])
    success = validator.validate()
    validator.report()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
