import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useBoard } from '../../hooks/useTemplates';
import { usePortRegistry } from '../../hooks/usePortRegistry';
import { PortSelector } from '../ui/PortSelector';
import type { SimplePort, MotorPort, ProbePort } from '../ui/PortSelector';
import { Thermometer } from 'lucide-react';

const BED_SENSORS = [
  { id: 'Generic 3950', name: 'Generic 3950 (most common)' },
  { id: 'EPCOS 100K B57560G104F', name: 'EPCOS 100K' },
  { id: 'NTC 100K MGB18-104F39050L32', name: 'NTC 100K Keenovo' },
  { id: 'Honeywell 100K 135-104LAG-J01', name: 'Honeywell 100K' },
  { id: 'ATC Semitec 104GT-2', name: 'ATC Semitec 104GT-2' },
];

export function HeaterBedPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  // Get board data for port selection
  const selectedBoard = state['mcu.main.board_type'];
  const { data: boardData } = useBoard(selectedBoard);
  const portRegistry = usePortRegistry(state, boardData);

  const getValue = (key: string, defaultVal: any = '') => state[`heater_bed.${key}`] ?? defaultVal;
  const setValue = (key: string, value: any) => setField(`heater_bed.${key}`, value);

  // Handle heater port selection
  const handleHeaterPortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue('heater_port', portId);
    if (portData && 'pin' in portData) {
      setValue('heater_pin', (portData as SimplePort).pin);
    }
  };

  // Handle thermistor port selection
  const handleThermistorPortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue('thermistor_port', portId);
    if (portData && 'pin' in portData) {
      setValue('sensor_pin', (portData as SimplePort).pin);
    }
  };

  return (
    <ConfigPanel title="Heated Bed" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Thermometer className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-red-300">Heated Bed</div>
              <p className="text-xs text-red-200/70 mt-1">
                Configure bed heater and temperature sensor settings.
              </p>
            </div>
          </div>
        </div>

        {/* Heater Port Selection */}
        <PortSelector
          label="Heater Port"
          portType="heater"
          value={getValue('heater_port')}
          onChange={handleHeaterPortChange}
          boardData={boardData}
          usedPorts={portRegistry.getUsedByType('heater')}
          placeholder="Select bed heater port..."
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
          boardData={boardData}
          usedPorts={portRegistry.getUsedByType('thermistor')}
          placeholder="Select bed temperature sensor port..."
        />

        {/* Show resolved sensor pin */}
        {getValue('sensor_pin') && (
          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
            <div className="text-xs text-slate-400">
              Sensor pin: <span className="font-mono text-emerald-400">{getValue('sensor_pin')}</span>
            </div>
          </div>
        )}

        {/* Sensor Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sensor Type
          </label>
          <select
            value={getValue('sensor_type', 'Generic 3950')}
            onChange={(e) => setValue('sensor_type', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            {BED_SENSORS.map((sensor) => (
              <option key={sensor.id} value={sensor.id}>
                {sensor.name}
              </option>
            ))}
          </select>
        </div>

        {/* Max Temperature */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Max Temperature (°C)
          </label>
          <input
            type="number"
            step="5"
            min="60"
            max="150"
            value={getValue('max_temp', 120)}
            onChange={(e) => setValue('max_temp', parseInt(e.target.value))}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>PEI/Glass: 100-110°C</span>
            <span>High-temp: 120-130°C</span>
          </div>
        </div>

        {/* PID Settings */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">PID Tuning</h3>
          <p className="text-xs text-slate-500 mb-4">
            Leave blank to use Klipper defaults. Run{' '}
            <code className="bg-slate-800 px-1 rounded">PID_CALIBRATE HEATER=heater_bed TARGET=60</code>{' '}
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
