/**
 * Validation System
 *
 * Validates the wizard configuration before generation.
 * Ensures all required fields are set and values are within valid ranges.
 */

import { type WizardState } from './conditionEngine';
import { detectConflicts, type Conflict } from './conflicts';
import { EXCLUSIVE_GROUPS } from './exclusiveGroups';

/**
 * Validation result for a single field
 */
export interface FieldValidation {
  field: string;
  valid: boolean;
  message?: string;
  severity: 'error' | 'warning';
}

/**
 * Overall validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: FieldValidation[];
  warnings: FieldValidation[];
  conflicts: Conflict[];
  missingRequired: string[];
  invalidValues: FieldValidation[];
}

/**
 * Field definition for validation
 */
interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
  /** Condition for when this field is required */
  requiredWhen?: string;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Valid values (for enums) */
  validValues?: string[];
  /** Custom validation function */
  validate?: (value: any, state: WizardState) => string | null;
}

/**
 * Required fields and their validation rules
 */
const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Core printer settings
  {
    key: 'printer.kinematics',
    label: 'Kinematics Type',
    required: true,
    validValues: ['cartesian', 'corexy', 'corexy-awd', 'hybrid_corexy', 'corexz', 'delta'],
  },
  {
    key: 'mcu.main.board_type',
    label: 'Mainboard Type',
    required: true,
  },

  // Stepper X
  {
    key: 'stepper_x.motor_port',
    label: 'Stepper X Motor Port',
    requiredWhen: 'printer.kinematics',
  },
  {
    key: 'stepper_x.step_pin',
    label: 'Stepper X Step Pin',
    requiredWhen: 'stepper_x.motor_port',
  },
  {
    key: 'stepper_x.dir_pin',
    label: 'Stepper X Direction Pin',
    requiredWhen: 'stepper_x.motor_port',
  },
  {
    key: 'stepper_x.enable_pin',
    label: 'Stepper X Enable Pin',
    requiredWhen: 'stepper_x.motor_port',
  },
  {
    key: 'stepper_x.rotation_distance',
    label: 'Stepper X Rotation Distance',
    requiredWhen: 'stepper_x.motor_port',
    min: 0.1,
    max: 500,
  },
  {
    key: 'stepper_x.microsteps',
    label: 'Stepper X Microsteps',
    requiredWhen: 'stepper_x.motor_port',
    validValues: ['16', '32', '64', '128', '256'],
    validate: (value) => {
      const valid = [16, 32, 64, 128, 256];
      if (!valid.includes(Number(value))) {
        return 'Microsteps must be 16, 32, 64, 128, or 256';
      }
      return null;
    },
  },
  {
    key: 'stepper_x.run_current',
    label: 'Stepper X Run Current',
    min: 0.1,
    max: 3.0,
  },

  // Stepper Y
  {
    key: 'stepper_y.motor_port',
    label: 'Stepper Y Motor Port',
    requiredWhen: 'printer.kinematics',
  },
  {
    key: 'stepper_y.step_pin',
    label: 'Stepper Y Step Pin',
    requiredWhen: 'stepper_y.motor_port',
  },
  {
    key: 'stepper_y.dir_pin',
    label: 'Stepper Y Direction Pin',
    requiredWhen: 'stepper_y.motor_port',
  },
  {
    key: 'stepper_y.enable_pin',
    label: 'Stepper Y Enable Pin',
    requiredWhen: 'stepper_y.motor_port',
  },
  {
    key: 'stepper_y.rotation_distance',
    label: 'Stepper Y Rotation Distance',
    requiredWhen: 'stepper_y.motor_port',
    min: 0.1,
    max: 500,
  },
  {
    key: 'stepper_y.microsteps',
    label: 'Stepper Y Microsteps',
    requiredWhen: 'stepper_y.motor_port',
  },

  // Stepper Z
  {
    key: 'stepper_z.motor_port',
    label: 'Stepper Z Motor Port',
    requiredWhen: 'printer.kinematics',
  },
  {
    key: 'stepper_z.rotation_distance',
    label: 'Stepper Z Rotation Distance',
    requiredWhen: 'stepper_z.motor_port',
    min: 0.1,
    max: 100,
  },

  // AWD steppers (conditional)
  {
    key: 'stepper_x1.motor_port',
    label: 'Stepper X1 Motor Port',
    requiredWhen: 'printer.awd_enabled',
  },
  {
    key: 'stepper_y1.motor_port',
    label: 'Stepper Y1 Motor Port',
    requiredWhen: 'printer.awd_enabled',
  },

  // Additional Z steppers (conditional)
  {
    key: 'stepper_z1.motor_port',
    label: 'Stepper Z1 Motor Port',
    requiredWhen: 'z_config.motor_count >= 2',
  },
  {
    key: 'stepper_z2.motor_port',
    label: 'Stepper Z2 Motor Port',
    requiredWhen: 'z_config.motor_count >= 3',
  },
  {
    key: 'stepper_z3.motor_port',
    label: 'Stepper Z3 Motor Port',
    requiredWhen: 'z_config.motor_count >= 4',
  },

  // Extruder
  {
    key: 'extruder.motor_port',
    label: 'Extruder Motor Port',
    requiredWhen: 'printer.kinematics',
  },
  {
    key: 'extruder.rotation_distance',
    label: 'Extruder Rotation Distance',
    requiredWhen: 'extruder.motor_port',
    min: 1,
    max: 100,
  },

  // Heater bed
  {
    key: 'heater_bed.heater_port',
    label: 'Heater Bed Port',
  },
  {
    key: 'heater_bed.thermistor_port',
    label: 'Heater Bed Thermistor Port',
    requiredWhen: 'heater_bed.heater_port',
  },
  {
    key: 'heater_bed.sensor_type',
    label: 'Heater Bed Sensor Type',
    requiredWhen: 'heater_bed.heater_port',
  },
  {
    key: 'heater_bed.max_temp',
    label: 'Heater Bed Max Temperature',
    min: 50,
    max: 150,
  },

  // Hotend
  {
    key: 'extruder.heater_port',
    label: 'Hotend Heater Port',
    requiredWhen: 'extruder.motor_port',
  },
  {
    key: 'extruder.thermistor_port',
    label: 'Hotend Thermistor Port',
    requiredWhen: 'extruder.heater_port',
  },
  {
    key: 'extruder.sensor_type',
    label: 'Hotend Sensor Type',
    requiredWhen: 'extruder.heater_port',
  },
  {
    key: 'extruder.max_temp',
    label: 'Hotend Max Temperature',
    min: 150,
    max: 500,
  },

  // Toolboard (conditional)
  {
    key: 'mcu.toolboard.board_type',
    label: 'Toolboard Type',
    requiredWhen: 'mcu.toolboard.enabled',
  },
  {
    key: 'mcu.toolboard.canbus_uuid',
    label: 'Toolboard CAN UUID',
    requiredWhen: "mcu.toolboard.enabled and mcu.toolboard.connection_type == 'can'",
  },
];

/**
 * Check if a value is "empty" (should not be in config)
 */
function isEmpty(value: any): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Simple condition evaluation for validation
 * Supports basic conditions like "field_name" (truthy) and "field >= value"
 */
function evaluateSimpleCondition(condition: string, state: WizardState): boolean {
  if (!condition) return true;

  // Handle >= comparisons
  const geMatch = condition.match(/^(.+?)\s*>=\s*(\d+)$/);
  if (geMatch) {
    const [, field, valueStr] = geMatch;
    const fieldValue = state[field.trim()];
    return Number(fieldValue) >= Number(valueStr);
  }

  // Handle == comparisons
  const eqMatch = condition.match(/^(.+?)\s*==\s*['"]?(.+?)['"]?$/);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    return state[field.trim()] === value.trim();
  }

  // Handle 'and' conditions
  if (condition.includes(' and ')) {
    const parts = condition.split(' and ');
    return parts.every(part => evaluateSimpleCondition(part.trim(), state));
  }

  // Simple truthy check
  return Boolean(state[condition.trim()]);
}

/**
 * Validate a single field
 */
function validateField(def: FieldDefinition, state: WizardState): FieldValidation | null {
  const value = state[def.key];

  // Check if field is required
  const isRequired = def.required || (def.requiredWhen && evaluateSimpleCondition(def.requiredWhen, state));

  if (isRequired && isEmpty(value)) {
    return {
      field: def.key,
      valid: false,
      message: `${def.label} is required`,
      severity: 'error',
    };
  }

  // Skip further validation if empty and not required
  if (isEmpty(value)) {
    return null;
  }

  // Check min/max for numbers
  if (def.min !== undefined && typeof value === 'number' && value < def.min) {
    return {
      field: def.key,
      valid: false,
      message: `${def.label} must be at least ${def.min}`,
      severity: 'error',
    };
  }

  if (def.max !== undefined && typeof value === 'number' && value > def.max) {
    return {
      field: def.key,
      valid: false,
      message: `${def.label} must be at most ${def.max}`,
      severity: 'error',
    };
  }

  // Check valid values
  if (def.validValues && !def.validValues.includes(String(value))) {
    return {
      field: def.key,
      valid: false,
      message: `${def.label} must be one of: ${def.validValues.join(', ')}`,
      severity: 'error',
    };
  }

  // Run custom validation
  if (def.validate) {
    const error = def.validate(value, state);
    if (error) {
      return {
        field: def.key,
        valid: false,
        message: error,
        severity: 'error',
      };
    }
  }

  return null;
}

/**
 * Validate required exclusive groups
 */
function validateExclusiveGroups(state: WizardState): FieldValidation[] {
  const errors: FieldValidation[] = [];

  for (const group of EXCLUSIVE_GROUPS) {
    if (group.required && isEmpty(state[group.stateKey])) {
      errors.push({
        field: group.stateKey,
        valid: false,
        message: `${group.name} must be selected`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Validate the entire wizard state
 */
export function validateState(state: WizardState): ValidationResult {
  const errors: FieldValidation[] = [];
  const warnings: FieldValidation[] = [];
  const missingRequired: string[] = [];
  const invalidValues: FieldValidation[] = [];

  // Validate all field definitions
  for (const def of FIELD_DEFINITIONS) {
    const result = validateField(def, state);
    if (result) {
      if (result.severity === 'error') {
        errors.push(result);
        if (result.message?.includes('required')) {
          missingRequired.push(def.key);
        } else {
          invalidValues.push(result);
        }
      } else {
        warnings.push(result);
      }
    }
  }

  // Validate exclusive groups
  const groupErrors = validateExclusiveGroups(state);
  errors.push(...groupErrors);
  missingRequired.push(...groupErrors.map(e => e.field));

  // Get conflicts
  const conflicts = detectConflicts(state);

  // Add conflict errors
  for (const conflict of conflicts) {
    if (conflict.rule.severity === 'error') {
      errors.push({
        field: conflict.rule.relatedFields?.[0] || conflict.rule.id,
        valid: false,
        message: conflict.rule.message,
        severity: 'error',
      });
    } else if (conflict.rule.severity === 'warning') {
      warnings.push({
        field: conflict.rule.relatedFields?.[0] || conflict.rule.id,
        valid: true,
        message: conflict.rule.message,
        severity: 'warning',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    conflicts,
    missingRequired,
    invalidValues,
  };
}

/**
 * Quick check if state is valid for generation
 */
export function isValidForGeneration(state: WizardState): boolean {
  // Must have kinematics and mainboard at minimum
  if (!state['printer.kinematics'] || !state['mcu.main.board_type']) {
    return false;
  }

  // Check for blocking conflicts
  const conflicts = detectConflicts(state);
  if (conflicts.some(c => c.rule.severity === 'error')) {
    return false;
  }

  return true;
}

/**
 * Get validation summary for display
 */
export function getValidationSummary(state: WizardState): {
  canGenerate: boolean;
  errorCount: number;
  warningCount: number;
  completionPercent: number;
} {
  const result = validateState(state);

  // Calculate completion based on required fields
  const requiredFields = FIELD_DEFINITIONS.filter(f => f.required);
  const filledRequired = requiredFields.filter(f => !isEmpty(state[f.key])).length;
  const completionPercent = requiredFields.length > 0
    ? Math.round((filledRequired / requiredFields.length) * 100)
    : 100;

  return {
    canGenerate: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    completionPercent,
  };
}

export default validateState;
