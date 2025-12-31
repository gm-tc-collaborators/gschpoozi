/**
 * TypeScript types for the wizard
 */

export interface WizardState {
  [key: string]: any;
}

export interface KinematicsOption {
  id: string;
  name: string;
  description: string;
  model: string;
}
