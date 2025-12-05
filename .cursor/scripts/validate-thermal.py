#!/usr/bin/env python3
"""
Thermal Safety Validator for Klipper Configurations
Checks temperature limits to prevent dangerous configurations

This is a generic validator - adjust SAFE_LIMITS for your hardware.
"""

import sys
import re
from pathlib import Path


class ThermalValidator:
    # Default safe maximum temperatures
    # Adjust these for your specific hardware!
    SAFE_LIMITS = {
        'extruder': {
            'max_temp': 300,  # All-metal hotend limit
            'min_temp': 0,    # Never go below 0 (disables safety)
            'warning_temp': 280,  # Warn if approaching limits
        },
        'heater_bed': {
            'max_temp': 130,  # Aluminum bed safe limit
            'min_temp': 0,
            'warning_temp': 120,
        },
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

    def check_heater_section(self, content, section_name, limits):
        """Check thermal limits for a specific heater section"""
        # Find the section
        pattern = rf'\[{re.escape(section_name)}\](.*?)(?=\n\[|\Z)'
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            return  # Section not found, that's OK

        section_content = match.group(1)

        # Check max_temp
        max_temp_match = re.search(r'max_temp:\s*(-?\d+\.?\d*)', section_content)
        if max_temp_match:
            max_temp = float(max_temp_match.group(1))

            if max_temp > limits['max_temp']:
                self.errors.append(
                    f"[{section_name}] max_temp too high: {max_temp}C "
                    f"(safe maximum: {limits['max_temp']}C)"
                )
            elif max_temp > limits['warning_temp']:
                self.warnings.append(
                    f"[{section_name}] max_temp approaching limit: {max_temp}C "
                    f"(recommended maximum: {limits['warning_temp']}C)"
                )

        # Check min_temp
        min_temp_match = re.search(r'min_temp:\s*(-?\d+\.?\d*)', section_content)
        if min_temp_match:
            min_temp = float(min_temp_match.group(1))

            if min_temp < limits['min_temp']:
                self.errors.append(
                    f"[{section_name}] min_temp below safe minimum: {min_temp}C "
                    f"(minimum should be {limits['min_temp']}C to enable thermal protection)"
                )

    def check_thermal_runaway_protection(self, content):
        """Check if thermal runaway protection is enabled"""
        # Look for disabled thermal protection
        if re.search(r'max_error:\s*999', content):
            self.warnings.append(
                "Thermal protection may be effectively disabled (max_error: 999)"
            )

        if re.search(r'check_gain_time:\s*0', content):
            self.warnings.append(
                "Thermal protection disabled (check_gain_time: 0)"
            )

    def validate(self):
        """Run all validation checks"""
        content = self.read_config()

        if not content:
            return False

        # Check extruder
        self.check_heater_section(content, 'extruder', self.SAFE_LIMITS['extruder'])

        # Check additional extruders (extruder1, extruder2, etc.)
        for i in range(1, 10):
            self.check_heater_section(
                content,
                f'extruder{i}',
                self.SAFE_LIMITS['extruder']
            )

        # Check heated bed
        self.check_heater_section(content, 'heater_bed', self.SAFE_LIMITS['heater_bed'])

        # Check thermal runaway protection
        self.check_thermal_runaway_protection(content)

        return len(self.errors) == 0

    def report(self):
        """Print validation report"""
        if self.errors:
            print("THERMAL SAFETY ERRORS:")
            for error in self.errors:
                print(f"  ERROR: {error}")
            print()

        if self.warnings:
            print("THERMAL SAFETY WARNINGS:")
            for warning in self.warnings:
                print(f"  WARNING: {warning}")
            print()

        if not self.errors and not self.warnings:
            print("Thermal limits OK")
            return True

        return len(self.errors) == 0


def main():
    if len(sys.argv) != 2:
        print("Usage: validate-thermal.py <config-file>")
        sys.exit(1)

    validator = ThermalValidator(sys.argv[1])
    success = validator.validate()
    validator.report()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
