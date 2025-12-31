import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useBoard, useToolboard } from '../../hooks/useTemplates';
import { usePortRegistry } from '../../hooks/usePortRegistry';
import { PortSelector } from '../ui/PortSelector';
import type { SimplePort, MotorPort, ProbePort } from '../ui/PortSelector';
import { Fan } from 'lucide-react';

export function FanPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  // Get mainboard data
  const selectedBoard = state['mcu.main.board_type'];
  const { data: boardData } = useBoard(selectedBoard);
  const mainboardRegistry = usePortRegistry(state, boardData);

  // Get toolboard data
  const toolboardEnabled = state['mcu.toolboard.enabled'] ?? false;
  const selectedToolboard = state['mcu.toolboard.board_type'];
  const { data: toolboardData } = useToolboard(selectedToolboard);
  const toolboardRegistry = usePortRegistry(state, toolboardData);

  const getValue = (section: string, key: string, defaultVal: any = '') =>
    state[`fans.${section}.${key}`] ?? defaultVal;
  const setValue = (section: string, key: string, value: any) =>
    setField(`fans.${section}.${key}`, value);

  // Handle fan port selection for mainboard
  const handleMainboardFanPortChange = (section: string) => (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue(section, 'port', portId);
    if (portData && 'pin' in portData) {
      setValue(section, 'pin', (portData as SimplePort).pin);
    }
  };

  // Handle fan port selection for toolboard
  const handleToolboardFanPortChange = (section: string) => (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue(section, 'port_toolboard', portId);
    if (portData && 'pin' in portData) {
      setValue(section, 'pin', `toolboard:${(portData as SimplePort).pin}`);
    }
  };

  return (
    <ConfigPanel title="Fans" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-sky-900/30 border border-sky-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Fan className="text-sky-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-sky-300">Cooling Fans</div>
              <p className="text-xs text-sky-200/70 mt-1">
                Configure part cooling, hotend cooling, and controller fans.
              </p>
            </div>
          </div>
        </div>

        {/* Part Cooling Fan */}
        <div className="border-b border-slate-700 pb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            Part Cooling Fan
          </h3>

          <div className="space-y-4">
            {/* Location toggle */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setValue('part_cooling', 'location', 'mainboard')}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    getValue('part_cooling', 'location', 'mainboard') === 'mainboard'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Mainboard
                </button>
                <button
                  onClick={() => setValue('part_cooling', 'location', 'toolboard')}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    getValue('part_cooling', 'location') === 'toolboard'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Toolboard
                </button>
              </div>
            </div>

            {/* Port selector for mainboard or toolboard fans */}
            {getValue('part_cooling', 'location', 'mainboard') === 'mainboard' ? (
              <PortSelector
                label="Fan Port"
                portType="fan"
                value={getValue('part_cooling', 'port')}
                onChange={handleMainboardFanPortChange('part_cooling')}
                boardData={boardData}
                usedPorts={mainboardRegistry.getUsedByType('fan')}
                placeholder="Select part cooling fan port..."
              />
            ) : toolboardEnabled && toolboardData ? (
              <PortSelector
                label="Fan Port (Toolboard)"
                portType="fan"
                value={getValue('part_cooling', 'port_toolboard')}
                onChange={handleToolboardFanPortChange('part_cooling')}
                boardData={toolboardData}
                usedPorts={toolboardRegistry.getUsedByType('fan')}
                placeholder="Select part cooling fan port from toolboard..."
              />
            ) : (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
                <p className="text-xs text-amber-200">
                  Please configure a toolboard first to select toolboard ports.
                </p>
              </div>
            )}

            {/* Show resolved pin */}
            {getValue('part_cooling', 'pin') && getValue('part_cooling', 'location', 'mainboard') === 'mainboard' && (
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                <div className="text-xs text-slate-400">
                  Pin: <span className="font-mono text-emerald-400">{getValue('part_cooling', 'pin')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hotend Fan */}
        <div className="border-b border-slate-700 pb-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Hotend Cooling Fan
          </h3>

          <div className="space-y-4">
            {/* Location toggle */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setValue('hotend', 'location', 'mainboard')}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    getValue('hotend', 'location', 'mainboard') === 'mainboard'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Mainboard
                </button>
                <button
                  onClick={() => setValue('hotend', 'location', 'toolboard')}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    getValue('hotend', 'location') === 'toolboard'
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Toolboard
                </button>
              </div>
            </div>

            {/* Port selector for mainboard or toolboard fans */}
            {getValue('hotend', 'location', 'mainboard') === 'mainboard' ? (
              <PortSelector
                label="Fan Port"
                portType="fan"
                value={getValue('hotend', 'port')}
                onChange={handleMainboardFanPortChange('hotend')}
                boardData={boardData}
                usedPorts={mainboardRegistry.getUsedByType('fan')}
                placeholder="Select hotend fan port..."
              />
            ) : toolboardEnabled && toolboardData ? (
              <PortSelector
                label="Fan Port (Toolboard)"
                portType="fan"
                value={getValue('hotend', 'port_toolboard')}
                onChange={handleToolboardFanPortChange('hotend')}
                boardData={toolboardData}
                usedPorts={toolboardRegistry.getUsedByType('fan')}
                placeholder="Select hotend fan port from toolboard..."
              />
            ) : (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
                <p className="text-xs text-amber-200">
                  Please configure a toolboard first to select toolboard ports.
                </p>
              </div>
            )}

            {/* Show resolved pin */}
            {getValue('hotend', 'pin') && getValue('hotend', 'location', 'mainboard') === 'mainboard' && (
              <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                <div className="text-xs text-slate-400">
                  Pin: <span className="font-mono text-emerald-400">{getValue('hotend', 'pin')}</span>
                </div>
              </div>
            )}

            {/* Heater reference */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Heater Reference
              </label>
              <select
                value={getValue('hotend', 'heater', 'extruder')}
                onChange={(e) => setValue('hotend', 'heater', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500"
              >
                <option value="extruder">extruder</option>
                <option value="heater_bed">heater_bed</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Fan turns on when this heater is active
              </p>
            </div>
          </div>
        </div>

        {/* Controller Fan */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Controller Fan (Optional)
          </h3>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={getValue('controller', 'enabled', false)}
                onChange={(e) => setValue('controller', 'enabled', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-300">Enable controller fan</span>
            </label>

            {getValue('controller', 'enabled') && (
              <>
                <PortSelector
                  label="Fan Port"
                  portType="fan"
                  value={getValue('controller', 'port')}
                  onChange={handleMainboardFanPortChange('controller')}
                  boardData={boardData}
                  usedPorts={mainboardRegistry.getUsedByType('fan')}
                  placeholder="Select controller fan port..."
                />

                {/* Show resolved pin */}
                {getValue('controller', 'pin') && (
                  <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                    <div className="text-xs text-slate-400">
                      Pin: <span className="font-mono text-emerald-400">{getValue('controller', 'pin')}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Idle Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={getValue('controller', 'idle_timeout', 60)}
                    onChange={(e) => setValue('controller', 'idle_timeout', parseInt(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Fan runs for this long after steppers stop
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ConfigPanel>
  );
}
