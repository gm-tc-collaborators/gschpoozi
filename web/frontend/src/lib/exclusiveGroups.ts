/**
 * Exclusive Groups System
 *
 * Manages mutually exclusive options where only one choice can be active at a time.
 * When one option in a group is selected, others are automatically deselected.
 */

import { type WizardState } from './conditionEngine';

/**
 * An exclusive group definition
 */
export interface ExclusiveGroup {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this group controls */
  description: string;
  /** The state key that holds the selected option */
  stateKey: string;
  /** Available options in this group */
  options: ExclusiveOption[];
  /** Optional condition for when this group is relevant */
  condition?: string;
  /** Whether selection is required */
  required?: boolean;
}

/**
 * An option within an exclusive group
 */
export interface ExclusiveOption {
  /** Option value stored in state */
  value: string;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Additional state keys to set when this option is selected */
  impliedValues?: Record<string, any>;
  /** Additional state keys to clear when this option is selected */
  clearValues?: string[];
  /** Condition for when this option is available */
  condition?: string;
}

/**
 * Built-in exclusive groups based on CLI wizard
 */
export const EXCLUSIVE_GROUPS: ExclusiveGroup[] = [
  // Kinematics type
  {
    id: 'kinematics',
    name: 'Kinematics Type',
    description: 'The motion system of your printer',
    stateKey: 'printer.kinematics',
    required: true,
    options: [
      {
        value: 'cartesian',
        label: 'Cartesian',
        description: 'Standard bed-slinger or moving gantry (Ender 3, Prusa MK3)',
      },
      {
        value: 'corexy',
        label: 'CoreXY',
        description: 'Fixed bed with CoreXY gantry (Voron, RatRig)',
      },
      {
        value: 'corexy-awd',
        label: 'CoreXY AWD',
        description: 'CoreXY with All Wheel Drive (4 XY motors)',
        impliedValues: { 'printer.awd_enabled': true },
      },
      {
        value: 'hybrid_corexy',
        label: 'Hybrid CoreXY',
        description: 'CoreXY variant with AWD (VzBot style)',
        impliedValues: { 'printer.awd_enabled': true },
      },
      {
        value: 'corexz',
        label: 'CoreXZ',
        description: 'CoreXZ motion system',
      },
      {
        value: 'delta',
        label: 'Delta',
        description: 'Delta printer (Kossel, Anycubic Predator)',
      },
    ],
  },

  // Probe type
  {
    id: 'probe_type',
    name: 'Probe Type',
    description: 'Bed leveling probe type',
    stateKey: 'probe.probe_type',
    options: [
      {
        value: 'none',
        label: 'None / Manual',
        description: 'No probe, manual bed leveling only',
        clearValues: ['probe.x_offset', 'probe.y_offset', 'probe.z_offset'],
      },
      {
        value: 'bltouch',
        label: 'BLTouch / 3DTouch',
        description: 'Servo-actuated probe',
        impliedValues: { 'probe.needs_deploy': true },
      },
      {
        value: 'inductive',
        label: 'Inductive Probe',
        description: 'Proximity sensor (PINDA, SuperPINDA)',
      },
      {
        value: 'tap',
        label: 'Voron Tap',
        description: 'Nozzle-based probing',
        impliedValues: { 'probe.x_offset': 0, 'probe.y_offset': 0 },
      },
      {
        value: 'beacon',
        label: 'Beacon',
        description: 'Eddy current probe with contact mode',
      },
      {
        value: 'cartographer',
        label: 'Cartographer',
        description: 'Eddy current probe with touch mode',
      },
      {
        value: 'klicky',
        label: 'Klicky / Euclid',
        description: 'Dockable probe',
        impliedValues: { 'probe.needs_deploy': true },
      },
    ],
  },

  // Leveling type
  {
    id: 'leveling_type',
    name: 'Leveling Type',
    description: 'Automatic bed leveling method',
    stateKey: 'leveling.type',
    options: [
      {
        value: 'none',
        label: 'None',
        description: 'No automatic leveling',
      },
      {
        value: 'bed_mesh',
        label: 'Bed Mesh Only',
        description: 'Software compensation for bed irregularities',
        condition: 'probe.probe_type != "none"',
      },
      {
        value: 'z_tilt',
        label: 'Z Tilt Adjust',
        description: 'Physical Z motor alignment (2-3 motors)',
        condition: 'z_config.motor_count >= 2 and z_config.motor_count <= 3',
      },
      {
        value: 'quad_gantry_level',
        label: 'Quad Gantry Level',
        description: 'Gantry leveling for 4 Z motors',
        condition: 'z_config.motor_count == 4',
      },
    ],
  },

  // X endstop type
  {
    id: 'x_endstop_type',
    name: 'X Endstop Type',
    description: 'How X axis homes',
    stateKey: 'homing.x_endstop_type',
    options: [
      {
        value: 'physical',
        label: 'Physical Switch',
        description: 'Mechanical or optical endstop',
      },
      {
        value: 'sensorless',
        label: 'Sensorless (StallGuard)',
        description: 'TMC driver stall detection',
        condition: "stepper_x.driver_type in ['tmc2209', 'tmc2226', 'tmc2240', 'tmc5160', 'tmc2130']",
      },
    ],
  },

  // Y endstop type
  {
    id: 'y_endstop_type',
    name: 'Y Endstop Type',
    description: 'How Y axis homes',
    stateKey: 'homing.y_endstop_type',
    options: [
      {
        value: 'physical',
        label: 'Physical Switch',
        description: 'Mechanical or optical endstop',
      },
      {
        value: 'sensorless',
        label: 'Sensorless (StallGuard)',
        description: 'TMC driver stall detection',
        condition: "stepper_y.driver_type in ['tmc2209', 'tmc2226', 'tmc2240', 'tmc5160', 'tmc2130']",
      },
    ],
  },

  // Z endstop type
  {
    id: 'z_endstop_type',
    name: 'Z Endstop Type',
    description: 'How Z axis homes',
    stateKey: 'homing.z_endstop_type',
    options: [
      {
        value: 'physical',
        label: 'Physical Switch',
        description: 'Mechanical endstop at Z min or max',
      },
      {
        value: 'probe',
        label: 'Probe',
        description: 'Use bed probe for Z homing',
        condition: "probe.probe_type != 'none'",
      },
    ],
  },

  // Tooling type
  {
    id: 'tooling_type',
    name: 'Tooling Configuration',
    description: 'Single or multi-tool setup',
    stateKey: 'tooling.type',
    options: [
      {
        value: 'single',
        label: 'Single Extruder',
        description: 'Standard single-tool setup',
      },
      {
        value: 'multi_extruder',
        label: 'Multi-Extruder',
        description: 'Multiple extruders (T0, T1, etc.)',
      },
      {
        value: 'mmu',
        label: 'MMU/ERCF',
        description: 'Multi-material unit (filament switching)',
      },
      {
        value: 'toolchanger',
        label: 'Toolchanger',
        description: 'Physical tool changing system',
      },
    ],
  },

  // MCU connection type
  {
    id: 'mcu_connection',
    name: 'MCU Connection',
    description: 'How the mainboard connects',
    stateKey: 'mcu.main.connection_type',
    options: [
      {
        value: 'usb',
        label: 'USB Serial',
        description: 'Standard USB connection',
      },
      {
        value: 'can',
        label: 'CAN Bus',
        description: 'CAN bus connection (requires CAN adapter)',
      },
    ],
  },
];

/**
 * Get an exclusive group by ID
 */
export function getExclusiveGroup(id: string): ExclusiveGroup | undefined {
  return EXCLUSIVE_GROUPS.find(g => g.id === id);
}

/**
 * Get the exclusive group for a state key
 */
export function getGroupForStateKey(stateKey: string): ExclusiveGroup | undefined {
  return EXCLUSIVE_GROUPS.find(g => g.stateKey === stateKey);
}

/**
 * Get the currently selected option in a group
 */
export function getSelectedOption(
  group: ExclusiveGroup,
  state: WizardState
): ExclusiveOption | undefined {
  const value = state[group.stateKey];
  return group.options.find(o => o.value === value);
}

/**
 * Get available options for a group based on current state
 */
export function getAvailableOptions(
  group: ExclusiveGroup,
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): ExclusiveOption[] {
  return group.options.filter(option => {
    if (!option.condition) return true;
    return evaluateCondition(option.condition, state);
  });
}

/**
 * Select an option in a group and return the state changes to apply
 */
export function selectOption(
  group: ExclusiveGroup,
  optionValue: string,
  _state?: WizardState
): Record<string, any> {
  const option = group.options.find(o => o.value === optionValue);
  if (!option) {
    return { [group.stateKey]: undefined };
  }

  const changes: Record<string, any> = {
    [group.stateKey]: optionValue,
  };

  // Apply implied values
  if (option.impliedValues) {
    Object.assign(changes, option.impliedValues);
  }

  // Clear values from other options and specified clear values
  for (const otherOption of group.options) {
    if (otherOption.value !== optionValue && otherOption.impliedValues) {
      for (const key of Object.keys(otherOption.impliedValues)) {
        if (!(key in changes)) {
          changes[key] = undefined;
        }
      }
    }
  }

  if (option.clearValues) {
    for (const key of option.clearValues) {
      changes[key] = undefined;
    }
  }

  return changes;
}

/**
 * Check if a group is relevant given the current state
 */
export function isGroupRelevant(
  group: ExclusiveGroup,
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): boolean {
  if (!group.condition) return true;
  return evaluateCondition(group.condition, state);
}

/**
 * Get all groups that are currently relevant
 */
export function getRelevantGroups(
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): ExclusiveGroup[] {
  return EXCLUSIVE_GROUPS.filter(g => isGroupRelevant(g, state, evaluateCondition));
}

export default EXCLUSIVE_GROUPS;
