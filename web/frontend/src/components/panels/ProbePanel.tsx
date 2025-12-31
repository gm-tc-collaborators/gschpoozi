import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useAllTemplates, useBoard } from '../../hooks';
import { usePortRegistry } from '../../hooks/usePortRegistry';
import { PortSelector, ResolvedPins } from '../ui/PortSelector';
import type { SimplePort, MotorPort, ProbePort } from '../ui/PortSelector';
import { Crosshair, Zap } from 'lucide-react';

// Type guard for ProbePort
function isProbePort(port: MotorPort | SimplePort | ProbePort): port is ProbePort {
  return 'signal_pin' in port;
}

// Type guard for SimplePort
function isSimplePort(port: MotorPort | SimplePort | ProbePort): port is SimplePort {
  return 'pin' in port && !('step_pin' in port);
}

export function ProbePanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  const { data: templates } = useAllTemplates();

  // Get board data for port selection
  const selectedBoard = state['mcu.main.board_type'];
  const { data: boardData } = useBoard(selectedBoard);
  const portRegistry = usePortRegistry(state, boardData);

  const getValue = (key: string, defaultVal: any = '') => state[`probe.${key}`] ?? defaultVal;
  const setValue = (key: string, value: any) => setField(`probe.${key}`, value);

  // Get currently selected probe port data
  const selectedProbePort = getValue('port');
  const probePortData = boardData?.probe_ports?.[selectedProbePort] as ProbePort | undefined;

  // Handle probe port selection
  const handleProbePortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue('port', portId);
    if (portData) {
      if (isProbePort(portData)) {
        // Probe port with signal and servo pins
        setValue('pin', `^${portData.signal_pin}`);
        if (portData.servo_pin) {
          setValue('servo_pin', portData.servo_pin);
        }
      } else if (isSimplePort(portData)) {
        // Simple endstop port
        setValue('pin', `^${portData.pin}`);
      }
    }
  };

  // Handle endstop port selection (for manual Z endstop)
  const handleEndstopPortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue('endstop_port', portId);
    if (portData && isSimplePort(portData)) {
      setValue('pin', `^${portData.pin}`);
    }
  };

  const probeType = getValue('probe_type');
  const isManualEndstop = probeType === 'manual';

  return (
    <ConfigPanel title="Probe / Z-Endstop" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-violet-900/30 border border-violet-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Crosshair className="text-violet-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-violet-300">Bed Probe</div>
              <p className="text-xs text-violet-200/70 mt-1">
                Configure your bed leveling probe for mesh bed leveling and Z homing.
              </p>
            </div>
          </div>
        </div>

        {/* Probe Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Probe Type
          </label>
          <select
            value={getValue('probe_type')}
            onChange={(e) => setValue('probe_type', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Select a probe...</option>
            {templates?.probes.map((probe) => (
              <option key={probe.id} value={probe.id}>
                {probe.name}
              </option>
            ))}
            <option value="manual">Manual / Endstop Switch</option>
          </select>
        </div>

        {/* Probe Location */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Probe Location
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setValue('location', 'mainboard')}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                getValue('location', 'mainboard') === 'mainboard'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Mainboard
            </button>
            <button
              onClick={() => setValue('location', 'toolboard')}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                getValue('location') === 'toolboard'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Toolboard
            </button>
          </div>
        </div>

        {/* Port Selection based on location and type */}
        {getValue('location', 'mainboard') === 'mainboard' ? (
          <>
            {isManualEndstop ? (
              // Manual endstop - use endstop ports
              <PortSelector
                label="Endstop Port"
                portType="endstop"
                value={getValue('endstop_port')}
                onChange={handleEndstopPortChange}
                boardData={boardData}
                usedPorts={portRegistry.getUsedByType('endstop')}
                placeholder="Select Z endstop port..."
              />
            ) : (
              // Probe - use probe ports first, fall back to endstop
              <>
                <PortSelector
                  label="Probe Port"
                  portType="probe"
                  value={getValue('port')}
                  onChange={handleProbePortChange}
                  boardData={boardData}
                  usedPorts={portRegistry.getUsedByType('probe')}
                  placeholder="Select probe port..."
                />

                {/* Show resolved pins when probe port is selected */}
                {probePortData && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
                      <Zap size={12} />
                      Auto-configured pins
                    </div>
                    <ResolvedPins portData={probePortData} portType="probe" />
                  </div>
                )}

                {/* Alternative: use endstop port */}
                {!getValue('port') && (
                  <div className="text-xs text-slate-500">
                    Or use an endstop port:
                    <PortSelector
                      portType="endstop"
                      value={getValue('endstop_port')}
                      onChange={handleEndstopPortChange}
                      boardData={boardData}
                      usedPorts={portRegistry.getUsedByType('endstop')}
                      placeholder="Select endstop port for probe..."
                      className="mt-2"
                    />
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          // Toolboard - manual pin entry
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Toolboard Probe Pin
            </label>
            <input
              type="text"
              value={getValue('pin')}
              onChange={(e) => setValue('pin', e.target.value)}
              placeholder="e.g., ^PB7, ^PROBE"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">
              ^ = pullup, ! = invert
            </p>
          </div>
        )}

        {/* Show configured pin */}
        {getValue('pin') && getValue('location', 'mainboard') === 'mainboard' && (
          <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
            <div className="text-xs text-slate-400">
              Probe pin: <span className="font-mono text-emerald-400">{getValue('pin')}</span>
            </div>
          </div>
        )}

        {/* Offsets */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Probe Offsets</h3>
          <p className="text-xs text-slate-500 mb-4">
            Distance from nozzle to probe trigger point
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">X Offset</label>
              <input
                type="number"
                step="0.1"
                value={getValue('x_offset', 0)}
                onChange={(e) => setValue('x_offset', parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Y Offset</label>
              <input
                type="number"
                step="0.1"
                value={getValue('y_offset', 0)}
                onChange={(e) => setValue('y_offset', parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Z Offset</label>
              <input
                type="number"
                step="0.01"
                value={getValue('z_offset', 0)}
                onChange={(e) => setValue('z_offset', parseFloat(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:border-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Calibrate with PROBE_CALIBRATE
              </p>
            </div>
          </div>
        </div>

        {/* Speed Settings */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Probing Speed</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Speed (mm/s)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="50"
                value={getValue('speed', 10)}
                onChange={(e) => setValue('speed', parseInt(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Lift Speed (mm/s)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="50"
                value={getValue('lift_speed', 10)}
                onChange={(e) => setValue('lift_speed', parseInt(e.target.value))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Sample Settings */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Samples
          </label>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setValue('samples', n)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  getValue('samples', 3) === n
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ConfigPanel>
  );
}
