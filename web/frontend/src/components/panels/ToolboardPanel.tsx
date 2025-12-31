import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useAllTemplates, useToolboard } from '../../hooks';
import { getDefaultAssignments } from '../../hooks/usePortRegistry';
import { CircuitBoard, Usb, AlertTriangle, Wand2, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';

export function ToolboardPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  const { data: templates, isLoading: templatesLoading } = useAllTemplates();

  // Toolboard state
  const toolboardEnabled = state['mcu.toolboard.enabled'] ?? false;
  const selectedToolboard = state['mcu.toolboard.board_type'];
  const { data: toolboardData } = useToolboard(selectedToolboard);

  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const getValue = (key: string, defaultVal: any = '') => state[`mcu.toolboard.${key}`] ?? defaultVal;
  const setValue = (key: string, value: any) => setField(`mcu.toolboard.${key}`, value);

  // Apply default port assignments from toolboard template
  const handleApplyDefaults = () => {
    if (!toolboardData) return;

    const defaults = getDefaultAssignments(toolboardData, 'toolboard');

    // Apply each default assignment
    for (const [stateKey, portId] of Object.entries(defaults)) {
      setField(stateKey, portId);

      // Also auto-fill the actual pins from the port data
      const [section] = stateKey.split('.');

      // For motor ports, fill in all related pins
      if (stateKey.endsWith('.motor_port') && toolboardData.motor_ports?.[portId]) {
        const motor = toolboardData.motor_ports[portId];
        setField(`${section}.step_pin`, `toolboard:${motor.step_pin}`);
        setField(`${section}.dir_pin`, `toolboard:${motor.dir_pin}`);
        setField(`${section}.enable_pin`, `toolboard:${motor.enable_pin}`);
        if (motor.uart_pin) setField(`${section}.uart_pin`, `toolboard:${motor.uart_pin}`);
      }

      // For heater ports
      if (stateKey.endsWith('.heater_port') && toolboardData.heater_ports?.[portId]) {
        const heater = toolboardData.heater_ports[portId];
        setField(`${section}.heater_pin`, `toolboard:${heater.pin}`);
      }

      // For thermistor ports
      if (stateKey.endsWith('.thermistor_port') && toolboardData.thermistor_ports?.[portId]) {
        const therm = toolboardData.thermistor_ports[portId];
        setField(`${section}.sensor_pin`, `toolboard:${therm.pin}`);
      }

      // For fan ports
      if (stateKey.includes('fans.') && stateKey.endsWith('.port') && toolboardData.fan_ports?.[portId]) {
        const fan = toolboardData.fan_ports[portId];
        const fanSection = stateKey.replace('.port', '');
        setField(`${fanSection}.pin`, `toolboard:${fan.pin}`);
      }
    }

    setDefaultsApplied(true);
    setTimeout(() => setDefaultsApplied(false), 3000);
  };

  const handleDisableToolboard = () => {
    setValue('enabled', false);
    setValue('board_type', '');
    setValue('canbus_uuid', '');
    setDefaultsApplied(false);
  };

  const hasDefaults = toolboardData?.default_assignments && Object.keys(toolboardData.default_assignments).length > 0;

  return (
    <ConfigPanel title="Toolboard Configuration" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CircuitBoard className="text-emerald-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-emerald-300">Toolboard (CAN/USB)</div>
              <p className="text-xs text-emerald-200/70 mt-1">
                A toolboard is a secondary MCU mounted on the toolhead, reducing wiring and
                enabling cleaner cable management. Common options include EBB36, EBB42, and SB2209.
              </p>
            </div>
          </div>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
          <div>
            <div className="text-sm font-medium text-white">Use Toolboard</div>
            <p className="text-xs text-slate-400 mt-1">
              Enable if you have a toolhead-mounted MCU
            </p>
          </div>
          <button
            onClick={() => setValue('enabled', !toolboardEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              toolboardEnabled ? 'bg-emerald-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                toolboardEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {toolboardEnabled && (
          <>
            {/* Toolboard Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Toolboard Type
              </label>
              {templatesLoading ? (
                <div className="bg-slate-700 rounded-lg px-3 py-2 text-slate-400">
                  Loading toolboards...
                </div>
              ) : (
                <select
                  value={selectedToolboard || ''}
                  onChange={(e) => {
                    setValue('board_type', e.target.value);
                    setDefaultsApplied(false);
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select a toolboard...</option>
                  {templates?.toolboards?.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name} ({board.manufacturer})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Toolboard Info */}
            {toolboardData && (
              <div className="bg-slate-800 rounded-lg p-3 text-sm">
                <div className="text-slate-400 mb-2">Toolboard Features</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Processor:</span>{' '}
                    <span className="text-slate-300">{toolboardData.mcu || 'STM32/RP2040'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Motor Ports:</span>{' '}
                    <span className="text-slate-300">
                      {toolboardData.motor_ports ? Object.keys(toolboardData.motor_ports).length : '?'}x
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fan Ports:</span>{' '}
                    <span className="text-slate-300">
                      {toolboardData.fan_ports ? Object.keys(toolboardData.fan_ports).length : '?'}x
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Thermistors:</span>{' '}
                    <span className="text-slate-300">
                      {toolboardData.thermistor_ports ? Object.keys(toolboardData.thermistor_ports).length : '?'}x
                    </span>
                  </div>
                  {toolboardData.has_accelerometer && (
                    <div className="col-span-2 text-emerald-400">✓ Built-in Accelerometer (Input Shaper)</div>
                  )}
                </div>
              </div>
            )}

            {/* Apply Defaults Button */}
            {hasDefaults && (
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Wand2 className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-emerald-300">Quick Setup</div>
                    <p className="text-xs text-emerald-200/70 mt-1 mb-3">
                      Apply recommended port assignments for this toolboard. This will configure
                      extruder motor, hotend heater, fans, and sensors.
                    </p>
                    <button
                      onClick={handleApplyDefaults}
                      disabled={defaultsApplied}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        defaultsApplied
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {defaultsApplied ? (
                        <>
                          <Check size={16} />
                          Defaults Applied!
                        </>
                      ) : (
                        <>
                          <Wand2 size={16} />
                          Apply Recommended Assignments
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Settings */}
            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Connection</h3>

              {/* Connection Type */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Connection Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setValue('connection_type', 'can')}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      getValue('connection_type', 'can') === 'can'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    CAN Bus
                  </button>
                  <button
                    onClick={() => setValue('connection_type', 'usb')}
                    className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      getValue('connection_type') === 'usb'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    USB
                  </button>
                </div>
              </div>

              {getValue('connection_type', 'can') === 'can' ? (
                <>
                  {/* CAN UUID */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      CAN UUID
                    </label>
                    <input
                      type="text"
                      value={getValue('canbus_uuid')}
                      onChange={(e) => setValue('canbus_uuid', e.target.value)}
                      placeholder="e.g., a1b2c3d4e5f6"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Run <code className="bg-slate-800 px-1 rounded">~/klippy-env/bin/python ~/klipper/scripts/canbus_query.py can0</code> to find this.
                    </p>
                  </div>

                  {/* CAN Interface */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      CAN Interface
                    </label>
                    <input
                      type="text"
                      value={getValue('canbus_interface', 'can0')}
                      onChange={(e) => setValue('canbus_interface', e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </>
              ) : (
                /* USB Serial */
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    USB Serial Port
                  </label>
                  <div className="relative">
                    <Usb className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={getValue('serial')}
                      onChange={(e) => setValue('serial', e.target.value)}
                      placeholder="/dev/serial/by-id/usb-xxx"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Warning for missing connection info */}
            {!getValue('canbus_uuid') && getValue('connection_type', 'can') === 'can' && (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-amber-200">
                  CAN UUID is required. Query your CAN bus to find the toolboard's UUID.
                </p>
              </div>
            )}

            {!getValue('serial') && getValue('connection_type') === 'usb' && (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-amber-200">
                  Serial path is required for USB connection.
                </p>
              </div>
            )}

            {/* Disable Toolboard Button */}
            <div className="border-t border-slate-700 pt-4">
              <button
                onClick={handleDisableToolboard}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                Disable Toolboard
              </button>
            </div>
          </>
        )}

        {/* Toolboard Benefits (when disabled) */}
        {!toolboardEnabled && (
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Benefits of a Toolboard</h3>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Reduces wiring from toolhead to mainboard (single CAN cable)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Cleaner cable management and less weight on gantry</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Often includes built-in accelerometer for Input Shaper</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Shorter signal paths for thermistors and fans</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </ConfigPanel>
  );
}
