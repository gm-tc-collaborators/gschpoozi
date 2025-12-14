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
            else:
                # Placeholder for other sections
                self.ui.msgbox(
                    f"Section {choice} coming soon!\n\n"
                    "This section will be implemented next.",
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
        
        # TODO: Actually generate config
        import time
        time.sleep(2)
        
        self.ui.msgbox(
            "Configuration generated!\n\n"
            "(This is a placeholder - actual generation coming soon)\n\n"
            "Files would be written to:\n"
            "~/printer_data/config/",
            title="Generation Complete"
        )


def main():
    """Entry point."""
    wizard = GschpooziWizard()
    sys.exit(wizard.run())


if __name__ == "__main__":
    main()

