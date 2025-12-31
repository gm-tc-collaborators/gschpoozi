import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useBoard, useToolboard } from '../../hooks/useTemplates';
import { usePortRegistry } from '../../hooks/usePortRegistry';
import { PortSelector } from '../ui/PortSelector';
import type { SimplePort, MotorPort, ProbePort } from '../ui/PortSelector';
import { Flame, CircuitBoard, Cpu } from 'lucide-react';

const SENSOR_TYPES = [
  { id: 'EPCOS 100K B57560G104F', name: 'EPCOS 100K (common)' },
  { id: 'ATC Semitec 104GT-2', name: 'ATC Semitec 104GT-2' },
  { id: 'ATC Semitec 104NT-4-R025H42G', name: 'ATC Semitec 104NT-4 (Revo/Rapido)' },
  { id: 'Generic 3950', name: 'Generic 3950' },
  { id: 'Honeywell 100K 135-104LAG-J01', name: 'Honeywell 100K' },
  { id: 'NTC 100K MGB18-104F39050L32', name: 'NTC 100K Keenovo' },
  { id: 'PT1000', name: 'PT1000 (high temp)' },
  { id: 'MAX31865', name: 'MAX31865 (RTD)' },
];

const NOZZLE_SIZES = [0.2, 0.25, 0.4, 0.5, 0.6, 0.8, 1.0];

export function HotendPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  // Get mainboard data
  const selectedBoard = state['mcu.main.board_type'];
  const { data: boardData } = useBoard(selectedBoard);

  // Get toolboard data
  const toolboardEnabled = state['mcu.toolboard.enabled'] ?? false;
  const selectedToolboard = state['mcu.toolboard.board_type'];
  const { data: toolboardData } = useToolboard(selectedToolboard);

  // Determine which board to use for hotend (heater + thermistor typically on same board)
  const hotendLocation = state['extruder.hotend_location'] ?? (toolboardEnabled ? 'toolboard' : 'mainboard');
  const activeBoardData = hotendLocation === 'toolboard' && toolboardData ? toolboardData : boardData;
  const portRegistry = usePortRegistry(state, activeBoardData);

  // Hotend settings are stored under extruder.* for Klipper compatibility
  const getValue = (key: string, defaultVal: any = '') => state[`extruder.${key}`] ?? defaultVal;
  const setValue = (key: string, value: any) => setField(`extruder.${key}`, value);

  // Handle location change
  const handleLocationChange = (location: 'mainboard' | 'toolboard') => {
    setValue('hotend_location', location);
    // Clear port selections when switching boards
    setValue('heater_port', '');
    setValue('heater_pin', '');
    setValue('thermistor_port', '');
    setValue('sensor_pin', '');
  };

  // Handle heater port selection
  const handleHeaterPortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue('heater_port', portId);
    setValue('hotend_location', hotendLocation);
    if (portData && 'pin' in portData) {
      const prefix = hotendLocation === 'toolboard' ? 'toolboard:' : '';
      setValue('heater_pin', `${prefix}${(portData as SimplePort).pin}`);
    }
  };

  // Handle thermistor port selection
  const handleThermistorPortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue('thermistor_port', portId);
    if (portData && 'pin' in portData) {
      const prefix = hotendLocation === 'toolboard' ? 'toolboard:' : '';
      setValue('sensor_pin', `${prefix}${(portData as SimplePort).pin}`);
    }
  };

  return (
    <ConfigPanel title="Hotend" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Flame className="text-orange-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-orange-300">Hotend (Hot End)</div>
              <p className="text-xs text-orange-200/70 mt-1">
                Configure the heating element and temperature sensor for your hotend.
                This is the part that melts filament (heatsink, heatbreak, heater block, nozzle).
              </p>
            </div>
          </div>
        </div>

        {/* Location Selection (if toolboard enabled) */}
        {toolboardEnabled && toolboardData && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Hotend Connected To
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLocationChange('mainboard')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hotendLocation === 'mainboard'
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
                  hotendLocation === 'toolboard'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <CircuitBoard size={16} />
                Toolboard
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {hotendLocation === 'toolboard'
                ? `Using ${toolboardData.name || 'toolboard'} ports`
                : `Using ${boardData?.name || 'mainboard'} ports`}
            </p>
          </div>
        )}

        {/* Heater Port Selection */}
        <PortSelector
          label="Heater Port"
          portType="heater"
          value={getValue('heater_port')}
          onChange={handleHeaterPortChange}
          boardData={activeBoardData}
          usedPorts={portRegistry.getUsedByType('heater')}
          placeholder={`Select hotend heater port from ${hotendLocation}...`}
        />

        {/* Show resolved heater pin */}
        {getValue('heater_pin') && (
          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
            <div className="text-xs text-slate-400">
              Heater pin: <span className="font-mono text-emerald-400">{getValue('heater_pin')}</span>
            </div>
          </div>
        )}

        {/* Thermistor Port Selection */}
        <PortSelector
          label="Thermistor Port"
          portType="thermistor"
          value={getValue('thermistor_port')}
          onChange={handleThermistorPortChange}
          boardData={activeBoardData}
          usedPorts={portRegistry.getUsedByType('thermistor')}
          placeholder={`Select temperature sensor port from ${hotendLocation}...`}
        />

        {/* Show resolved sensor pin */}
        {getValue('sensor_pin') && (
          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
            <div className="text-xs text-slate-400">
              Sensor pin: <span className="font-mono text-emerald-400">{getValue('sensor_pin')}</span>
            </div>
          </div>
        )}

        {/* Temperature Sensor Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Temperature Sensor Type
          </label>
          <select
            value={getValue('sensor_type', 'EPCOS 100K B57560G104F')}
            onChange={(e) => setValue('sensor_type', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            {SENSOR_TYPES.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensor.name}
              </option>
            ))}
          </select>
        </div>

        {/* Nozzle Diameter */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Nozzle Diameter (mm)
          </label>
          <div className="grid grid-cols-7 gap-1">
            {NOZZLE_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setValue('nozzle_diameter', size)}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  getValue('nozzle_diameter', 0.4) === size
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Max Temperature */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Max Temperature (°C)
          </label>
          <input
            type="number"
            step="5"
            min="180"
            max="350"
            value={getValue('max_temp', 280)}
            onChange={(e) => setValue('max_temp', parseInt(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Standard: 250-280°C</span>
            <span>High-temp: 300-350°C</span>
          </div>
        </div>

        {/* PID Settings */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">PID Tuning</h3>
          <p className="text-xs text-slate-500 mb-4">
            Leave blank to use Klipper defaults. Run{' '}
            <code className="bg-slate-800 px-1 rounded">PID_CALIBRATE HEATER=extruder TARGET=200</code>{' '}
            after setup.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Kp</label>
              <input
                type="number"
                step="0.001"
                value={getValue('pid_kp', '')}
                onChange={(e) =>
                  setValue('pid_kp', e.target.value ? parseFloat(e.target.value) : '')
                }
                placeholder="auto"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm placeholder-slate-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ki</label>
              <input
                type="number"
                step="0.001"
                value={getValue('pid_ki', '')}
                onChange={(e) =>
                  setValue('pid_ki', e.target.value ? parseFloat(e.target.value) : '')
                }
                placeholder="auto"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm placeholder-slate-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Kd</label>
              <input
                type="number"
                step="0.001"
                value={getValue('pid_kd', '')}
                onChange={(e) =>
                  setValue('pid_kd', e.target.value ? parseFloat(e.target.value) : '')
                }
                placeholder="auto"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm placeholder-slate-500 focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>
    </ConfigPanel>
  );
}
