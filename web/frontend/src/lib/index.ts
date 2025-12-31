/**
 * Library exports for wizard logic
 */

export { evaluateCondition, evaluateConditions, evaluateAnyCondition, getConditionDependencies } from './conditionEngine';
export type { WizardState } from './conditionEngine';

export { applyImplications, getActiveImplications, getImplicationForField, calculateDynamicImplications, IMPLICATIONS } from './implications';
export type { Implication, ImplicationResult } from './implications';

export { detectConflicts, getConflictsBySeverity, getConflictsByCategory, hasErrors, hasWarnings, getConflictSummary, getFieldConflicts, CONFLICT_RULES } from './conflicts';
export type { ConflictRule, Conflict, ConflictSeverity } from './conflicts';

export { EXCLUSIVE_GROUPS, getExclusiveGroup, getGroupForStateKey, getSelectedOption, getAvailableOptions, selectOption, isGroupRelevant, getRelevantGroups } from './exclusiveGroups';
export type { ExclusiveGroup, ExclusiveOption } from './exclusiveGroups';

export { validateState, isValidForGeneration, getValidationSummary } from './validator';
export type { ValidationResult, FieldValidation } from './validator';

export {
  INHERITANCE_RELATIONS,
  COPYABLE_STEPPER_FIELDS,
  UNIQUE_STEPPER_FIELDS,
  getInheritanceRelation,
  shouldInherit,
  getInheritedValues,
  copyStepperSettings,
  hasCustomValues,
  getCustomFields,
  applyInheritance,
} from './inheritance';
export type { InheritanceRelation } from './inheritance';
