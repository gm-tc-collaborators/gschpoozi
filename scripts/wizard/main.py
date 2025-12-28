#!/usr/bin/env python3
"""
main.py - gschpoozi Configuration Wizard Entry Point

This is the main entry point for the Klipper configuration wizard.
Run with: python3 scripts/wizard/main.py

This version uses a skeleton-driven architecture where:
- skeleton.json is the single source of truth for menus and fields
- MenuEngine handles navigation and rendering
- FieldRenderer handles individual field types
"""

import subprocess
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from wizard.skeleton import SkeletonLoader, SkeletonValidator
from wizard.engine import MenuEngine
from wizard.fields import FieldRenderer
from wizard.state import get_state, WizardState
from wizard.ui import WizardUI

# Find repo root (where templates/ lives)
SCRIPT_DIR = Path(__file__).parent.resolve()
REPO_ROOT = SCRIPT_DIR.parent.parent


class GschpooziWizard:
    """Main wizard controller using skeleton-driven architecture."""

    VERSION = "3.0.0"

    def __init__(self):
        """Initialize the wizard."""
        self.ui = WizardUI(
            title="gschpoozi",
            backtitle=f"gschpoozi v{self.VERSION} - Klipper Configuration Wizard"
        )
        self.state = get_state()
        self.skeleton = SkeletonLoader()

        # Create field renderer
        self.field_renderer = FieldRenderer(
            skeleton=self.skeleton,
            state=self.state,
            ui=self.ui
        )

        # Create menu engine with action handlers
        self.engine = MenuEngine(
            skeleton=self.skeleton,
            state=self.state,
            ui=self.ui,
            field_renderer=self.field_renderer,
            action_handlers={
                'generate_config': self._generate_config,
                'save_and_exit': self._save_and_exit,
                'verify_klipper': self._verify_klipper,
                'verify_moonraker': self._verify_moonraker,
            }
        )

    def run(self) -> None:
        """Run the main wizard loop."""
        try:
            # Show welcome message on first run
            if not self.state.get('wizard_started'):
                self._show_welcome()
                self.state.set('wizard_started', True)
                self.state.save()

            # Run main menu
            self.engine.run_menu('main')

            # Save state on exit
            self.state.save()

            self.ui.msgbox(
                "Configuration saved!\n\n"
                "Run 'python3 scripts/generate-config.py' to generate Klipper configs.",
                title="Goodbye"
            )

        except KeyboardInterrupt:
            self.state.save()
            print("\n\nWizard interrupted. State saved.")
            sys.exit(0)
        except Exception as e:
            self.state.save()
            self.ui.msgbox(f"Error: {e}\n\nState saved.", title="Error")
            raise

    def _show_welcome(self) -> None:
        """Show welcome message on first run."""
        self.ui.msgbox(
            "Welcome to gschpoozi v" + self.VERSION + "!\n\n"
            "This wizard will help you configure your Klipper printer.\n\n"
            "Navigate with:\n"
            "  - Arrow keys to move\n"
            "  - Space to select\n"
            "  - Enter to confirm\n"
            "  - Tab to switch between OK/Cancel\n\n"
            "Your progress is saved automatically.",
            title="Welcome"
        )

    def _generate_config(self) -> None:
        """Generate Klipper configuration files."""
        # First validate
        state_dict = self.state.get_all()
        validator = SkeletonValidator(self.skeleton, state_dict)
        result = validator.validate_all()

        if not result['valid']:
            error_text = "Cannot generate config - please fix these issues:\n\n"
            for e in result['errors'][:5]:  # Limit to 5 errors
                error_text += f"- {e}\n"
            if len(result['errors']) > 5:
                error_text += f"\n...and {len(result['errors']) - 5} more errors"
            self.ui.msgbox(error_text, title="Validation Failed")
            return

        # Show warnings if any
        if result['warnings']:
            warning_text = "Warnings (config will still be generated):\n\n"
            for w in result['warnings']:
                warning_text += f"- {w}\n"
            self.ui.msgbox(warning_text, title="Warnings")

        # Save state first
        self.state.save()

        # Run generator
        generator_script = REPO_ROOT / "scripts" / "generate-config.py"
        output_dir = Path.home() / "printer_data" / "config" / "gschpoozi"

        if not generator_script.exists():
            self.ui.msgbox(
                f"Generator script not found: {generator_script}",
                title="Error"
            )
            return

        # Ask for confirmation
        if not self.ui.yesno(
            f"Generate config files to:\n{output_dir}\n\nProceed?",
            title="Generate Config"
        ):
            return

        # Run generator
        self.ui.infobox("Generating configuration...", title="Please Wait")

        try:
            result = subprocess.run(
                [sys.executable, str(generator_script), "--output-dir", str(output_dir)],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                self.ui.msgbox(
                    f"Configuration generated successfully!\n\n"
                    f"Files written to: {output_dir}\n\n"
                    "Add the following to your printer.cfg:\n"
                    f"[include gschpoozi/*.cfg]",
                    title="Success"
                )
            else:
                error = result.stderr or result.stdout or "Unknown error"
                self.ui.msgbox(
                    f"Generator failed:\n\n{error[:500]}",
                    title="Error"
                )

        except subprocess.TimeoutExpired:
            self.ui.msgbox("Generator timed out", title="Error")
        except Exception as e:
            self.ui.msgbox(f"Generator error: {e}", title="Error")

    def _save_and_exit(self) -> str:
        """Save state and exit."""
        self.state.save()
        return 'quit'

    def _verify_klipper(self) -> None:
        """Verify Klipper installation."""
        self.ui.infobox("Checking Klipper...", title="Please Wait")

        try:
            # Check if Klipper service is running
            result = subprocess.run(
                ["systemctl", "is-active", "klipper"],
                capture_output=True,
                text=True
            )

            if result.stdout.strip() == "active":
                self.ui.msgbox(
                    "Klipper is running!\n\n"
                    "Service: active\n"
                    "Status: OK",
                    title="Klipper Status"
                )
            else:
                self.ui.msgbox(
                    "Klipper is NOT running.\n\n"
                    "Try: sudo systemctl start klipper",
                    title="Klipper Status"
                )

        except Exception as e:
            self.ui.msgbox(f"Could not check Klipper: {e}", title="Error")

    def _verify_moonraker(self) -> None:
        """Verify Moonraker installation."""
        self.ui.infobox("Checking Moonraker...", title="Please Wait")

        try:
            result = subprocess.run(
                ["systemctl", "is-active", "moonraker"],
                capture_output=True,
                text=True
            )

            if result.stdout.strip() == "active":
                self.ui.msgbox(
                    "Moonraker is running!\n\n"
                    "Service: active\n"
                    "Status: OK",
                    title="Moonraker Status"
                )
            else:
                self.ui.msgbox(
                    "Moonraker is NOT running.\n\n"
                    "Try: sudo systemctl start moonraker",
                    title="Moonraker Status"
                )

        except Exception as e:
            self.ui.msgbox(f"Could not check Moonraker: {e}", title="Error")


def main():
    """Entry point."""
    wizard = GschpooziWizard()
    wizard.run()


if __name__ == "__main__":
    main()
