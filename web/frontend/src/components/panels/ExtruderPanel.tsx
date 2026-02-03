import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useAllTemplates, useBoard, useToolboard } from '../../hooks';
import { usePortRegistry } from '../../hooks/usePortRegistry';
import { PortSelector } from '../ui/PortSelector';
import { PinEditor } from '../ui/PinEditor';
import type { MotorPort, SimplePort, ProbePort } from '../ui/PortSelector';
import { Settings, CircuitBoard, Cpu, Info } from 'lucide-react';

const DRIVER_TYPES = [
  { id: 'tmc2209', name: 'TMC2209', description: 'UART, StealthChop, great for most builds' },
  { id: 'tmc2208', name: 'TMC2208', description: 'UART, StealthChop, quieter but less features' },
  { id: 'tmc2226', name: 'TMC2226', description: 'UART, StealthChop, improved TMC2209' },
  { id: 'tmc5160', name: 'TMC5160', description: 'SPI, high current capability' },
  { id: 'tmc2240', name: 'TMC2240', description: 'SPI/UART, newest generation' },
  { id: 'tmc2130', name: 'TMC2130', description: 'SPI, StealthChop, classic choice' },
];

export function ExtruderPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  const { data: templates } = useAllTemplates();

  // Get mainboard data
  const selectedBoard = state['mcu.main.board_type'];
  const { data: boardData } = useBoard(selectedBoard);

  // Get toolboard data
  const toolboardEnabled = state['mcu.toolboard.enabled'] ?? false;
  const selectedToolboard = state['mcu.toolboard.board_type'];
  const { data: toolboardData } = useToolboard(selectedToolboard);

  // Determine which board to use for extruder motor
  const motorLocation = state['extruder.motor_location'] ?? (toolboardEnabled ? 'toolboard' : 'mainboard');
  const activeBoardData = motorLocation === 'toolboard' && toolboardData ? toolboardData : boardData;
  const portRegistry = usePortRegistry(state, activeBoardData);

  const getValue = (key: string, defaultVal?: any) => {
    const val = state[`extruder.${key}`];
    return val !== undefined ? val : defaultVal;
  };
  const setValue = (key: string, value: any) => setField(`extruder.${key}`, value);

  // Get currently selected port data
  const selectedMotorPort = getValue('motor_port');
  const motorPortData = activeBoardData?.motor_ports?.[selectedMotorPort] as MotorPort | undefined;

  // Get all GPIO pins from board for advanced override
  const availablePins = activeBoardData?.all_pins || [];

  // Current pin values from state
  const currentPins = {
    step_pin: getValue('step_pin'),
    dir_pin: getValue('dir_pin'),
    enable_pin: getValue('enable_pin'),
    uart_pin: getValue('uart_pin'),
    cs_pin: getValue('cs_pin'),
    diag_pin: getValue('diag_pin'),
  };

  // Handle motor port selection - auto-fill related pins
  const handleMotorPortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    if (!portId) {
      // Clear port and all associated pins
      setValue('motor_port', undefined);
      setValue('step_pin', undefined);
      setValue('dir_pin', undefined);
      setValue('enable_pin', undefined);
      setValue('uart_pin', undefined);
      setValue('cs_pin', undefined);
      return;
    }

    setValue('motor_port', portId);
    setValue('motor_location', motorLocation);

    if (portData && 'step_pin' in portData) {
      const motor = portData as MotorPort;
      const prefix = motorLocation === 'toolboard' ? 'toolboard:' : '';
      setValue('step_pin', `${prefix}${motor.step_pin}`);
      setValue('dir_pin', `${prefix}${motor.dir_pin}`);
      setValue('enable_pin', `!${prefix}${motor.enable_pin}`);
      if (motor.uart_pin) {
        setValue('uart_pin', `${prefix}${motor.uart_pin}`);
      } else {
        setValue('uart_pin', undefined);
      }
      if (motor.cs_pin) {
        setValue('cs_pin', `${prefix}${motor.cs_pin}`);
      } else {
        setValue('cs_pin', undefined);
      }
    }
  };

  // Handle individual pin changes from PinEditor
  const handlePinChange = (pinType: string, value: string) => {
    if (!value) {
      setValue(pinType, undefined);
    } else {
      setValue(pinType, value);
    }
  };

  // Handle location change
  const handleLocationChange = (location: 'mainboard' | 'toolboard') => {
    setValue('motor_location', location);
    // Clear port selection when switching boards
    setValue('motor_port', undefined);
    setValue('step_pin', undefined);
    setValue('dir_pin', undefined);
    setValue('enable_pin', undefined);
    setValue('uart_pin', undefined);
    setValue('cs_pin', undefined);
  };

  return (
    <ConfigPanel title="Extruder (Cold End)" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="text-purple-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-purple-300">Extruder (Cold End)</div>
              <p className="text-xs text-purple-200/70 mt-1">
                Configure the stepper motor and gears that push filament.
                This is the "cold" part - BMG, Orbiter, Sherpa, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Extruder Preset */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Extruder Type
          </label>
          <select
            value={getValue('extruder_type') || ''}
            onChange={(e) => setValue('extruder_type', e.target.value || undefined)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Custom / Manual</option>
            {templates?.extruders.map((ext) => (
              <option key={ext.id} value={ext.id}>
                {ext.name}
              </option>
            ))}
          </select>
        </div>

        {/* Motor Location Selection (if toolboard enabled) */}
        {toolboardEnabled && toolboardData && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Motor Connected To
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLocationChange('mainboard')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  motorLocation === 'mainboard'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Cpu size={16} />
                Mainboard
              </button>
              <button
                onClick={() => handleLocationChange('toolboard')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  motorLocation === 'toolboard'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <CircuitBoard size={16} />
                Toolboard
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {motorLocation === 'toolboard'
                ? `Using ${toolboardData.name || 'toolboard'} ports`
                : `Using ${boardData?.name || 'mainboard'} ports`}
            </p>
          </div>
        )}

        {/* Motor Port Selection */}
        <PortSelector
          label="Motor Port"
          portType="motor"
          value={getValue('motor_port') || ''}
          onChange={handleMotorPortChange}
          boardData={activeBoardData}
          usedPorts={portRegistry.getUsedByType('motor')}
          placeholder={`Select extruder motor port from ${motorLocation}...`}
          allowClear={true}
        />

        {/* Editable Pin Configuration */}
        {motorPortData && (
          <PinEditor
            portData={motorPortData}
            pins={currentPins}
            onPinChange={handlePinChange}
            availablePins={availablePins}
            showAdvanced={true}
          />
        )}

        {/* Driver Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Driver Type
          </label>
          <select
            value={getValue('driver_type') || ''}
            onChange={(e) => setValue('driver_type', e.target.value || undefined)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Select driver type...</option>
            {DRIVER_TYPES.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
          {getValue('driver_type') && (
            <p className="text-xs text-slate-500 mt-1">
              {DRIVER_TYPES.find((d) => d.id === getValue('driver_type'))?.description}
            </p>
          )}
        </div>

        {/* Run Current */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Run Current (A)
          </label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="1.5"
            value={getValue('run_current') ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setValue('run_current', val ? parseFloat(val) : undefined);
            }}
            placeholder="0.5"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Typical: 0.4-0.6A</span>
            <span>Pancake: 0.3-0.4A</span>
          </div>
        </div>

        {/* Rotation Distance */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Rotation Distance
          </label>
          <input
            type="number"
            step="0.0001"
            min="1"
            value={getValue('rotation_distance') ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setValue('rotation_distance', val ? parseFloat(val) : undefined);
            }}
            placeholder="22.6789511"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Common: 22.68 (BMG), 4.637 (Orbiter), 7.82 (LGX), 5.7 (Sherpa Mini)
          </p>
        </div>

        {/* Gear Ratio */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Gear Ratio (optional)
          </label>
          <input
            type="text"
            value={getValue('gear_ratio') || ''}
            onChange={(e) => setValue('gear_ratio', e.target.value || undefined)}
            placeholder="e.g., 50:10 or 7.5:1"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Leave empty if already factored into rotation_distance
          </p>
        </div>

        {/* Microsteps */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Microsteps
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[16, 32, 64, 128].map((ms) => (
              <button
                key={ms}
                onClick={() => setValue('microsteps', ms)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  getValue('microsteps') === ms
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {ms}
              </button>
            ))}
          </div>
          {!getValue('microsteps') && (
            <p className="text-xs text-slate-500 mt-1">
              <Info size={12} className="inline mr-1" />
              Select microsteps (16 is common default)
            </p>
          )}
        </div>

        {/* Pressure Advance hint */}
        <div className="border-t border-slate-700 pt-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <div className="text-xs font-medium text-slate-400 mb-1">Pressure Advance</div>
            <p className="text-xs text-slate-500">
              Tune after setup with{' '}
              <code className="bg-slate-700 px-1 rounded">TUNING_TOWER COMMAND=SET_PRESSURE_ADVANCE</code>
            </p>
          </div>
        </div>
      </div>
    </ConfigPanel>
  );
}
