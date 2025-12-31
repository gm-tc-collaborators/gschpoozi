/**
 * Zustand store for wizard state management
 * Mirrors the Python WizardState class functionality
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'gschpoozi-wizard-state';

interface WizardStore {
  // State using dot notation (matches Python WizardState)
  state: Record<string, any>;

  // History for undo/redo
  history: Record<string, any>[];
  historyIndex: number;

  // Currently active panel
  activePanel: string | null;

  // Actions
  setField: (key: string, value: any) => void;
  setFields: (fields: Record<string, any>) => void;
  getFieldValue: <T>(key: string, defaultValue?: T) => T | undefined;
  setActivePanel: (panel: string | null) => void;
  loadState: (newState: Record<string, any>) => void;
  resetState: () => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  deleteField: (key: string) => void;
}

/**
 * Check if a value should be considered "empty" and thus deleted from state.
 * We keep 0 and false as they are valid values.
 */
function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null) return true;
  if (value === '') return true;
  // Arrays are considered empty if they have no elements
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

/**
 * Clean state by removing all empty values
 */
function cleanState(state: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(state)) {
    if (!isEmptyValue(value)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

const initialState: Record<string, any> = {};

const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      state: initialState,
      history: [],
      historyIndex: -1,
      activePanel: null,

      setField: (key: string, value: any) => {
        const { state, pushHistory } = get();
        pushHistory();

        // If value is empty, delete the key instead of setting it
        if (isEmptyValue(value)) {
          const newState = { ...state };
          delete newState[key];
          set({ state: newState });
        } else {
          set({
            state: { ...state, [key]: value },
          });
        }
      },

      setFields: (fields: Record<string, any>) => {
        const { state, pushHistory } = get();
        pushHistory();

        const newState = { ...state };
        for (const [key, value] of Object.entries(fields)) {
          if (isEmptyValue(value)) {
            delete newState[key];
          } else {
            newState[key] = value;
          }
        }
        set({ state: newState });
      },

      deleteField: (key: string) => {
        const { state, pushHistory } = get();
        pushHistory();
        const newState = { ...state };
        delete newState[key];
        set({ state: newState });
      },

      getFieldValue: <T>(key: string, defaultValue?: T) => {
        const { state } = get();
        return (state[key] ?? defaultValue) as T | undefined;
      },

      setActivePanel: (panel: string | null) => {
        set({ activePanel: panel });
      },

      loadState: (newState: Record<string, any>) => {
        const { pushHistory } = get();
        pushHistory();
        // Clean the incoming state
        set({ state: cleanState(newState) });
      },

      resetState: () => {
        const { pushHistory } = get();
        pushHistory();
        set({
          state: { ...initialState },
          activePanel: null,
        });
      },

      pushHistory: () => {
        const { state, history, historyIndex } = get();
        // Remove future states if we're not at the end
        const newHistory = history.slice(0, historyIndex + 1);
        // Add current state
        newHistory.push({ ...state });
        // Keep only last 20 states
        if (newHistory.length > 20) {
          newHistory.shift();
        }
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          set({
            state: { ...history[historyIndex - 1] },
            historyIndex: historyIndex - 1,
          });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          set({
            state: { ...history[historyIndex + 1] },
            historyIndex: historyIndex + 1,
          });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        state: state.state,
        // Don't persist history to localStorage
      }),
    }
  )
);

export default useWizardStore;
