/**
 * Conflicts Detection System
 *
 * Detects logical conflicts in the wizard configuration and provides
 * warnings/errors to prevent invalid configurations.
 */

import { evaluateCondition, type WizardState } from './conditionEngine';

/**
 * Severity levels for conflicts
 */
export type ConflictSeverity = 'error' | 'warning' | 'info';

/**
 * A conflict rule definition
 */
export interface ConflictRule {
  /** Unique identifier */
  id: string;
  /** Human-readable message */
  message: string;
  /** Detailed explanation */
  details?: string;
  /** Condition that triggers this conflict */
  condition: string;
  /** Severity level */
  severity: ConflictSeverity;
  /** Category for grouping */
  category: 'hardware' | 'motion' | 'heating' | 'probing' | 'leveling' | 'homing' | 'general';
  /** Suggested fix */
  suggestion?: string;
  /** Related state keys */
  relatedFields?: string[];
}

/**
 * A detected conflict instance
 */
export interface Conflict {
  rule: ConflictRule;
  /** Actual values that caused the conflict */
  context: Record<string, any>;
}

/**
 * Built-in conflict rules based on CLI wizard logic
 */
export const CONFLICT_RULES: ConflictRule[] = [
  // Leveling conflicts
  {
    id: 'qgl_requires_4_motors',
    message: 'Quad Gantry Level requires exactly 4 Z motors',
    details: 'QGL is designed for printers with 4 independent Z motors at each corner of the gantry.',
    condition: "leveling.type == 'quad_gantry_level' and z_config.motor_count != 4",
    severity: 'error',
    category: 'leveling',
    suggestion: 'Set Z motor count to 4, or use Z Tilt for 2-3 motors.',
    relatedFields: ['leveling.type', 'z_config.motor_count'],
  },
  {
    id: 'z_tilt_requires_2_or_3_motors',
    message: 'Z Tilt requires 2 or 3 Z motors',
    details: 'Z Tilt adjustment works with 2 or 3 Z motors.',
    condition: "leveling.type == 'z_tilt' and (z_config.motor_count < 2 or z_config.motor_count > 3)",
    severity: 'error',
    category: 'leveling',
    suggestion: 'Set Z motor count to 2 or 3, or use QGL for 4 motors.',
    relatedFields: ['leveling.type', 'z_config.motor_count'],
  },

  // Sensorless homing conflicts
  {
    id: 'sensorless_needs_stallguard_x',
    message: 'Sensorless X homing requires a TMC driver with StallGuard',
    details: 'StallGuard is available on TMC2209, TMC2226, TMC2240, TMC5160, and TMC2130.',
    condition: "homing.x_endstop_type == 'sensorless' and stepper_x.driver_type not in ['tmc2209', 'tmc2226', 'tmc2240', 'tmc5160', 'tmc2130']",
    severity: 'error',
    category: 'homing',
    suggestion: 'Use a TMC driver with StallGuard support, or use a physical endstop.',
    relatedFields: ['homing.x_endstop_type', 'stepper_x.driver_type'],
  },
  {
    id: 'sensorless_needs_stallguard_y',
    message: 'Sensorless Y homing requires a TMC driver with StallGuard',
    details: 'StallGuard is available on TMC2209, TMC2226, TMC2240, TMC5160, and TMC2130.',
    condition: "homing.y_endstop_type == 'sensorless' and stepper_y.driver_type not in ['tmc2209', 'tmc2226', 'tmc2240', 'tmc5160', 'tmc2130']",
    severity: 'error',
    category: 'homing',
    suggestion: 'Use a TMC driver with StallGuard support, or use a physical endstop.',
    relatedFields: ['homing.y_endstop_type', 'stepper_y.driver_type'],
  },

  // Toolboard conflicts
  {
    id: 'toolboard_extruder_needs_toolboard',
    message: 'Extruder set to toolboard but toolboard is not enabled',
    condition: "extruder.motor_location == 'toolboard' and mcu.toolboard.enabled != true",
    severity: 'error',
    category: 'hardware',
    suggestion: 'Enable the toolboard in MCU settings, or set extruder location to mainboard.',
    relatedFields: ['extruder.motor_location', 'mcu.toolboard.enabled'],
  },
  {
    id: 'toolboard_fan_needs_toolboard',
    message: 'Fan set to toolboard but toolboard is not enabled',
    condition: "(fans.part_cooling.location == 'toolboard' or fans.hotend.location == 'toolboard') and mcu.toolboard.enabled != true",
    severity: 'error',
    category: 'hardware',
    suggestion: 'Enable the toolboard in MCU settings, or set fan location to mainboard.',
    relatedFields: ['fans.part_cooling.location', 'fans.hotend.location', 'mcu.toolboard.enabled'],
  },
  {
    id: 'toolboard_probe_needs_toolboard',
    message: 'Probe set to toolboard but toolboard is not enabled',
    condition: "probe.location == 'toolboard' and mcu.toolboard.enabled != true",
    severity: 'error',
    category: 'probing',
    suggestion: 'Enable the toolboard in MCU settings, or set probe location to mainboard.',
    relatedFields: ['probe.location', 'mcu.toolboard.enabled'],
  },

  // AWD conflicts
  {
    id: 'awd_needs_corexy',
    message: 'AWD mode requires CoreXY-based kinematics',
    condition: "printer.awd_enabled == true and printer.kinematics not in ['corexy', 'corexy-awd', 'hybrid_corexy']",
    severity: 'error',
    category: 'motion',
    suggestion: 'Select CoreXY, CoreXY-AWD, or Hybrid CoreXY kinematics.',
    relatedFields: ['printer.awd_enabled', 'printer.kinematics'],
  },

  // Probe conflicts
  {
    id: 'beacon_needs_i2c_or_can',
    message: 'Beacon probe requires I2C or CAN connection',
    details: 'Beacon probes connect via I2C or CAN bus, not a simple GPIO pin.',
    condition: "probe.probe_type == 'beacon' and probe.connection_type not in ['i2c', 'can']",
    severity: 'warning',
    category: 'probing',
    suggestion: 'Configure Beacon connection type to I2C or CAN.',
    relatedFields: ['probe.probe_type', 'probe.connection_type'],
  },
  {
    id: 'cartographer_needs_can',
    message: 'Cartographer probe typically uses CAN connection',
    condition: "probe.probe_type == 'cartographer' and probe.connection_type != 'can'",
    severity: 'warning',
    category: 'probing',
    suggestion: 'Configure Cartographer connection type to CAN.',
    relatedFields: ['probe.probe_type', 'probe.connection_type'],
  },

  // Temperature warnings
  {
    id: 'high_bed_temp_warning',
    message: 'Bed max temperature is set very high',
    details: 'Max temperatures above 120°C may require special bed heaters and insulation.',
    condition: 'heater_bed.max_temp > 120',
    severity: 'warning',
    category: 'heating',
    suggestion: 'Verify your bed heater supports this temperature.',
    relatedFields: ['heater_bed.max_temp'],
  },
  {
    id: 'high_hotend_temp_warning',
    message: 'Hotend max temperature is set very high',
    details: 'Max temperatures above 300°C require all-metal hotends and high-temp thermistors.',
    condition: 'extruder.max_temp > 300',
    severity: 'warning',
    category: 'heating',
    suggestion: 'Verify your hotend and thermistor support this temperature.',
    relatedFields: ['extruder.max_temp'],
  },

  // Motor current warnings
  {
    id: 'high_xy_current_warning',
    message: 'XY motor current is set high',
    details: 'Currents above 1.2A may cause motor overheating without active cooling.',
    condition: 'stepper_x.run_current > 1.2 or stepper_y.run_current > 1.2',
    severity: 'warning',
    category: 'motion',
    suggestion: 'Ensure motors are rated for this current and have adequate cooling.',
    relatedFields: ['stepper_x.run_current', 'stepper_y.run_current'],
  },

  // Missing required fields
  {
    id: 'no_kinematics_selected',
    message: 'No kinematics type selected',
    condition: 'not printer.kinematics',
    severity: 'error',
    category: 'general',
    suggestion: 'Select a kinematics type (CoreXY, Cartesian, etc.)',
    relatedFields: ['printer.kinematics'],
  },
  {
    id: 'no_mainboard_selected',
    message: 'No mainboard selected',
    condition: 'not mcu.main.board_type',
    severity: 'error',
    category: 'hardware',
    suggestion: 'Select your mainboard type in MCU settings.',
    relatedFields: ['mcu.main.board_type'],
  },

  // Bed mesh conflicts
  {
    id: 'mesh_exceeds_bed',
    message: 'Bed mesh area may exceed printable area',
    details: 'Mesh min/max should account for probe offset.',
    condition: 'bed_mesh.mesh_max_x > printer.bed_size_x or bed_mesh.mesh_max_y > printer.bed_size_y',
    severity: 'warning',
    category: 'probing',
    suggestion: 'Adjust mesh boundaries to fit within bed size minus probe offsets.',
    relatedFields: ['bed_mesh.mesh_max_x', 'bed_mesh.mesh_max_y', 'printer.bed_size_x', 'printer.bed_size_y'],
  },
];

/**
 * Check all conflict rules against the current state.
 * Returns an array of detected conflicts.
 */
export function detectConflicts(state: WizardState): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const rule of CONFLICT_RULES) {
    if (evaluateCondition(rule.condition, state)) {
      // Build context with relevant field values
      const context: Record<string, any> = {};
      if (rule.relatedFields) {
        for (const field of rule.relatedFields) {
          context[field] = state[field];
        }
      }

      conflicts.push({ rule, context });
    }
  }

  return conflicts;
}

/**
 * Get conflicts filtered by severity
 */
export function getConflictsBySeverity(
  state: WizardState,
  severity: ConflictSeverity
): Conflict[] {
  return detectConflicts(state).filter(c => c.rule.severity === severity);
}

/**
 * Get conflicts filtered by category
 */
export function getConflictsByCategory(
  state: WizardState,
  category: ConflictRule['category']
): Conflict[] {
  return detectConflicts(state).filter(c => c.rule.category === category);
}

/**
 * Check if there are any errors (blocking conflicts)
 */
export function hasErrors(state: WizardState): boolean {
  return detectConflicts(state).some(c => c.rule.severity === 'error');
}

/**
 * Check if there are any warnings
 */
export function hasWarnings(state: WizardState): boolean {
  return detectConflicts(state).some(c => c.rule.severity === 'warning');
}

/**
 * Get a summary of conflicts by severity
 */
export function getConflictSummary(state: WizardState): {
  errors: number;
  warnings: number;
  info: number;
  total: number;
} {
  const conflicts = detectConflicts(state);
  return {
    errors: conflicts.filter(c => c.rule.severity === 'error').length,
    warnings: conflicts.filter(c => c.rule.severity === 'warning').length,
    info: conflicts.filter(c => c.rule.severity === 'info').length,
    total: conflicts.length,
  };
}

/**
 * Check if a specific field has any conflicts
 */
export function getFieldConflicts(state: WizardState, field: string): Conflict[] {
  return detectConflicts(state).filter(
    c => c.rule.relatedFields?.includes(field)
  );
}

export default detectConflicts;
