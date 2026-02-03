"""
API endpoints for config generation and preview.
"""

import sys
import json
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Paths
BACKEND_DIR = Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
TEMPLATES_DIR = PROJECT_ROOT / "templates"
SCHEMA_DIR = PROJECT_ROOT / "schema"

# Add scripts to path for importing generator
sys.path.insert(0, str(SCRIPTS_DIR))
sys.path.insert(0, str(SCRIPTS_DIR / "generator"))

router = APIRouter()


class GenerateRequest(BaseModel):
    """Request body for config generation."""
    wizard_state: Dict[str, Any]
    output_dir: Optional[str] = None  # None = preview only, don't save


class GenerateResponse(BaseModel):
    """Response from config generation."""
    success: bool
    files: Dict[str, str]  # filename -> content
    errors: List[str] = []
    warnings: List[str] = []


class ValidateRequest(BaseModel):
    """Request body for validation."""
    wizard_state: Dict[str, Any]
    section: Optional[str] = None  # Validate specific section or all


class ValidationError(BaseModel):
    """Single validation error."""
    field: str
    message: str
    severity: str = "error"  # "error" or "warning"


class ValidateResponse(BaseModel):
    """Response from validation."""
    valid: bool
    errors: List[ValidationError] = []
    warnings: List[ValidationError] = []


def transform_web_state_to_wizard_state(web_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform web frontend state format to the format expected by the generator.

    Web state uses dot notation keys: "stepper_x.motor_port" = "MOTOR_0"
    Generator expects nested structure: {"stepper_x": {"motor_port": "MOTOR_0"}}
    """
    result: Dict[str, Any] = {}

    for key, value in web_state.items():
        if value is None:
            continue

        parts = key.split(".")
        current = result

        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            current = current[part]

        if parts:
            current[parts[-1]] = value

    # Compute driver_protocol from driver_type for all steppers and extruder.
    # The web frontend doesn't set this, but templates need it for SPI/UART branching.
    try:
        from wizard.drivers import SPI_DRIVERS
    except ImportError:
        SPI_DRIVERS = {"TMC5160", "TMC2130", "TMC2240", "TMC2660"}

    for section in ['stepper_x', 'stepper_y', 'stepper_z',
                    'stepper_x1', 'stepper_y1',
                    'stepper_z1', 'stepper_z2', 'stepper_z3',
                    'extruder']:
        if section in result and isinstance(result[section], dict):
            dt = result[section].get('driver_type', '')
            if dt:
                result[section]['driver_protocol'] = 'spi' if dt.upper() in SPI_DRIVERS else 'uart'

    return result


@router.post("/validate", response_model=ValidateResponse)
async def validate_state(request: ValidateRequest) -> ValidateResponse:
    """
    Validate wizard state (partial or complete).
    Returns field-level errors and warnings.
    """
    errors: List[ValidationError] = []
    warnings: List[ValidationError] = []

    state = request.wizard_state

    # MCU validation
    if not state.get('mcu.main.board_type'):
        errors.append(ValidationError(field='mcu.main.board_type', message='Board type is required'))

    if not state.get('mcu.main.serial'):
        errors.append(ValidationError(field='mcu.main.serial', message='MCU serial path is required'))

    # Kinematics validation
    kinematics = state.get('printer.kinematics')
    if not kinematics:
        errors.append(ValidationError(field='printer.kinematics', message='Kinematics type is required'))
    elif kinematics not in ['cartesian', 'corexy', 'corexz', 'delta', 'hybrid_corexy']:
        errors.append(ValidationError(field='printer.kinematics', message=f'Invalid kinematics type: {kinematics}'))

    # Stepper validation
    for axis in ['x', 'y', 'z']:
        prefix = f'stepper_{axis}'

        if not state.get(f'{prefix}.motor_port'):
            errors.append(ValidationError(field=f'{prefix}.motor_port', message=f'{axis.upper()} axis motor port is required'))

        run_current = state.get(f'{prefix}.run_current')
        if run_current is not None:
            try:
                current = float(run_current)
                if current > 2.5:
                    errors.append(ValidationError(
                        field=f'{prefix}.run_current',
                        message=f'Run current {current}A exceeds safe limit (2.5A)'
                    ))
                elif current > 2.0:
                    warnings.append(ValidationError(
                        field=f'{prefix}.run_current',
                        message=f'Run current {current}A is high - ensure adequate cooling',
                        severity='warning'
                    ))
            except (ValueError, TypeError):
                errors.append(ValidationError(field=f'{prefix}.run_current', message='Run current must be a number'))

    # Extruder validation
    if not state.get('extruder.extruder_type'):
        errors.append(ValidationError(field='extruder.extruder_type', message='Extruder type is required'))

    extruder_current = state.get('extruder.run_current')
    if extruder_current is not None:
        try:
            current = float(extruder_current)
            if current > 1.5:
                warnings.append(ValidationError(
                    field='extruder.run_current',
                    message=f'Extruder run current {current}A is high for most extruders',
                    severity='warning'
                ))
        except (ValueError, TypeError):
            pass

    # Temperature limits
    max_temp = state.get('extruder.max_temp')
    if max_temp is not None:
        try:
            temp = int(max_temp)
            if temp > 350:
                errors.append(ValidationError(
                    field='extruder.max_temp',
                    message='Max temp exceeds safe limit (350C)'
                ))
            elif temp > 300:
                warnings.append(ValidationError(
                    field='extruder.max_temp',
                    message='Max temp above 300C requires high-temp thermistor',
                    severity='warning'
                ))
        except (ValueError, TypeError):
            pass

    bed_max_temp = state.get('heater_bed.max_temp')
    if bed_max_temp is not None:
        try:
            temp = int(bed_max_temp)
            if temp > 130:
                warnings.append(ValidationError(
                    field='heater_bed.max_temp',
                    message='Bed max temp above 130C - verify heater rating',
                    severity='warning'
                ))
        except (ValueError, TypeError):
            pass

    # Heater bed validation
    if not state.get('heater_bed.heater_pin'):
        errors.append(ValidationError(field='heater_bed.heater_pin', message='Bed heater pin is required'))

    if not state.get('heater_bed.sensor_port'):
        errors.append(ValidationError(field='heater_bed.sensor_port', message='Bed sensor port is required'))

    # Fan validation
    fan_part_loc = state.get('fans.part_cooling.location', 'mainboard')
    if fan_part_loc == 'mainboard' and not state.get('fans.part_cooling.pin_mainboard'):
        errors.append(ValidationError(field='fans.part_cooling.pin_mainboard', message='Part cooling fan pin is required'))
    elif fan_part_loc == 'toolboard' and not state.get('fans.part_cooling.pin_toolboard'):
        errors.append(ValidationError(field='fans.part_cooling.pin_toolboard', message='Part cooling fan pin is required'))

    fan_hotend_loc = state.get('fans.hotend.location', 'mainboard')
    if fan_hotend_loc == 'mainboard' and not state.get('fans.hotend.pin_mainboard'):
        errors.append(ValidationError(field='fans.hotend.pin_mainboard', message='Hotend fan pin is required'))
    elif fan_hotend_loc == 'toolboard' and not state.get('fans.hotend.pin_toolboard'):
        errors.append(ValidationError(field='fans.hotend.pin_toolboard', message='Hotend fan pin is required'))

    # Pin conflict detection
    used_pins: Dict[str, str] = {}
    for key, value in state.items():
        if '_pin' in key or key.endswith('.pin') or 'port' in key.lower():
            if isinstance(value, str) and value:
                pin = value.lstrip('^!~')  # Remove modifiers
                if pin and pin not in ['None', 'null', '']:
                    if pin in used_pins:
                        errors.append(ValidationError(
                            field=key,
                            message=f'Pin conflict: {pin} already used by {used_pins[pin]}'
                        ))
                    else:
                        used_pins[pin] = key

    return ValidateResponse(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )


@router.post("/preview", response_model=GenerateResponse)
async def preview_config(request: GenerateRequest) -> GenerateResponse:
    """
    Generate config preview without saving to disk.
    Returns all generated config file contents.
    """
    try:
        # Transform web state to generator format
        nested_state = transform_web_state_to_wizard_state(request.wizard_state)

        # Try to import and use the real generator
        try:
            from wizard.state import WizardState
            from generator.generator import ConfigGenerator

            # Create temporary directory for generation
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)

                # Create a temporary state file
                state_file = temp_path / ".gschpoozi_state.json"
                with open(state_file, 'w', encoding='utf-8') as f:
                    json.dump({"wizard": {"version": "3.0"}, "config": nested_state}, f)

                # Create WizardState from the temp file
                wizard_state = WizardState(state_dir=temp_path)

                # Generate config
                generator = ConfigGenerator(
                    state=wizard_state,
                    output_dir=temp_path,
                    templates_dir=TEMPLATES_DIR,
                )

                files = generator.generate()

                return GenerateResponse(
                    success=True,
                    files=files,
                )

        except ImportError as e:
            # Generator not available, return mock response
            return GenerateResponse(
                success=False,
                files={},
                errors=[f"Generator module not available: {str(e)}. Run from project root."],
            )
        except Exception as e:
            return GenerateResponse(
                success=False,
                files={},
                errors=[f"Generation error: {str(e)}"],
            )

    except Exception as e:
        return GenerateResponse(
            success=False,
            files={},
            errors=[str(e)],
        )


@router.post("/generate", response_model=GenerateResponse)
async def generate_config(request: GenerateRequest) -> GenerateResponse:
    """
    Generate config files and save to specified directory.
    """
    if not request.output_dir:
        raise HTTPException(
            status_code=400,
            detail="output_dir is required for saving configs"
        )

    output_path = Path(request.output_dir).expanduser()

    try:
        # Transform web state to generator format
        nested_state = transform_web_state_to_wizard_state(request.wizard_state)

        from wizard.state import WizardState
        from generator.generator import ConfigGenerator

        # Create output directory
        output_path.mkdir(parents=True, exist_ok=True)

        # Create a temporary state file
        state_file = output_path / ".gschpoozi_state.json"
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump({"wizard": {"version": "3.0"}, "config": nested_state}, f)

        # Create WizardState
        wizard_state = WizardState(state_dir=output_path)

        # Generate and write config
        generator = ConfigGenerator(
            state=wizard_state,
            output_dir=output_path,
            templates_dir=TEMPLATES_DIR,
        )

        files = generator.generate()
        generator.write_files(files)

        return GenerateResponse(
            success=True,
            files=files,
        )

    except Exception as e:
        return GenerateResponse(
            success=False,
            files={},
            errors=[str(e)],
        )

