import * as THREE from 'three';

/**
 * Shared PBR materials for 3D printer components
 * These provide consistent, realistic materials across all models
 */

// Anodized aluminum (black) - for frames and extrusions
export const anodizedAluminumMaterial = new THREE.MeshPhysicalMaterial({
  color: '#1e293b',
  metalness: 0.7,
  roughness: 0.35,
  clearcoat: 0.1,
  clearcoatRoughness: 0.4,
});

// Raw aluminum - for heatsinks
export const rawAluminumMaterial = new THREE.MeshPhysicalMaterial({
  color: '#9ca3af',
  metalness: 0.9,
  roughness: 0.25,
  clearcoat: 0.05,
});

// Steel/stainless - for shafts, screws
export const steelMaterial = new THREE.MeshStandardMaterial({
  color: '#6b7280',
  metalness: 0.95,
  roughness: 0.15,
});

// Brass/copper - for nozzles, heater blocks
export const brassMaterial = new THREE.MeshPhysicalMaterial({
  color: '#b45309',
  metalness: 0.85,
  roughness: 0.2,
  clearcoat: 0.1,
});

// PCB green - for mainboard
export const pcbMaterial = new THREE.MeshStandardMaterial({
  color: '#065f46',
  metalness: 0.1,
  roughness: 0.8,
});

// Black plastic - for motor bodies, fan shrouds
export const blackPlasticMaterial = new THREE.MeshStandardMaterial({
  color: '#1f2937',
  metalness: 0.0,
  roughness: 0.7,
});

// Dark gray plastic - for printed parts
export const grayPlasticMaterial = new THREE.MeshStandardMaterial({
  color: '#374151',
  metalness: 0.0,
  roughness: 0.6,
});

// Glass/PEI bed surface
export const bedSurfaceMaterial = new THREE.MeshPhysicalMaterial({
  color: '#334155',
  metalness: 0.1,
  roughness: 0.4,
  clearcoat: 0.3,
  clearcoatRoughness: 0.2,
});

// Silicone heater pad
export const siliconeMaterial = new THREE.MeshStandardMaterial({
  color: '#dc2626',
  metalness: 0.0,
  roughness: 0.9,
});

// Belt material (GT2)
export const beltMaterial = new THREE.MeshStandardMaterial({
  color: '#1f2937',
  metalness: 0.0,
  roughness: 0.8,
});

// Linear rail (silver)
export const linearRailMaterial = new THREE.MeshPhysicalMaterial({
  color: '#94a3b8',
  metalness: 0.85,
  roughness: 0.2,
  clearcoat: 0.05,
});

/**
 * Create a material with custom color but shared properties
 */
export function createMetalMaterial(color: string, metalness = 0.6, roughness = 0.4) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
  });
}

export function createPlasticMaterial(color: string, roughness = 0.6) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness,
  });
}

/**
 * Material presets for different component states
 */
export const componentColors = {
  // Default state colors
  stepper: {
    default: '#374151',
    hover: '#3b82f6',
    selected: '#60a5fa',
  },
  extruder: {
    default: '#475569',
    hover: '#8b5cf6',
    selected: '#a78bfa',
  },
  hotend: {
    default: '#475569',
    hover: '#f97316',
    selected: '#fb923c',
  },
  heaterBed: {
    default: '#334155',
    hover: '#dc2626',
    selected: '#ef4444',
  },
  mcu: {
    default: '#065f46',
    hover: '#10b981',
    selected: '#34d399',
  },
  probe: {
    default: '#475569',
    hover: '#8b5cf6',
    selected: '#a78bfa',
  },
  fan: {
    default: '#374151',
    hover: '#0ea5e9',
    selected: '#38bdf8',
  },
};
