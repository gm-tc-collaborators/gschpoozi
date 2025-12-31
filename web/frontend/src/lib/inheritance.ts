/**
 * Inheritance System for Stepper Configuration
 *
 * Implements:
 * 1. copy_from_option: Offer to copy settings from one stepper to another
 * 2. inherit_from: Automatically inherit settings from a parent stepper
 */

import { type WizardState } from './conditionEngine';

/**
 * Fields that can be copied between steppers
 */
export const COPYABLE_STEPPER_FIELDS = [
  'driver_type',
  'microsteps',
  'rotation_distance',
  'run_current',
  'hold_current',
  'stealthchop_threshold',
  'interpolate',
] as const;

/**
 * Fields that are always unique per stepper (never copied)
 */
export const UNIQUE_STEPPER_FIELDS = [
  'motor_port',
  'step_pin',
  'dir_pin',
  'enable_pin',
  'uart_pin',
  'cs_pin',
  'diag_pin',
  'endstop_port',
  'endstop_pin',
  'position_min',
  'position_max',
  'position_endstop',
  'homing_direction',
] as const;

/**
 * Inheritance relationships between steppers
 */
export interface InheritanceRelation {
  /** The child stepper that inherits */
  child: string;
  /** The parent stepper to inherit from */
  parent: string;
  /** Fields to inherit */
  fields: readonly string[];
  /** Condition for when this inheritance applies */
  condition?: string;
  /** Description of this relationship */
  description: string;
}

/**
 * Built-in inheritance relationships
 */
export const INHERITANCE_RELATIONS: InheritanceRelation[] = [
  // Y inherits from X (CoreXY steppers are typically identical)
  {
    child: 'stepper_y',
    parent: 'stepper_x',
    fields: COPYABLE_STEPPER_FIELDS,
    description: 'Y stepper uses same settings as X (common for CoreXY)',
  },

  // AWD steppers inherit from their primary
  {
    child: 'stepper_x1',
    parent: 'stepper_x',
    fields: COPYABLE_STEPPER_FIELDS,
    condition: 'printer.awd_enabled',
    description: 'X1 stepper (AWD) inherits from X',
  },
  {
    child: 'stepper_y1',
    parent: 'stepper_y',
    fields: COPYABLE_STEPPER_FIELDS,
    condition: 'printer.awd_enabled',
    description: 'Y1 stepper (AWD) inherits from Y',
  },

  // Additional Z steppers inherit from Z
  {
    child: 'stepper_z1',
    parent: 'stepper_z',
    fields: COPYABLE_STEPPER_FIELDS,
    condition: 'z_config.motor_count >= 2',
    description: 'Z1 stepper inherits from Z',
  },
  {
    child: 'stepper_z2',
    parent: 'stepper_z',
    fields: COPYABLE_STEPPER_FIELDS,
    condition: 'z_config.motor_count >= 3',
    description: 'Z2 stepper inherits from Z',
  },
  {
    child: 'stepper_z3',
    parent: 'stepper_z',
    fields: COPYABLE_STEPPER_FIELDS,
    condition: 'z_config.motor_count >= 4',
    description: 'Z3 stepper inherits from Z',
  },
];

/**
 * Get the inheritance relation for a stepper
 */
export function getInheritanceRelation(stepperName: string): InheritanceRelation | undefined {
  return INHERITANCE_RELATIONS.find(r => r.child === stepperName);
}

/**
 * Check if a stepper should inherit from another
 */
export function shouldInherit(
  stepperName: string,
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): boolean {
  const relation = getInheritanceRelation(stepperName);
  if (!relation) return false;

  // Check if condition is met
  if (relation.condition && !evaluateCondition(relation.condition, state)) {
    return false;
  }

  return true;
}

/**
 * Get inherited values for a stepper from its parent
 */
export function getInheritedValues(
  stepperName: string,
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): Record<string, any> {
  const relation = getInheritanceRelation(stepperName);
  if (!relation) return {};

  // Check if condition is met
  if (relation.condition && !evaluateCondition(relation.condition, state)) {
    return {};
  }

  const inherited: Record<string, any> = {};

  for (const field of relation.fields) {
    const parentKey = `${relation.parent}.${field}`;
    const parentValue = state[parentKey];

    if (parentValue !== undefined) {
      inherited[`${stepperName}.${field}`] = parentValue;
    }
  }

  return inherited;
}

/**
 * Copy settings from one stepper to another
 */
export function copyStepperSettings(
  fromStepper: string,
  toStepper: string,
  state: WizardState,
  fieldsToSkip: string[] = []
): Record<string, any> {
  const copied: Record<string, any> = {};

  for (const field of COPYABLE_STEPPER_FIELDS) {
    if (fieldsToSkip.includes(field)) continue;

    const fromKey = `${fromStepper}.${field}`;
    const fromValue = state[fromKey];

    if (fromValue !== undefined) {
      copied[`${toStepper}.${field}`] = fromValue;
    }
  }

  return copied;
}

/**
 * Check if a stepper has custom values (not inherited)
 */
export function hasCustomValues(
  stepperName: string,
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): boolean {
  const relation = getInheritanceRelation(stepperName);
  if (!relation) return true; // No inheritance, so all values are "custom"

  // Check if condition is met
  if (relation.condition && !evaluateCondition(relation.condition, state)) {
    return true; // Inheritance doesn't apply, so all values are "custom"
  }

  // Check if any inherited field has a different value
  for (const field of relation.fields) {
    const childKey = `${stepperName}.${field}`;
    const parentKey = `${relation.parent}.${field}`;

    const childValue = state[childKey];
    const parentValue = state[parentKey];

    // If child has a value and it differs from parent, it's custom
    if (childValue !== undefined && childValue !== parentValue) {
      return true;
    }
  }

  return false;
}

/**
 * Get fields that differ from inherited values
 */
export function getCustomFields(
  stepperName: string,
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): string[] {
  const relation = getInheritanceRelation(stepperName);
  if (!relation) return [];

  // Check if condition is met
  if (relation.condition && !evaluateCondition(relation.condition, state)) {
    return [];
  }

  const customFields: string[] = [];

  for (const field of relation.fields) {
    const childKey = `${stepperName}.${field}`;
    const parentKey = `${relation.parent}.${field}`;

    const childValue = state[childKey];
    const parentValue = state[parentKey];

    if (childValue !== undefined && childValue !== parentValue) {
      customFields.push(field);
    }
  }

  return customFields;
}

/**
 * Apply inheritance - copies parent values to child for any unset fields
 */
export function applyInheritance(
  stepperName: string,
  state: WizardState,
  evaluateCondition: (condition: string, state: WizardState) => boolean
): Record<string, any> {
  const relation = getInheritanceRelation(stepperName);
  if (!relation) return {};

  // Check if condition is met
  if (relation.condition && !evaluateCondition(relation.condition, state)) {
    return {};
  }

  const changes: Record<string, any> = {};

  for (const field of relation.fields) {
    const childKey = `${stepperName}.${field}`;
    const parentKey = `${relation.parent}.${field}`;

    const childValue = state[childKey];
    const parentValue = state[parentKey];

    // Only inherit if child doesn't have a value
    if (childValue === undefined && parentValue !== undefined) {
      changes[childKey] = parentValue;
    }
  }

  return changes;
}

export default INHERITANCE_RELATIONS;
