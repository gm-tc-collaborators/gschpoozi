import { useMemo } from 'react';

/**
 * Mapping of wizard state keys to their port type and display name
 */
const PORT_MAPPINGS: Record<string, { portType: string; displayName: string }> = {
  // Stepper motor ports
  'stepper_x.motor_port': { portType: 'motor', displayName: 'Stepper X' },
  'stepper_y.motor_port': { portType: 'motor', displayName: 'Stepper Y' },
  'stepper_z.motor_port': { portType: 'motor', displayName: 'Stepper Z' },
  'stepper_z1.motor_port': { portType: 'motor', displayName: 'Stepper Z1' },
  'stepper_z2.motor_port': { portType: 'motor', displayName: 'Stepper Z2' },
  'stepper_z3.motor_port': { portType: 'motor', displayName: 'Stepper Z3' },
  'stepper_x1.motor_port': { portType: 'motor', displayName: 'Stepper X1' },
  'stepper_y1.motor_port': { portType: 'motor', displayName: 'Stepper Y1' },
  'stepper_a.motor_port': { portType: 'motor', displayName: 'Stepper A' },
  'stepper_b.motor_port': { portType: 'motor', displayName: 'Stepper B' },
  'stepper_c.motor_port': { portType: 'motor', displayName: 'Stepper C' },
  'extruder.motor_port': { portType: 'motor', displayName: 'Extruder' },
  'extruder1.motor_port': { portType: 'motor', displayName: 'Extruder 1' },
  'extruder2.motor_port': { portType: 'motor', displayName: 'Extruder 2' },
  'extruder3.motor_port': { portType: 'motor', displayName: 'Extruder 3' },

  // Endstop ports
  'stepper_x.endstop_port': { portType: 'endstop', displayName: 'X Endstop' },
  'stepper_y.endstop_port': { portType: 'endstop', displayName: 'Y Endstop' },
  'stepper_z.endstop_port': { portType: 'endstop', displayName: 'Z Endstop' },

  // Fan ports
  'fans.part_cooling.port': { portType: 'fan', displayName: 'Part Cooling' },
  'fans.hotend.port': { portType: 'fan', displayName: 'Hotend Fan' },
  'fans.controller.port': { portType: 'fan', displayName: 'Controller Fan' },
  'fans.exhaust.port': { portType: 'fan', displayName: 'Exhaust Fan' },
  'fans.filter.port': { portType: 'fan', displayName: 'Filter Fan' },

  // Heater ports
  'heater_bed.heater_port': { portType: 'heater', displayName: 'Heated Bed' },
  'extruder.heater_port': { portType: 'heater', displayName: 'Hotend' },
  'extruder1.heater_port': { portType: 'heater', displayName: 'Hotend 1' },
  'chamber_heater.heater_port': { portType: 'heater', displayName: 'Chamber' },

  // Thermistor ports
  'heater_bed.thermistor_port': { portType: 'thermistor', displayName: 'Bed Sensor' },
  'extruder.thermistor_port': { portType: 'thermistor', displayName: 'Hotend Sensor' },
  'extruder1.thermistor_port': { portType: 'thermistor', displayName: 'Hotend 1 Sensor' },
  'chamber.thermistor_port': { portType: 'thermistor', displayName: 'Chamber Sensor' },

  // Probe ports
  'probe.port': { portType: 'probe', displayName: 'Probe' },
};

/**
 * Mapping of state keys that contain raw pin values (not port IDs)
 */
const PIN_MAPPINGS: Record<string, { displayName: string }> = {
  // Stepper pins
  'stepper_x.step_pin': { displayName: 'Stepper X Step' },
  'stepper_x.dir_pin': { displayName: 'Stepper X Dir' },
  'stepper_x.enable_pin': { displayName: 'Stepper X Enable' },
  'stepper_x.uart_pin': { displayName: 'Stepper X UART' },
  'stepper_x.endstop_pin': { displayName: 'X Endstop' },

  'stepper_y.step_pin': { displayName: 'Stepper Y Step' },
  'stepper_y.dir_pin': { displayName: 'Stepper Y Dir' },
  'stepper_y.enable_pin': { displayName: 'Stepper Y Enable' },
  'stepper_y.uart_pin': { displayName: 'Stepper Y UART' },
  'stepper_y.endstop_pin': { displayName: 'Y Endstop' },

  'stepper_z.step_pin': { displayName: 'Stepper Z Step' },
  'stepper_z.dir_pin': { displayName: 'Stepper Z Dir' },
  'stepper_z.enable_pin': { displayName: 'Stepper Z Enable' },
  'stepper_z.uart_pin': { displayName: 'Stepper Z UART' },
  'stepper_z.endstop_pin': { displayName: 'Z Endstop' },

  'stepper_z1.step_pin': { displayName: 'Stepper Z1 Step' },
  'stepper_z1.dir_pin': { displayName: 'Stepper Z1 Dir' },
  'stepper_z1.enable_pin': { displayName: 'Stepper Z1 Enable' },
  'stepper_z1.uart_pin': { displayName: 'Stepper Z1 UART' },

  'stepper_z2.step_pin': { displayName: 'Stepper Z2 Step' },
  'stepper_z2.dir_pin': { displayName: 'Stepper Z2 Dir' },
  'stepper_z2.enable_pin': { displayName: 'Stepper Z2 Enable' },
  'stepper_z2.uart_pin': { displayName: 'Stepper Z2 UART' },

  'stepper_z3.step_pin': { displayName: 'Stepper Z3 Step' },
  'stepper_z3.dir_pin': { displayName: 'Stepper Z3 Dir' },
  'stepper_z3.enable_pin': { displayName: 'Stepper Z3 Enable' },
  'stepper_z3.uart_pin': { displayName: 'Stepper Z3 UART' },

  'stepper_x1.step_pin': { displayName: 'Stepper X1 Step' },
  'stepper_x1.dir_pin': { displayName: 'Stepper X1 Dir' },
  'stepper_x1.enable_pin': { displayName: 'Stepper X1 Enable' },
  'stepper_x1.uart_pin': { displayName: 'Stepper X1 UART' },

  'stepper_y1.step_pin': { displayName: 'Stepper Y1 Step' },
  'stepper_y1.dir_pin': { displayName: 'Stepper Y1 Dir' },
  'stepper_y1.enable_pin': { displayName: 'Stepper Y1 Enable' },
  'stepper_y1.uart_pin': { displayName: 'Stepper Y1 UART' },

  'extruder.step_pin': { displayName: 'Extruder Step' },
  'extruder.dir_pin': { displayName: 'Extruder Dir' },
  'extruder.enable_pin': { displayName: 'Extruder Enable' },
  'extruder.uart_pin': { displayName: 'Extruder UART' },

  // Heater/thermistor pins
  'heater_bed.heater_pin': { displayName: 'Bed Heater' },
  'heater_bed.sensor_pin': { displayName: 'Bed Thermistor' },
  'extruder.heater_pin': { displayName: 'Hotend Heater' },
  'extruder.sensor_pin': { displayName: 'Hotend Thermistor' },

  // Fan pins
  'fans.part_cooling.pin': { displayName: 'Part Cooling Fan' },
  'fans.hotend.pin': { displayName: 'Hotend Fan' },
  'fans.controller.pin': { displayName: 'Controller Fan' },

  // Probe pin
  'probe.pin': { displayName: 'Probe' },
};

export interface PortUsage {
  portId: string;
  usedBy: string;
  stateKey: string;
}

/**
 * A detected pin conflict
 */
export interface PinConflict {
  /** The raw pin name (e.g., "PF13") */
  pin: string;
  /** Components using this pin */
  usedBy: string[];
  /** State keys using this pin */
  stateKeys: string[];
  /** Severity: error if same pin used for different purposes */
  severity: 'error' | 'warning';
}

export interface PortRegistry {
  /** Map of portId -> display name of what's using it */
  usedPorts: Map<string, string>;
  /** Get all ports used by a specific port type */
  getUsedByType: (portType: string) => Map<string, string>;
  /** Check if a port is available */
  isAvailable: (portId: string) => boolean;
  /** Get what's using a port */
  getUsage: (portId: string) => string | undefined;
  /** Detected pin conflicts */
  pinConflicts: PinConflict[];
  /** Check if a specific pin has conflicts */
  hasPinConflict: (pin: string) => boolean;
  /** Get conflict details for a pin */
  getPinConflict: (pin: string) => PinConflict | undefined;
}

/**
 * Extract the base pin name from a pin string (removes !, ^, MCU prefix)
 */
function extractBasePin(pin: string): string {
  if (!pin || typeof pin !== 'string') return '';
  // Remove modifiers like !, ^
  let base = pin.replace(/^[!^]+/, '');
  // Handle MCU prefix (e.g., "toolboard:PA0" -> "PA0")
  // But keep track that it's from a different MCU
  return base;
}

/**
 * Get the MCU prefix from a pin (e.g., "toolboard:PA0" -> "toolboard")
 */
function getMcuPrefix(pin: string): string {
  if (!pin || typeof pin !== 'string') return '';
  const colonIndex = pin.indexOf(':');
  if (colonIndex > 0) {
    // Extract prefix before the colon, but after any modifiers
    const withoutModifiers = pin.replace(/^[!^]+/, '');
    const prefixColonIndex = withoutModifiers.indexOf(':');
    if (prefixColonIndex > 0) {
      return withoutModifiers.substring(0, prefixColonIndex);
    }
  }
  return 'main'; // Default MCU
}

/**
 * Hook to track which board ports are already assigned in the wizard state.
 * Returns a map of portId -> "used by X" for display in selectors.
 * Also detects pin conflicts across all assigned pins.
 *
 * @param wizardState - The current wizard state
 * @param boardData - Mainboard data (optional)
 * @param toolboardData - Toolboard data (optional)
 */
export function usePortRegistry(
  wizardState: Record<string, any>,
  boardData?: Record<string, any> | null,
  toolboardData?: Record<string, any> | null
): PortRegistry {
  const registry = useMemo(() => {
    const usedPorts = new Map<string, string>();
    const usageByType = new Map<string, Map<string, string>>();

    // Initialize type maps
    for (const portType of ['motor', 'fan', 'heater', 'thermistor', 'endstop', 'probe']) {
      usageByType.set(portType, new Map());
    }

    // Scan wizard state for port assignments
    for (const [stateKey, mapping] of Object.entries(PORT_MAPPINGS)) {
      const portId = wizardState[stateKey];
      if (portId && typeof portId === 'string') {
        usedPorts.set(portId, mapping.displayName);
        usageByType.get(mapping.portType)?.set(portId, mapping.displayName);
      }
    }

    // Track all used pins for conflict detection
    // Key: "mcu:basePin" (e.g., "main:PF13", "toolboard:PA0")
    const pinUsage = new Map<string, { stateKeys: string[]; displayNames: string[] }>();

    for (const [stateKey, mapping] of Object.entries(PIN_MAPPINGS)) {
      const pinValue = wizardState[stateKey];
      if (pinValue && typeof pinValue === 'string') {
        // Skip virtual endstops and special values
        if (pinValue.includes('virtual_endstop') || pinValue.includes('probe:')) {
          continue;
        }

        const basePin = extractBasePin(pinValue);
        const mcu = getMcuPrefix(pinValue);
        const pinKey = `${mcu}:${basePin}`;

        if (!pinUsage.has(pinKey)) {
          pinUsage.set(pinKey, { stateKeys: [], displayNames: [] });
        }

        const usage = pinUsage.get(pinKey)!;
        usage.stateKeys.push(stateKey);
        usage.displayNames.push(mapping.displayName);
      }
    }

    // Detect conflicts (same pin used multiple times)
    const pinConflicts: PinConflict[] = [];

    for (const [pinKey, usage] of pinUsage.entries()) {
      if (usage.stateKeys.length > 1) {
        const [mcu, basePin] = pinKey.split(':');

        // Check if it's the same component (e.g., step_pin and dir_pin are different)
        // vs different components using the same pin (actual conflict)
        const uniqueComponents = new Set(
          usage.stateKeys.map(key => key.split('.')[0])
        );

        // If multiple different components use the same pin, it's a conflict
        if (uniqueComponents.size > 1) {
          pinConflicts.push({
            pin: mcu === 'main' ? basePin : `${mcu}:${basePin}`,
            usedBy: usage.displayNames,
            stateKeys: usage.stateKeys,
            severity: 'error',
          });
        }
      }
    }

    return {
      usedPorts,
      getUsedByType: (portType: string) => usageByType.get(portType) || new Map(),
      isAvailable: (portId: string) => !usedPorts.has(portId),
      getUsage: (portId: string) => usedPorts.get(portId),
      pinConflicts,
      hasPinConflict: (pin: string) => {
        const basePin = extractBasePin(pin);
        return pinConflicts.some(c => c.pin === basePin || c.pin.endsWith(':' + basePin));
      },
      getPinConflict: (pin: string) => {
        const basePin = extractBasePin(pin);
        return pinConflicts.find(c => c.pin === basePin || c.pin.endsWith(':' + basePin));
      },
    };
  }, [wizardState, boardData, toolboardData]);

  return registry;
}

/**
 * Get the default port assignment for a component from board data
 */
export function getDefaultAssignment(
  boardData: Record<string, any> | null | undefined,
  componentName: string
): string | undefined {
  if (!boardData?.default_assignments) return undefined;
  return boardData.default_assignments[componentName];
}

/**
 * Apply all default assignments from board data to wizard state
 * Returns a partial state object with all default port assignments
 * @param boardData - The board template data
 * @param source - 'mainboard' or 'toolboard' to determine which components to map
 */
export function getDefaultAssignments(
  boardData: Record<string, any> | null | undefined,
  source: 'mainboard' | 'toolboard' = 'mainboard'
): Record<string, string> {
  if (!boardData?.default_assignments) return {};

  const assignments: Record<string, string> = {};
  const defaults = boardData.default_assignments;

  // Map board default_assignments keys to wizard state keys
  // Mainboard typically handles motion system, bed heater
  // Toolboard typically handles extruder motor, hotend heater, part cooling fan, hotend fan
  const mainboardMappings: Record<string, string> = {
    stepper_x: 'stepper_x.motor_port',
    stepper_y: 'stepper_y.motor_port',
    stepper_z: 'stepper_z.motor_port',
    stepper_z1: 'stepper_z1.motor_port',
    stepper_z2: 'stepper_z2.motor_port',
    stepper_z3: 'stepper_z3.motor_port',
    stepper_x1: 'stepper_x1.motor_port',
    stepper_y1: 'stepper_y1.motor_port',
    extruder: 'extruder.motor_port',
    extruder1: 'extruder1.motor_port',
    heater_bed: 'heater_bed.heater_port',
    heater_extruder: 'extruder.heater_port',
    thermistor_bed: 'heater_bed.thermistor_port',
    thermistor_extruder: 'extruder.thermistor_port',
    fan_part_cooling: 'fans.part_cooling.port',
    fan_hotend: 'fans.hotend.port',
    fan_controller: 'fans.controller.port',
    endstop_x: 'stepper_x.endstop_port',
    endstop_y: 'stepper_y.endstop_port',
    endstop_z: 'stepper_z.endstop_port',
    probe: 'probe.port',
  };

  // Toolboard mappings - typically for toolhead components
  const toolboardMappings: Record<string, string> = {
    extruder: 'extruder.motor_port_toolboard',
    heater_extruder: 'extruder.heater_port_toolboard',
    thermistor_extruder: 'extruder.thermistor_port_toolboard',
    fan_part_cooling: 'fans.part_cooling.port_toolboard',
    fan_hotend: 'fans.hotend.port_toolboard',
    probe: 'probe.port_toolboard',
    accelerometer: 'input_shaper.accelerometer_port',
    filament_sensor: 'filament_sensor.port_toolboard',
  };

  const mappings = source === 'toolboard' ? toolboardMappings : mainboardMappings;

  for (const [defaultKey, stateKey] of Object.entries(mappings)) {
    if (defaults[defaultKey]) {
      assignments[stateKey] = defaults[defaultKey];
    }
  }

  return assignments;
}
