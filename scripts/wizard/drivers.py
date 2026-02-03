"""
drivers.py - TMC driver constants shared across wizard and generator.
"""

# Maps wizard driver names to Klipper config section names.
# TMC2226 is pin/register-compatible with TMC2209 in Klipper.
KLIPPER_TMC_SECTION = {
    "TMC2209": "tmc2209",
    "TMC2208": "tmc2208",
    "TMC2226": "tmc2209",
    "TMC5160": "tmc5160",
    "TMC2130": "tmc2130",
    "TMC2240": "tmc2240",
    "TMC2660": "tmc2660",
}

# Drivers that use SPI protocol
SPI_DRIVERS = {"TMC5160", "TMC2130", "TMC2240", "TMC2660"}

# Drivers that lack StallGuard (no sensorless homing)
NO_STALLGUARD_DRIVERS = {"TMC2208"}
