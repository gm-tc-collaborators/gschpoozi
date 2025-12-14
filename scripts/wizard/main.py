#!/usr/bin/env python3
"""
main.py - gschpoozi Configuration Wizard Entry Point

This is the main entry point for the Klipper configuration wizard.
Run with: python3 scripts/wizard/main.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from wizard.ui import WizardUI
from wizard.state import get_state, WizardState


class GschpooziWizard:
    """Main wizard controller."""
    
    VERSION = "2.0.0"
    
    def __init__(self):
        self.ui = WizardUI(
            title="gschpoozi",
            backtitle=f"gschpoozi v{self.VERSION} - Klipper Configuration Wizard"
        )
        self.state = get_state()
    
    def run(self) -> int:
        """Run the wizard. Returns exit code."""
        try:
            self.main_menu()
            return 0
        except KeyboardInterrupt:
            return 130
        except Exception as e:
            self.ui.msgbox(f"Error: {e}", title="Error")
            return 1
    
    def main_menu(self) -> None:
        """Display the main menu."""
        while True:
            status = self._get_status_text()
            
            choice = self.ui.menu(
                f"Welcome to gschpoozi!\n\n{status}\n\nSelect a category:",
                [
                    ("1", "Klipper Setup         (Installation & verification)"),
                    ("2", "Hardware Setup        (Configure your printer)"),
                    ("3", "Tuning & Optimization (Macros, input shaper, etc.)"),
                    ("G", "Generate Config       (Create printer.cfg)"),
                    ("Q", "Quit"),
                ],
                height=18,
                width=70,
            )
            
            if choice is None or choice == "Q":
                if self.ui.yesno("Are you sure you want to exit?", default_no=True):
                    break
            elif choice == "1":
                self.klipper_setup_menu()
            elif choice == "2":
                self.hardware_setup_menu()
            elif choice == "3":
                self.tuning_menu()
            elif choice == "G":
                self.generate_config()
    
    def _get_status_text(self) -> str:
        """Get status text showing configuration progress."""
        completion = self.state.get_completion_status()
        
        done = sum(1 for v in completion.values() if v)
        total = len(completion)
        
        if done == 0:
            return "Status: Not started"
        elif done == total:
            return "Status: Configuration complete! Ready to generate."
        else:
            items = [k for k, v in completion.items() if v]
            return f"Status: {done}/{total} sections configured ({', '.join(items)})"
    
    # -------------------------------------------------------------------------
    # Category 1: Klipper Setup
    # -------------------------------------------------------------------------
    
    def klipper_setup_menu(self) -> None:
        """Klipper installation and verification menu."""
        while True:
            choice = self.ui.menu(
                "Klipper Setup - Installation & Verification\n\n"
                "These options help verify your Klipper installation.",
                [
                    ("1.1", "Check Klipper         (Verify installation)"),
                    ("1.2", "Check Moonraker       (Verify API)"),
                    ("1.3", "Web Interface         (Mainsail/Fluidd)"),
                    ("1.4", "Optional Services     (Crowsnest, KlipperScreen)"),
                    ("B", "Back to Main Menu"),
                ],
                title="1. Klipper Setup",
            )
            
            if choice is None or choice == "B":
                break
            elif choice == "1.1":
                self._check_klipper()
            elif choice == "1.2":
                self._check_moonraker()
            elif choice == "1.3":
                self._web_interface_menu()
            elif choice == "1.4":
                self._optional_services_menu()
    
    def _check_klipper(self) -> None:
        """Check Klipper installation status."""
        # TODO: Actually check Klipper status
        klipper_path = Path.home() / "klipper"
        klippy_env = Path.home() / "klippy-env"
        
        status_lines = []
        
        if klipper_path.exists():
            status_lines.append("✓ Klipper directory found")
        else:
            status_lines.append("✗ Klipper directory NOT found")
        
        if klippy_env.exists():
            status_lines.append("✓ Klippy virtual environment found")
        else:
            status_lines.append("✗ Klippy virtual environment NOT found")
        
        # Check service
        import subprocess
        result = subprocess.run(
            ["systemctl", "is-active", "klipper"],
            capture_output=True, text=True
        )
        if result.stdout.strip() == "active":
            status_lines.append("✓ Klipper service is running")
        else:
            status_lines.append("✗ Klipper service is NOT running")
        
        self.ui.msgbox(
            "Klipper Installation Status:\n\n" + "\n".join(status_lines),
            title="Klipper Check"
        )
    
    def _check_moonraker(self) -> None:
        """Check Moonraker installation status."""
        moonraker_path = Path.home() / "moonraker"
        
        status_lines = []
        
        if moonraker_path.exists():
            status_lines.append("✓ Moonraker directory found")
        else:
            status_lines.append("✗ Moonraker directory NOT found")
        
        # Check service
        import subprocess
        result = subprocess.run(
            ["systemctl", "is-active", "moonraker"],
            capture_output=True, text=True
        )
        if result.stdout.strip() == "active":
            status_lines.append("✓ Moonraker service is running")
        else:
            status_lines.append("✗ Moonraker service is NOT running")
        
        self.ui.msgbox(
            "Moonraker Installation Status:\n\n" + "\n".join(status_lines),
            title="Moonraker Check"
        )
    
    def _web_interface_menu(self) -> None:
        """Web interface selection."""
        self.ui.msgbox(
            "Web Interface Setup\n\n"
            "This section will help you install/verify Mainsail or Fluidd.\n\n"
            "(Coming soon - use KIAUH for now)",
            title="1.3 Web Interface"
        )
    
    def _optional_services_menu(self) -> None:
        """Optional services menu."""
        self.ui.msgbox(
            "Optional Services\n\n"
            "• Crowsnest - Camera streaming\n"
            "• KlipperScreen - Touch screen interface\n"
            "• Timelapse - Print timelapses\n"
            "• Sonar - Network keepalive\n\n"
            "(Coming soon - use KIAUH for now)",
            title="1.4 Optional Services"
        )
    
    # -------------------------------------------------------------------------
    # Category 2: Hardware Setup
    # -------------------------------------------------------------------------
    
    def hardware_setup_menu(self) -> None:
        """Hardware configuration menu."""
        while True:
            choice = self.ui.menu(
                "Hardware Setup - Configure Your Printer\n\n"
                "Work through these sections to configure your hardware.",
                [
                    ("2.1", "MCU Configuration     (Boards & connections)"),
                    ("2.2", "Printer Settings      (Kinematics & limits)"),
                    ("2.3", "X Axis                (Stepper & driver)"),
                    ("2.4", "Y Axis                (Stepper & driver)"),
                    ("2.5", "Z Axis                (Stepper(s) & driver(s))"),
                    ("2.6", "Extruder              (Motor & hotend)"),
                    ("2.7", "Heated Bed            (Heater & thermistor)"),
                    ("2.8", "Fans                  (Part cooling, hotend, etc.)"),
                    ("2.9", "Probe                 (BLTouch, Beacon, etc.)"),
                    ("2.10", "Homing               (Safe Z home, sensorless)"),
                    ("2.11", "Bed Leveling         (Mesh, Z tilt, QGL)"),
                    ("2.12", "Temperature Sensors  (MCU, chamber, etc.)"),
                    ("2.13", "LEDs                 (Neopixel, case light)"),
                    ("2.14", "Filament Sensors     (Runout detection)"),
                    ("2.15", "Display              (LCD, OLED)"),
                    ("2.16", "Advanced             (Servo, buttons, etc.)"),
                    ("B", "Back to Main Menu"),
                ],
                title="2. Hardware Setup",
                height=22,
            )
            
            if choice is None or choice == "B":
                break
            elif choice == "2.1":
                self._mcu_setup()
            elif choice == "2.2":
                self._printer_settings()
            elif choice == "2.3":
                self._stepper_axis("x")
            elif choice == "2.4":
                self._stepper_axis("y")
            elif choice == "2.5":
                self._stepper_z()
            elif choice == "2.6":
                self._extruder_setup()
            elif choice == "2.7":
                self._heater_bed_setup()
            elif choice == "2.8":
                self._fans_setup()
            elif choice == "2.9":
                self._probe_setup()
            elif choice == "2.10":
                self._homing_setup()
            elif choice == "2.11":
                self._bed_leveling_setup()
            else:
                # Placeholder for remaining sections (2.12-2.16)
                self.ui.msgbox(
                    f"Section {choice} coming soon!\n\n"
                    "Optional hardware - implement as needed.",
                    title=f"Section {choice}"
                )
    
    def _mcu_setup(self) -> None:
        """MCU configuration wizard."""
        while True:
            choice = self.ui.menu(
                "MCU Configuration\n\n"
                "Configure your printer's control boards.",
                [
                    ("2.1.1", "Main Board            (Required)"),
                    ("2.1.2", "Toolhead Board        (Optional)"),
                    ("2.1.3", "Host MCU              (For ADXL, GPIO)"),
                    ("2.1.4", "Additional MCUs       (Multi-board setups)"),
                    ("B", "Back"),
                ],
                title="2.1 MCU Configuration",
            )
            
            if choice is None or choice == "B":
                break
            elif choice == "2.1.1":
                self._configure_main_board()
            elif choice == "2.1.2":
                self._configure_toolboard()
            elif choice == "2.1.3":
                self._configure_host_mcu()
            else:
                self.ui.msgbox("Coming soon!", title=choice)
    
    def _configure_main_board(self) -> None:
        """Configure main board."""
        # Board selection (placeholder - would load from templates)
        boards = [
            ("btt-octopus-v1.1", "BTT Octopus v1.1"),
            ("btt-octopus-pro", "BTT Octopus Pro"),
            ("btt-manta-m8p", "BTT Manta M8P"),
            ("btt-skr-3", "BTT SKR 3"),
            ("fysetc-spider", "Fysetc Spider"),
            ("other", "Other / Manual"),
        ]
        
        current = self.state.get("mcu.main.board_type", "")
        
        board = self.ui.radiolist(
            "Select your main control board:",
            [(b, d, b == current) for b, d in boards],
            title="Main Board Selection",
        )
        
        if board is None:
            return
        
        # Serial detection (placeholder)
        self.ui.infobox("Scanning for connected MCUs...", title="Detecting")
        
        import subprocess
        import time
        time.sleep(1)  # Simulated scan
        
        # Try to find serial devices
        serial_path = ""
        serial_dir = Path("/dev/serial/by-id")
        if serial_dir.exists():
            devices = list(serial_dir.iterdir())
            if devices:
                # Show selection
                device_items = [(str(d), d.name) for d in devices]
                device_items.append(("manual", "Enter manually"))
                
                selected = self.ui.radiolist(
                    "Select the serial device for your main board:",
                    [(d, n, False) for d, n in device_items],
                    title="Serial Device",
                )
                
                if selected == "manual":
                    serial_path = self.ui.inputbox(
                        "Enter the serial path:",
                        default="/dev/serial/by-id/usb-Klipper_"
                    )
                elif selected:
                    serial_path = selected
        else:
            serial_path = self.ui.inputbox(
                "No devices found. Enter serial path manually:",
                default="/dev/serial/by-id/usb-Klipper_"
            )
        
        if serial_path:
            # Save configuration
            self.state.set("mcu.main.board_type", board)
            self.state.set("mcu.main.serial", serial_path)
            self.state.set("mcu.main.connection_type", "USB")
            self.state.save()
            
            self.ui.msgbox(
                f"Main board configured!\n\n"
                f"Board: {board}\n"
                f"Serial: {serial_path}",
                title="Success"
            )
    
    def _configure_toolboard(self) -> None:
        """Configure toolhead board."""
        if not self.ui.yesno(
            "Do you have a toolhead board?\n\n"
            "(CAN or USB connected board on the toolhead)",
            title="Toolhead Board"
        ):
            self.state.delete("mcu.toolboard")
            self.state.save()
            return
        
        # Connection type
        conn_type = self.ui.radiolist(
            "How is your toolhead board connected?",
            [
                ("USB", "USB (direct connection)", False),
                ("CAN", "CAN bus", True),
            ],
            title="Connection Type",
        )
        
        if conn_type is None:
            return
        
        if conn_type == "CAN":
            self.ui.msgbox(
                "CAN Bus Setup\n\n"
                "CAN bus requires additional setup:\n"
                "1. CAN adapter or USB-CAN bridge\n"
                "2. Network interface configuration\n"
                "3. Toolboard UUID detection\n\n"
                "Reference: canbus.esoterical.online",
                title="CAN Bus Info"
            )
            
            # Bitrate selection
            bitrate = self.ui.radiolist(
                "Select CAN bus bitrate:",
                [
                    ("1000000", "1Mbit/s (recommended)", True),
                    ("500000", "500Kbit/s", False),
                    ("250000", "250Kbit/s (rare)", False),
                ],
                title="CAN Bitrate"
            )
            
            uuid = self.ui.inputbox(
                "Enter toolboard CAN UUID:\n\n"
                "(Run: ~/klippy-env/bin/python ~/klipper/scripts/canbus_query.py can0)",
                default=""
            )
            
            if uuid:
                self.state.set("mcu.toolboard.connection_type", "CAN")
                self.state.set("mcu.toolboard.canbus_uuid", uuid)
                self.state.set("mcu.toolboard.canbus_bitrate", int(bitrate or 1000000))
                self.state.save()
                
                self.ui.msgbox(f"Toolboard configured!\n\nUUID: {uuid}", title="Success")
        else:
            # USB toolboard
            serial = self.ui.inputbox(
                "Enter toolboard serial path:",
                default="/dev/serial/by-id/usb-Klipper_"
            )
            
            if serial:
                self.state.set("mcu.toolboard.connection_type", "USB")
                self.state.set("mcu.toolboard.serial", serial)
                self.state.save()
                
                self.ui.msgbox(f"Toolboard configured!\n\nSerial: {serial}", title="Success")
    
    def _configure_host_mcu(self) -> None:
        """Configure host MCU (Raspberry Pi)."""
        enabled = self.ui.yesno(
            "Enable Host MCU?\n\n"
            "This allows using Raspberry Pi GPIO pins for:\n"
            "• ADXL345 accelerometer\n"
            "• Additional GPIO outputs\n"
            "• Neopixel on Pi GPIO",
            title="Host MCU"
        )
        
        self.state.set("mcu.host.enabled", enabled)
        self.state.save()
        
        if enabled:
            self.ui.msgbox(
                "Host MCU enabled!\n\n"
                "Make sure klipper_mcu service is installed.\n"
                "Serial: /tmp/klipper_host_mcu",
                title="Host MCU"
            )
    
    def _printer_settings(self) -> None:
        """Configure printer settings."""
        # Kinematics
        kinematics = self.ui.radiolist(
            "Select your printer's kinematics:",
            [
                ("corexy", "CoreXY (Voron, VzBot, etc.)", True),
                ("cartesian", "Cartesian (Ender, Prusa, etc.)", False),
                ("corexz", "CoreXZ", False),
                ("delta", "Delta", False),
            ],
            title="Kinematics"
        )
        
        if kinematics is None:
            return
        
        # Bed size
        bed_x = self.ui.inputbox("Bed X size (mm):", default="350")
        if bed_x is None:
            return
        
        bed_y = self.ui.inputbox("Bed Y size (mm):", default="350")
        if bed_y is None:
            return
        
        bed_z = self.ui.inputbox("Z height (mm):", default="350")
        if bed_z is None:
            return
        
        # Velocity limits
        max_velocity = self.ui.inputbox("Max velocity (mm/s):", default="300")
        max_accel = self.ui.inputbox("Max acceleration (mm/s²):", default="3000")
        
        # Save
        self.state.set("printer.kinematics", kinematics)
        self.state.set("printer.bed_size_x", int(bed_x))
        self.state.set("printer.bed_size_y", int(bed_y))
        self.state.set("printer.bed_size_z", int(bed_z))
        self.state.set("printer.max_velocity", int(max_velocity or 300))
        self.state.set("printer.max_accel", int(max_accel or 3000))
        self.state.save()
        
        self.ui.msgbox(
            f"Printer settings saved!\n\n"
            f"Kinematics: {kinematics}\n"
            f"Bed: {bed_x}x{bed_y}x{bed_z}mm\n"
            f"Max velocity: {max_velocity}mm/s\n"
            f"Max accel: {max_accel}mm/s²",
            title="Settings Saved"
        )
    
    def _stepper_axis(self, axis: str) -> None:
        """Configure X or Y axis stepper."""
        axis_upper = axis.upper()
        state_key = f"stepper_{axis}"
        
        # Motor port (simplified - would come from board template)
        motor_port = self.ui.inputbox(
            f"Motor port for {axis_upper} axis (e.g., MOTOR0, MOTOR1):",
            default=f"MOTOR{'0' if axis == 'x' else '1'}",
            title=f"Stepper {axis_upper} - Motor Port"
        )
        if motor_port is None:
            return
        
        # Belt configuration
        belt_pitch = self.ui.radiolist(
            f"Belt pitch for {axis_upper} axis:",
            [
                ("2", "2mm GT2 (most common)", True),
                ("3", "3mm HTD3M", False),
            ],
            title=f"Stepper {axis_upper} - Belt"
        )
        
        pulley_teeth = self.ui.radiolist(
            f"Pulley teeth for {axis_upper} axis:",
            [
                ("16", "16 tooth", False),
                ("20", "20 tooth (most common)", True),
                ("24", "24 tooth", False),
            ],
            title=f"Stepper {axis_upper} - Pulley"
        )
        
        # Endstop
        endstop_type = self.ui.radiolist(
            f"Endstop type for {axis_upper} axis:",
            [
                ("physical", "Physical switch", True),
                ("sensorless", "Sensorless (StallGuard)", False),
            ],
            title=f"Stepper {axis_upper} - Endstop"
        )
        
        # Position
        bed_size = self.state.get(f"printer.bed_size_{axis}", 350)
        position_max = self.ui.inputbox(
            f"Position max for {axis_upper} (mm):",
            default=str(bed_size),
            title=f"Stepper {axis_upper} - Position"
        )
        
        position_endstop = self.ui.inputbox(
            f"Position endstop for {axis_upper} (0 for min, {position_max} for max):",
            default=position_max,
            title=f"Stepper {axis_upper} - Endstop Position"
        )
        
        # TMC Driver
        run_current = self.ui.inputbox(
            f"TMC run current for {axis_upper} (A):",
            default="1.0",
            title=f"Stepper {axis_upper} - Driver"
        )
        
        # Save
        self.state.set(f"{state_key}.motor_port", motor_port)
        self.state.set(f"{state_key}.belt_pitch", int(belt_pitch or 2))
        self.state.set(f"{state_key}.pulley_teeth", int(pulley_teeth or 20))
        self.state.set(f"{state_key}.endstop_type", endstop_type or "physical")
        self.state.set(f"{state_key}.position_max", int(position_max or bed_size))
        self.state.set(f"{state_key}.position_endstop", int(position_endstop or position_max or bed_size))
        self.state.set(f"{state_key}.run_current", float(run_current or 1.0))
        self.state.save()
        
        self.ui.msgbox(
            f"Stepper {axis_upper} configured!\n\n"
            f"Motor: {motor_port}\n"
            f"Belt: {belt_pitch}mm × {pulley_teeth}T\n"
            f"Endstop: {endstop_type}\n"
            f"Position: 0 to {position_max}mm\n"
            f"Current: {run_current}A",
            title="Configuration Saved"
        )
    
    def _stepper_z(self) -> None:
        """Configure Z axis stepper(s)."""
        # Number of Z motors
        z_count = self.ui.radiolist(
            "How many Z motors?",
            [
                ("1", "Single Z motor", False),
                ("2", "Dual Z (Z tilt)", False),
                ("3", "Triple Z", False),
                ("4", "Quad Z (QGL)", True),
            ],
            title="Z Axis - Motor Count"
        )
        
        # Drive type
        drive_type = self.ui.radiolist(
            "Z drive type:",
            [
                ("leadscrew", "Leadscrew (T8, TR8)", True),
                ("belt", "Belt driven", False),
            ],
            title="Z Axis - Drive"
        )
        
        if drive_type == "leadscrew":
            pitch = self.ui.radiolist(
                "Leadscrew pitch:",
                [
                    ("8", "8mm (T8 standard)", True),
                    ("4", "4mm (high speed)", False),
                    ("2", "2mm (TR8x2)", False),
                ],
                title="Z Axis - Leadscrew"
            )
        else:
            pitch = "2"  # Belt driven uses belt pitch
        
        # Endstop
        endstop_type = self.ui.radiolist(
            "Z endstop type:",
            [
                ("probe", "Probe (virtual endstop)", True),
                ("physical_mainboard", "Physical switch (mainboard)", False),
                ("physical_toolboard", "Physical switch (toolboard)", False),
            ],
            title="Z Axis - Endstop"
        )
        
        # Position
        bed_z = self.state.get("printer.bed_size_z", 350)
        position_max = self.ui.inputbox(
            "Z position max (mm):",
            default=str(bed_z),
            title="Z Axis - Position"
        )
        
        # Current
        run_current = self.ui.inputbox(
            "TMC run current for Z (A):",
            default="0.8",
            title="Z Axis - Driver"
        )
        
        # Save
        self.state.set("stepper_z.z_motor_count", int(z_count or 4))
        self.state.set("stepper_z.drive_type", drive_type or "leadscrew")
        self.state.set("stepper_z.leadscrew_pitch", int(pitch or 8))
        self.state.set("stepper_z.endstop_type", endstop_type or "probe")
        self.state.set("stepper_z.position_max", int(position_max or bed_z))
        self.state.set("stepper_z.run_current", float(run_current or 0.8))
        self.state.save()
        
        self.ui.msgbox(
            f"Z Axis configured!\n\n"
            f"Motors: {z_count}\n"
            f"Drive: {drive_type} ({pitch}mm)\n"
            f"Endstop: {endstop_type}\n"
            f"Height: {position_max}mm\n"
            f"Current: {run_current}A",
            title="Configuration Saved"
        )
    
    def _extruder_setup(self) -> None:
        """Configure extruder."""
        # Extruder type
        extruder_types = [
            ("sherpa_mini", "Sherpa Mini"),
            ("orbiter_v2", "Orbiter v2.0/v2.5"),
            ("smart_orbiter_v3", "Smart Orbiter v3"),
            ("clockwork2", "Clockwork 2"),
            ("galileo2", "Galileo 2"),
            ("lgx_lite", "LGX Lite"),
            ("bmg", "BMG"),
            ("vz_hextrudort_10t", "VZ-Hextrudort 10T"),
            ("custom", "Custom"),
        ]
        
        extruder_type = self.ui.radiolist(
            "Select your extruder type:",
            [(k, v, False) for k, v in extruder_types],
            title="Extruder - Type"
        )
        
        # Location
        has_toolboard = self.state.get("mcu.toolboard.enabled", False)
        if has_toolboard:
            location = self.ui.radiolist(
                "Where is the extruder motor connected?",
                [
                    ("mainboard", "Mainboard", False),
                    ("toolboard", "Toolboard", True),
                ],
                title="Extruder - Location"
            )
        else:
            location = "mainboard"
        
        # Thermistor
        sensor_type = self.ui.radiolist(
            "Hotend thermistor type:",
            [
                ("Generic 3950", "Generic 3950 (most common)", True),
                ("ATC Semitec 104GT-2", "ATC Semitec 104GT-2", False),
                ("PT1000", "PT1000", False),
                ("SliceEngineering 450", "SliceEngineering 450°C", False),
            ],
            title="Extruder - Thermistor"
        )
        
        # Max temp
        max_temp = self.ui.inputbox(
            "Maximum hotend temperature (°C):",
            default="300",
            title="Extruder - Max Temp"
        )
        
        # Save
        self.state.set("extruder.extruder_type", extruder_type or "clockwork2")
        self.state.set("extruder.location", location)
        self.state.set("extruder.heater_location", location)
        self.state.set("extruder.sensor_location", location)
        self.state.set("extruder.sensor_type", sensor_type or "Generic 3950")
        self.state.set("extruder.max_temp", int(max_temp or 300))
        self.state.save()
        
        self.ui.msgbox(
            f"Extruder configured!\n\n"
            f"Type: {extruder_type}\n"
            f"Location: {location}\n"
            f"Thermistor: {sensor_type}\n"
            f"Max temp: {max_temp}°C",
            title="Configuration Saved"
        )
    
    def _heater_bed_setup(self) -> None:
        """Configure heated bed."""
        # Thermistor
        sensor_type = self.ui.radiolist(
            "Bed thermistor type:",
            [
                ("Generic 3950", "Generic 3950 (most common)", True),
                ("NTC 100K beta 3950", "NTC 100K beta 3950", False),
                ("PT1000", "PT1000", False),
            ],
            title="Heated Bed - Thermistor"
        )
        
        # Max temp
        max_temp = self.ui.inputbox(
            "Maximum bed temperature (°C):",
            default="120",
            title="Heated Bed - Max Temp"
        )
        
        # Save
        self.state.set("heater_bed.sensor_type", sensor_type or "Generic 3950")
        self.state.set("heater_bed.max_temp", int(max_temp or 120))
        self.state.save()
        
        self.ui.msgbox(
            f"Heated bed configured!\n\n"
            f"Thermistor: {sensor_type}\n"
            f"Max temp: {max_temp}°C\n\n"
            "Remember to run PID_CALIBRATE HEATER=heater_bed TARGET=60",
            title="Configuration Saved"
        )
    
    def _fans_setup(self) -> None:
        """Configure fans."""
        has_toolboard = self.state.get("mcu.toolboard.enabled", False)
        
        # Part cooling fan location
        if has_toolboard:
            part_location = self.ui.radiolist(
                "Part cooling fan connected to:",
                [
                    ("mainboard", "Mainboard", False),
                    ("toolboard", "Toolboard", True),
                ],
                title="Fans - Part Cooling"
            )
        else:
            part_location = "mainboard"
        
        # Hotend fan location
        if has_toolboard:
            hotend_location = self.ui.radiolist(
                "Hotend fan connected to:",
                [
                    ("mainboard", "Mainboard", False),
                    ("toolboard", "Toolboard", True),
                ],
                title="Fans - Hotend"
            )
        else:
            hotend_location = "mainboard"
        
        # Controller fan
        has_controller_fan = self.ui.yesno(
            "Do you have an electronics cooling fan?",
            title="Fans - Controller"
        )
        
        # Save
        self.state.set("fans.part_cooling.location", part_location)
        self.state.set("fans.hotend.location", hotend_location)
        self.state.set("fans.controller.enabled", has_controller_fan)
        self.state.save()
        
        self.ui.msgbox(
            f"Fans configured!\n\n"
            f"Part cooling: {part_location}\n"
            f"Hotend: {hotend_location}\n"
            f"Controller fan: {'Yes' if has_controller_fan else 'No'}",
            title="Configuration Saved"
        )
    
    def _probe_setup(self) -> None:
        """Configure probe."""
        probe_types = [
            ("none", "No Probe"),
            ("tap", "Voron Tap"),
            ("klicky", "Klicky / Euclid"),
            ("bltouch", "BLTouch / 3DTouch"),
            ("inductive", "Inductive (PINDA)"),
            ("beacon", "Beacon (eddy current)"),
            ("cartographer", "Cartographer"),
        ]
        
        probe_type = self.ui.radiolist(
            "Select your probe type:",
            [(k, v, k == "tap") for k, v in probe_types],
            title="Probe - Type"
        )
        
        if probe_type == "none":
            self.state.delete("probe")
            self.state.save()
            return
        
        # Offsets (for non-Tap probes)
        if probe_type != "tap":
            x_offset = self.ui.inputbox(
                "Probe X offset from nozzle (mm):",
                default="0",
                title="Probe - X Offset"
            )
            y_offset = self.ui.inputbox(
                "Probe Y offset from nozzle (mm):",
                default="0",
                title="Probe - Y Offset"
            )
        else:
            x_offset = "0"
            y_offset = "0"
        
        # Location for non-eddy probes
        has_toolboard = self.state.get("mcu.toolboard.enabled", False)
        if probe_type not in ["beacon", "cartographer"] and has_toolboard:
            location = self.ui.radiolist(
                "Probe connected to:",
                [
                    ("mainboard", "Mainboard", False),
                    ("toolboard", "Toolboard", True),
                ],
                title="Probe - Connection"
            )
        else:
            location = "toolboard" if has_toolboard else "mainboard"
        
        # Save
        self.state.set("probe.probe_type", probe_type)
        self.state.set("probe.x_offset", float(x_offset or 0))
        self.state.set("probe.y_offset", float(y_offset or 0))
        self.state.set("probe.location", location)
        self.state.save()
        
        self.ui.msgbox(
            f"Probe configured!\n\n"
            f"Type: {probe_type}\n"
            f"Offset: X={x_offset}, Y={y_offset}\n"
            f"Location: {location}\n\n"
            "Remember to run PROBE_CALIBRATE for Z offset",
            title="Configuration Saved"
        )
    
    def _homing_setup(self) -> None:
        """Configure homing."""
        probe_type = self.state.get("probe.probe_type", "none")
        
        # Homing method based on probe
        if probe_type in ["beacon", "cartographer"]:
            methods = [
                ("beacon_contact", "Beacon Contact", True),
                ("homing_override", "Custom Homing Override", False),
            ]
        else:
            methods = [
                ("safe_z_home", "Safe Z Home (standard)", True),
                ("homing_override", "Homing Override (sensorless)", False),
            ]
        
        method = self.ui.radiolist(
            "Z homing method:",
            methods,
            title="Homing - Method"
        )
        
        # Z hop
        z_hop = self.ui.inputbox(
            "Z hop height for homing (mm):",
            default="10",
            title="Homing - Z Hop"
        )
        
        # Save
        self.state.set("homing.homing_method", method or "safe_z_home")
        self.state.set("homing.z_hop", int(z_hop or 10))
        self.state.save()
        
        self.ui.msgbox(
            f"Homing configured!\n\n"
            f"Method: {method}\n"
            f"Z hop: {z_hop}mm",
            title="Configuration Saved"
        )
    
    def _bed_leveling_setup(self) -> None:
        """Configure bed leveling."""
        z_count = self.state.get("stepper_z.z_motor_count", 1)
        
        # Leveling type based on Z motor count
        if z_count == 4:
            leveling_options = [
                ("qgl", "Quad Gantry Level", True),
                ("none", "None", False),
            ]
        elif z_count >= 2:
            leveling_options = [
                ("z_tilt", "Z Tilt Adjust", True),
                ("none", "None", False),
            ]
        else:
            leveling_options = [
                ("none", "None (single Z)", True),
            ]
        
        leveling_type = self.ui.radiolist(
            "Bed leveling type:",
            leveling_options,
            title="Bed Leveling - Type"
        )
        
        # Bed mesh
        enable_mesh = self.ui.yesno(
            "Enable bed mesh?",
            title="Bed Leveling - Mesh",
            default_no=False
        )
        
        if enable_mesh:
            probe_count = self.ui.inputbox(
                "Mesh probe count (e.g., 5,5):",
                default="5,5",
                title="Bed Mesh - Probe Count"
            )
        else:
            probe_count = "5,5"
        
        # Save
        self.state.set("bed_leveling.leveling_type", leveling_type or "none")
        self.state.set("bed_leveling.bed_mesh.enabled", enable_mesh)
        self.state.set("bed_leveling.bed_mesh.probe_count", probe_count)
        self.state.save()
        
        self.ui.msgbox(
            f"Bed leveling configured!\n\n"
            f"Type: {leveling_type}\n"
            f"Mesh: {'Enabled' if enable_mesh else 'Disabled'}\n"
            f"Probe count: {probe_count}",
            title="Configuration Saved"
        )
    
    # -------------------------------------------------------------------------
    # Category 3: Tuning
    # -------------------------------------------------------------------------
    
    def tuning_menu(self) -> None:
        """Tuning and optimization menu."""
        while True:
            choice = self.ui.menu(
                "Tuning & Optimization\n\n"
                "Configure advanced features and calibration.",
                [
                    ("3.1", "TMC Autotune         (Motor optimization)"),
                    ("3.2", "Input Shaper         (Resonance compensation)"),
                    ("3.6", "Macros               (START_PRINT, etc.)"),
                    ("3.9", "Exclude Object       (Cancel individual objects)"),
                    ("3.10", "Arc Support         (G2/G3 commands)"),
                    ("B", "Back to Main Menu"),
                ],
                title="3. Tuning & Optimization",
            )
            
            if choice is None or choice == "B":
                break
            else:
                self.ui.msgbox(
                    f"Section {choice} coming soon!",
                    title=f"Section {choice}"
                )
    
    # -------------------------------------------------------------------------
    # Generate Config
    # -------------------------------------------------------------------------
    
    def generate_config(self) -> None:
        """Generate printer configuration files."""
        completion = self.state.get_completion_status()
        
        if not completion.get("mcu"):
            self.ui.msgbox(
                "Cannot generate config!\n\n"
                "Please configure at least the main MCU first.",
                title="Missing Configuration"
            )
            return
        
        if not self.ui.yesno(
            "Generate configuration files?\n\n"
            "This will create:\n"
            "• printer.cfg\n"
            "• gschpoozi/*.cfg files\n"
            "• user-overrides.cfg (if not exists)\n\n"
            "Existing gschpoozi/ folder will be overwritten.\n"
            "user-overrides.cfg will be preserved.",
            title="Generate Config"
        ):
            return
        
        self.ui.infobox("Generating configuration...", title="Please wait")
        
        try:
            from generator import ConfigGenerator
            
            generator = ConfigGenerator(state=self.state)
            files = generator.generate()
            written = generator.write_files(files)
            
            file_list = "\n".join(f"• {p.name}" for p in written[:8])
            if len(written) > 8:
                file_list += f"\n  ... and {len(written) - 8} more"
            
            self.ui.msgbox(
                f"Configuration generated!\n\n"
                f"Created {len(written)} files:\n{file_list}\n\n"
                f"Location: {generator.output_dir}",
                title="Generation Complete"
            )
        except Exception as e:
            self.ui.msgbox(
                f"Error generating configuration:\n\n{e}",
                title="Generation Failed"
            )


def main():
    """Entry point."""
    wizard = GschpooziWizard()
    sys.exit(wizard.run())


if __name__ == "__main__":
    main()

