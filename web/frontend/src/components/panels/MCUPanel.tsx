import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useAllTemplates, useBoard } from '../../hooks';
import { getDefaultAssignments } from '../../hooks/usePortRegistry';
import { Cpu, Usb, AlertTriangle, Wand2, Check } from 'lucide-react';
import { useState } from 'react';

export function MCUPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  const { data: templates, isLoading: templatesLoading } = useAllTemplates();
  const selectedBoard = state['mcu.main.board_type'];
  const { data: boardData } = useBoard(selectedBoard);

  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const getValue = (key: string, defaultVal: any = '') => state[`mcu.main.${key}`] ?? state[key] ?? defaultVal;
  const setValue = (key: string, value: any) => setField(`mcu.main.${key}`, value);

  // Apply default port assignments from board template
  const handleApplyDefaults = () => {
    if (!boardData) return;

    const defaults = getDefaultAssignments(boardData);

    // Apply each default assignment
    for (const [stateKey, portId] of Object.entries(defaults)) {
      setField(stateKey, portId);

      // Also auto-fill the actual pins from the port data
      const [section] = stateKey.split('.');

      // For motor ports, fill in all related pins
      if (stateKey.endsWith('.motor_port') && boardData.motor_ports?.[portId]) {
        const motor = boardData.motor_ports[portId];
        setField(`${section}.step_pin`, motor.step_pin);
        setField(`${section}.dir_pin`, motor.dir_pin);
        setField(`${section}.enable_pin`, motor.enable_pin);
        if (motor.uart_pin) setField(`${section}.uart_pin`, motor.uart_pin);
        if (motor.diag_pin) setField(`${section}.diag_pin`, motor.diag_pin);
      }

      // For heater ports
      if (stateKey.endsWith('.heater_port') && boardData.heater_ports?.[portId]) {
        const heater = boardData.heater_ports[portId];
        setField(`${section}.heater_pin`, heater.pin);
      }

      // For thermistor ports
      if (stateKey.endsWith('.thermistor_port') && boardData.thermistor_ports?.[portId]) {
        const therm = boardData.thermistor_ports[portId];
        setField(`${section}.sensor_pin`, therm.pin);
      }

      // For fan ports
      if (stateKey.includes('fans.') && stateKey.endsWith('.port') && boardData.fan_ports?.[portId]) {
        const fan = boardData.fan_ports[portId];
        const fanSection = stateKey.replace('.port', '');
        setField(`${fanSection}.pin`, fan.pin);
      }

      // For endstop ports
      if (stateKey.endsWith('.endstop_port') && boardData.endstop_ports?.[portId]) {
        const endstop = boardData.endstop_ports[portId];
        setField(`${section}.endstop_pin`, `^${endstop.pin}`);
      }
    }

    setDefaultsApplied(true);
    setTimeout(() => setDefaultsApplied(false), 3000);
  };

  const hasDefaults = boardData?.default_assignments && Object.keys(boardData.default_assignments).length > 0;

  return (
    <ConfigPanel title="MCU Configuration" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info Banner */}
        <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Cpu className="text-cyan-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-cyan-300">Main MCU</div>
              <p className="text-xs text-cyan-200/70 mt-1">
                Select your mainboard and configure the serial connection.
                Pin assignments will be auto-filled based on your board.
              </p>
            </div>
          </div>
        </div>

        {/* Board Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Mainboard Type
          </label>
          {templatesLoading ? (
            <div className="bg-slate-700 rounded-lg px-3 py-2 text-slate-400">
              Loading boards...
            </div>
          ) : (
            <select
              value={selectedBoard || ''}
              onChange={(e) => {
                setValue('board_type', e.target.value);
                setDefaultsApplied(false);
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select a board...</option>
              {templates?.boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} ({board.manufacturer})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Board Info */}
        {boardData && (
          <div className="bg-slate-800 rounded-lg p-3 text-sm">
            <div className="text-slate-400 mb-2">Board Features</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Processor:</span>{' '}
                <span className="text-slate-300">{boardData.mcu || 'STM32'}</span>
              </div>
              <div>
                <span className="text-slate-500">Motor Ports:</span>{' '}
                <span className="text-slate-300">
                  {boardData.motor_ports ? Object.keys(boardData.motor_ports).length : '?'}x
                </span>
              </div>
              <div>
                <span className="text-slate-500">Fan Ports:</span>{' '}
                <span className="text-slate-300">
                  {boardData.fan_ports ? Object.keys(boardData.fan_ports).length : '?'}x
                </span>
              </div>
              <div>
                <span className="text-slate-500">Heaters:</span>{' '}
                <span className="text-slate-300">
                  {boardData.heater_ports ? Object.keys(boardData.heater_ports).length : '?'}x
                </span>
              </div>
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
                  Apply recommended port assignments for this board. This will configure
                  stepper motors, heaters, fans, and endstops with typical wiring.
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

        {/* Serial Port */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Serial Port
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Usb className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                value={getValue('serial')}
                onChange={(e) => setValue('serial', e.target.value)}
                placeholder="/dev/serial/by-id/usb-xxx"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm font-mono"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Run <code className="bg-slate-800 px-1 rounded">ls /dev/serial/by-id/</code> on your printer to find this path.
          </p>
        </div>

        {/* CAN Bus Option */}
        <div className="border-t border-slate-700 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={getValue('use_can', false)}
              onChange={(e) => setValue('use_can', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <div>
              <span className="text-sm text-slate-300">Use CAN Bus</span>
              <p className="text-xs text-slate-500">Enable if using CAN bus instead of USB serial</p>
            </div>
          </label>
        </div>

        {getValue('use_can') && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                CAN UUID
              </label>
              <input
                type="text"
                value={getValue('canbus_uuid')}
                onChange={(e) => setValue('canbus_uuid', e.target.value)}
                placeholder="e.g., 1a2b3c4d5e6f"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                CAN Interface
              </label>
              <input
                type="text"
                value={getValue('canbus_interface', 'can0')}
                onChange={(e) => setValue('canbus_interface', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Warning for missing serial */}
        {!getValue('serial') && !getValue('use_can') && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-amber-200">
              Serial path is required. Use the CLI wizard on your printer to detect it automatically,
              or run <code className="bg-amber-900/50 px-1 rounded">ls /dev/serial/by-id/</code>.
            </p>
          </div>
        )}
      </div>
    </ConfigPanel>
  );
}
