/**
 * API client for gschpoozi backend
 */

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:8000/api';

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BoardTemplate {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
  data?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidateResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface GenerateResponse {
  success: boolean;
  files: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export interface StateResponse {
  state: Record<string, any>;
  metadata: Record<string, any>;
}

export interface BackupInfo {
  filename: string;
  created: string;
  size: number;
}

export interface AllTemplates {
  boards: BoardTemplate[];
  toolboards: BoardTemplate[];
  probes: BoardTemplate[];
  extruders: BoardTemplate[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates API
// ─────────────────────────────────────────────────────────────────────────────

export const templatesApi = {
  async getAllTemplates(): Promise<AllTemplates> {
    return fetchJSON('/templates/all');
  },

  async getBoards(): Promise<BoardTemplate[]> {
    return fetchJSON('/boards');
  },

  async getBoard(id: string): Promise<Record<string, any>> {
    return fetchJSON(`/boards/${id}`);
  },

  async getToolboards(): Promise<BoardTemplate[]> {
    return fetchJSON('/toolboards');
  },

  async getToolboard(id: string): Promise<Record<string, any>> {
    return fetchJSON(`/toolboards/${id}`);
  },

  async getProbes(): Promise<BoardTemplate[]> {
    return fetchJSON('/probes');
  },

  async getProbe(id: string): Promise<Record<string, any>> {
    return fetchJSON(`/probes/${id}`);
  },

  async getExtruders(): Promise<BoardTemplate[]> {
    return fetchJSON('/extruders');
  },

  async getExtruder(id: string): Promise<Record<string, any>> {
    return fetchJSON(`/extruders/${id}`);
  },

  async getMotors(): Promise<Record<string, any>[]> {
    return fetchJSON('/motors');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Generator API
// ─────────────────────────────────────────────────────────────────────────────

export const generatorApi = {
  async validate(wizardState: Record<string, any>): Promise<ValidateResponse> {
    return fetchJSON('/validate', {
      method: 'POST',
      body: JSON.stringify({ wizard_state: wizardState }),
    });
  },

  async preview(wizardState: Record<string, any>): Promise<GenerateResponse> {
    return fetchJSON('/preview', {
      method: 'POST',
      body: JSON.stringify({ wizard_state: wizardState }),
    });
  },

  async generate(wizardState: Record<string, any>, outputDir: string): Promise<GenerateResponse> {
    return fetchJSON('/generate', {
      method: 'POST',
      body: JSON.stringify({ wizard_state: wizardState, output_dir: outputDir }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// State API
// ─────────────────────────────────────────────────────────────────────────────

export const stateApi = {
  async load(stateDir?: string): Promise<StateResponse> {
    const params = stateDir ? `?state_dir=${encodeURIComponent(stateDir)}` : '';
    return fetchJSON(`/state${params}`);
  },

  async save(state: Record<string, any>, stateDir?: string): Promise<{ success: boolean; path: string; message: string }> {
    return fetchJSON('/state', {
      method: 'POST',
      body: JSON.stringify({ state, state_dir: stateDir }),
    });
  },

  async clear(stateDir?: string): Promise<{ success: boolean; path: string; message: string }> {
    const params = stateDir ? `?state_dir=${encodeURIComponent(stateDir)}` : '';
    return fetchJSON(`/state${params}`, { method: 'DELETE' });
  },

  async listBackups(stateDir?: string): Promise<{ backups: BackupInfo[] }> {
    const params = stateDir ? `?state_dir=${encodeURIComponent(stateDir)}` : '';
    return fetchJSON(`/state/backups${params}`);
  },

  async restoreBackup(backupName: string, stateDir?: string): Promise<{ success: boolean; path: string; message: string }> {
    const params = stateDir ? `?state_dir=${encodeURIComponent(stateDir)}` : '';
    return fetchJSON(`/state/restore/${backupName}${params}`, { method: 'POST' });
  },

  async importConfig(configText: string): Promise<StateResponse> {
    return fetchJSON('/state/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: configText,
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; [key: string]: any }> {
  return fetchJSON('/health');
}

export async function getInfo(): Promise<{ name: string; version: string; description: string }> {
  return fetchJSON('/info');
}

