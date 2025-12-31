/**
 * Implications System
 *
 * Auto-sets values based on conditions. When a condition becomes true,
 * the associated values are automatically applied to the wizard state.
 */

import { evaluateCondition, type WizardState } from './conditionEngine';

/**
 * An implication rule that auto-sets values when a condition is met.
 */
export interface Implication {
  /** Unique identifier for this implication */
  id: string;
  /** Human-readable description */
  description: string;
  /** Condition that triggers this implication */
  condition: string;
  /** Values to set when condition is true */
  setValues: Record<string, any>;
  /** Whether this implication can be overridden by user */
  allowOverride?: boolean;
  /** Priority (higher = applied later, can override lower) */
  priority?: number;
}

/**
 * Built-in implications based on CLI wizard logic
 */
export const IMPLICATIONS: Implication[] = [
  // Kinematics implications
  {
    id: 'corexy_awd_enables_awd',
    description: 'CoreXY-AWD kinematics enables AWD mode',
    condition: "printer.kinematics == 'corexy-awd'",
    setValues: {
      'printer.awd_enabled': true,
    },
  },
  {
    id: 'hybrid_corexy_enables_awd',
    description: 'Hybrid CoreXY kinematics enables AWD mode',
    condition: "printer.kinematics == 'hybrid_corexy'",
    setValues: {
      'printer.awd_enabled': true,
    },
  },
  {
    id: 'non_awd_disables_awd',
    description: 'Non-AWD kinematics disables AWD mode',
    condition: "printer.kinematics != 'corexy-awd' and printer.kinematics != 'hybrid_corexy'",
    setValues: {
      'printer.awd_enabled': false,
    },
    priority: -1, // Lower priority so explicit AWD selection can override
  },

  // Probe implications
  {
    id: 'tap_zero_offsets',
    description: 'Tap probe has zero X/Y offsets',
    condition: "probe.probe_type == 'tap'",
    setValues: {
      'probe.x_offset': 0,
      'probe.y_offset': 0,
    },
  },
  {
    id: 'beacon_contact_homing',
    description: 'Beacon with contact mode sets homing method',
    condition: "probe.probe_type == 'beacon' and probe.homing_mode == 'contact'",
    setValues: {
      'homing.homing_method': 'beacon_contact',
    },
  },
  {
    id: 'cartographer_touch_homing',
    description: 'Cartographer with touch mode sets homing method',
    condition: "probe.probe_type == 'cartographer' and probe.homing_mode == 'touch'",
    setValues: {
      'homing.homing_method': 'cartographer_touch',
    },
  },
  {
    id: 'bltouch_homing',
    description: 'BLTouch sets standard probe homing',
    condition: "probe.probe_type == 'bltouch'",
    setValues: {
      'homing.homing_method': 'probe',
    },
  },
  {
    id: 'tap_homing',
    description: 'Tap sets probe homing method',
    condition: "probe.probe_type == 'tap'",
    setValues: {
      'homing.homing_method': 'probe',
    },
  },

  // Z motor count implications
  {
    id: 'z_motor_count_2_enables_z_tilt',
    description: '2 Z motors enables Z tilt',
    condition: 'z_config.motor_count == 2',
    setValues: {
      'leveling.type': 'z_tilt',
    },
    allowOverride: true,
  },
  {
    id: 'z_motor_count_3_enables_z_tilt',
    description: '3 Z motors enables Z tilt',
    condition: 'z_config.motor_count == 3',
    setValues: {
      'leveling.type': 'z_tilt',
    },
    allowOverride: true,
  },
  {
    id: 'z_motor_count_4_enables_qgl',
    description: '4 Z motors enables QGL',
    condition: 'z_config.motor_count == 4',
    setValues: {
      'leveling.type': 'quad_gantry_level',
    },
    allowOverride: true,
  },

  // Toolboard implications
  {
    id: 'toolboard_default_extruder_location',
    description: 'Toolboard enabled defaults extruder to toolboard',
    condition: 'mcu.toolboard.enabled == true',
    setValues: {
      'extruder.motor_location': 'toolboard',
      'fans.part_cooling.location': 'toolboard',
      'fans.hotend.location': 'toolboard',
    },
    allowOverride: true,
    priority: -1, // Low priority so user can override
  },

  // Sensorless homing implications
  {
    id: 'sensorless_x_uses_diag',
    description: 'Sensorless X homing uses diag pin',
    condition: "homing.x_endstop_type == 'sensorless'",
    setValues: {
      'stepper_x.endstop_pin': 'virtual_endstop',
    },
  },
  {
    id: 'sensorless_y_uses_diag',
    description: 'Sensorless Y homing uses diag pin',
    condition: "homing.y_endstop_type == 'sensorless'",
    setValues: {
      'stepper_y.endstop_pin': 'virtual_endstop',
    },
  },

  // Bed size implications for safe_z_home
  {
    id: 'safe_z_home_center',
    description: 'Safe Z home defaults to bed center',
    condition: 'printer.bed_size_x and printer.bed_size_y',
    setValues: {
      // These will be calculated dynamically
    },
    allowOverride: true,
  },
];

/**
 * Result of applying implications
 */
export interface ImplicationResult {
  /** Values that were changed */
  changedValues: Record<string, any>;
  /** Implications that were applied */
  appliedImplications: string[];
  /** Implications that were skipped due to user override */
  skippedImplications: string[];
}

/**
 * Apply all implications to the wizard state.
 * Returns the values that should be changed.
 *
 * @param state - Current wizard state
 * @param userOverrides - Keys that the user has explicitly set (won't be auto-changed if allowOverride)
 * @returns ImplicationResult with changes to apply
 */
export function applyImplications(
  state: WizardState,
  userOverrides: Set<string> = new Set()
): ImplicationResult {
  const result: ImplicationResult = {
    changedValues: {},
    appliedImplications: [],
    skippedImplications: [],
  };

  // Sort implications by priority (lower first)
  const sortedImplications = [...IMPLICATIONS].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  );

  for (const implication of sortedImplications) {
    // Check if condition is met
    if (!evaluateCondition(implication.condition, state)) {
      continue;
    }

    // Apply each value from this implication
    for (const [key, value] of Object.entries(implication.setValues)) {
      // Skip if user has overridden and implication allows override
      if (implication.allowOverride && userOverrides.has(key)) {
        result.skippedImplications.push(`${implication.id}:${key}`);
        continue;
      }

      // Skip if value is already the same
      if (state[key] === value) {
        continue;
      }

      // Apply the value
      result.changedValues[key] = value;
      result.appliedImplications.push(implication.id);
    }
  }

  return result;
}

/**
 * Get all implications that would apply given the current state.
 * Useful for showing users what will be auto-configured.
 */
export function getActiveImplications(state: WizardState): Implication[] {
  return IMPLICATIONS.filter(imp => evaluateCondition(imp.condition, state));
}

/**
 * Check if a specific field is controlled by an implication.
 * Returns the implication if found, undefined otherwise.
 */
export function getImplicationForField(
  field: string,
  state: WizardState
): Implication | undefined {
  for (const implication of IMPLICATIONS) {
    if (field in implication.setValues && evaluateCondition(implication.condition, state)) {
      return implication;
    }
  }
  return undefined;
}

/**
 * Calculate dynamic implications that depend on other state values.
 * For example, safe_z_home position based on bed size.
 */
export function calculateDynamicImplications(state: WizardState): Record<string, any> {
  const dynamic: Record<string, any> = {};

  // Calculate safe Z home center position
  const bedX = state['printer.bed_size_x'];
  const bedY = state['printer.bed_size_y'];

  if (bedX && bedY) {
    // Only set if not already set
    if (!state['safe_z_home.home_xy_position']) {
      dynamic['safe_z_home.home_x'] = Math.round(bedX / 2);
      dynamic['safe_z_home.home_y'] = Math.round(bedY / 2);
    }
  }

  return dynamic;
}

export default applyImplications;
