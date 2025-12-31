/**
 * Hook that integrates all wizard logic systems:
 * - Condition evaluation
 * - Implications
 * - Conflicts
 * - Validation
 * - Inheritance
 */

import { useMemo, useCallback } from 'react';
import useWizardStore from '../stores/wizardStore';
import {
  evaluateCondition,
  applyImplications,
  detectConflicts,
  validateState,
  getValidationSummary,
  getInheritedValues,
  shouldInherit,
  hasCustomValues,
  applyInheritance,
  type Conflict,
  type ValidationResult,
  type ImplicationResult,
} from '../lib';

export interface WizardLogic {
  /** Evaluate a condition against current state */
  evaluate: (condition: string | undefined | null) => boolean;

  /** Check if a field should be visible */
  isFieldVisible: (condition: string | undefined | null) => boolean;

  /** Get all active conflicts */
  conflicts: Conflict[];

  /** Check if there are any errors */
  hasErrors: boolean;

  /** Check if there are any warnings */
  hasWarnings: boolean;

  /** Full validation result */
  validation: ValidationResult;

  /** Validation summary for display */
  validationSummary: {
    canGenerate: boolean;
    errorCount: number;
    warningCount: number;
    completionPercent: number;
  };

  /** Apply implications and return changes */
  getImplicationChanges: () => ImplicationResult;

  /** Apply implications to state */
  applyImplications: () => void;

  /** Check if a stepper should inherit from parent */
  shouldStepperInherit: (stepperName: string) => boolean;

  /** Get inherited values for a stepper */
  getStepperInheritedValues: (stepperName: string) => Record<string, any>;

  /** Check if stepper has custom (non-inherited) values */
  stepperHasCustomValues: (stepperName: string) => boolean;

  /** Apply inheritance for a stepper */
  applyStepperInheritance: (stepperName: string) => void;
}

/**
 * Hook that provides all wizard logic functionality
 */
export function useWizardLogic(): WizardLogic {
  const state = useWizardStore((s) => s.state);
  const setFields = useWizardStore((s) => s.setFields);

  // Memoized condition evaluator
  const evaluate = useCallback(
    (condition: string | undefined | null): boolean => {
      return evaluateCondition(condition, state);
    },
    [state]
  );

  // Field visibility (same as evaluate, but more semantic)
  const isFieldVisible = useCallback(
    (condition: string | undefined | null): boolean => {
      return evaluateCondition(condition, state);
    },
    [state]
  );

  // Memoized conflicts
  const conflicts = useMemo(() => detectConflicts(state), [state]);

  // Error/warning checks
  const hasErrors = useMemo(
    () => conflicts.some((c) => c.rule.severity === 'error'),
    [conflicts]
  );

  const hasWarnings = useMemo(
    () => conflicts.some((c) => c.rule.severity === 'warning'),
    [conflicts]
  );

  // Full validation
  const validation = useMemo(() => validateState(state), [state]);

  // Validation summary
  const validationSummary = useMemo(() => getValidationSummary(state), [state]);

  // Get implication changes without applying
  const getImplicationChanges = useCallback((): ImplicationResult => {
    return applyImplications(state);
  }, [state]);

  // Apply implications to state
  const applyImplicationsToState = useCallback(() => {
    const result = applyImplications(state);
    if (Object.keys(result.changedValues).length > 0) {
      setFields(result.changedValues);
    }
  }, [state, setFields]);

  // Stepper inheritance helpers
  const shouldStepperInherit = useCallback(
    (stepperName: string): boolean => {
      return shouldInherit(stepperName, state, evaluate);
    },
    [state, evaluate]
  );

  const getStepperInheritedValues = useCallback(
    (stepperName: string): Record<string, any> => {
      return getInheritedValues(stepperName, state, evaluate);
    },
    [state, evaluate]
  );

  const stepperHasCustomValues = useCallback(
    (stepperName: string): boolean => {
      return hasCustomValues(stepperName, state, evaluate);
    },
    [state, evaluate]
  );

  const applyStepperInheritance = useCallback(
    (stepperName: string) => {
      const changes = applyInheritance(stepperName, state, evaluate);
      if (Object.keys(changes).length > 0) {
        setFields(changes);
      }
    },
    [state, evaluate, setFields]
  );

  return {
    evaluate,
    isFieldVisible,
    conflicts,
    hasErrors,
    hasWarnings,
    validation,
    validationSummary,
    getImplicationChanges,
    applyImplications: applyImplicationsToState,
    shouldStepperInherit,
    getStepperInheritedValues,
    stepperHasCustomValues,
    applyStepperInheritance,
  };
}

export default useWizardLogic;
