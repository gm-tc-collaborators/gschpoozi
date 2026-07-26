import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { useBoard, useToolboard } from '../../hooks/useTemplates';
import { usePortRegistry } from '../../hooks/usePortRegistry';
import { PortSelector } from '../ui/PortSelector';
import type { SimplePort, MotorPort, ProbePort } from '../ui/PortSelector';
import { Lightbulb, Sparkles, Info } from 'lucide-react';

type CaseLightType = 'pwm' | 'onoff' | 'neopixel';
type PortSource = 'fan' | 'heater' | 'manual';

export function LightingPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  const selectedBoard = state['mcu.main.board_type'];
  const { data: boardData } = useBoard(selectedBoard);
  const mainboardRegistry = usePortRegistry(state, boardData);

  const toolboardEnabled = state['mcu.toolboard.enabled'] ?? false;
  const selectedToolboard = state['mcu.toolboard.board_type'];
  const { data: toolboardData } = useToolboard(selectedToolboard);
  const toolboardRegistry = usePortRegistry(state, toolboardData);

  const getValue = (key: string, defaultVal: unknown = '') =>
    state[`lighting.${key}`] ?? defaultVal;
  const setValue = (key: string, value: unknown) => setField(`lighting.${key}`, value);

  const enabled = getValue('case_light.enabled', false);
  const clType = getValue('case_light.type', 'pwm') as CaseLightType;
  const location = getValue('case_light.location', 'mainboard');
  const portSource = getValue('case_light.port_source', 'fan') as PortSource;
  const colorOrder = getValue('case_light.color_order', 'GRB');

  const activeBoardData = location === 'toolboard' ? toolboardData : boardData;
  const activeRegistry = location === 'toolboard' ? toolboardRegistry : mainboardRegistry;

  const fxEnabled = getValue('effects.enabled', false);
  const fxTargets: string[] = getValue('effects.targets', []);

  // Addressable strips available as effect targets
  const strips: { ref: string; label: string }[] = [];
  if (enabled && clType === 'neopixel') {
    strips.push({ ref: 'neopixel:case_light', label: 'Case light' });
  }
  const extraLeds = (state['leds'] as { name?: string }[]) ?? [];
  for (const led of extraLeds) {
    if (led?.name) strips.push({ ref: `neopixel:${led.name}`, label: `LED strip '${led.name}'` });
  }

  const handlePortChange = (portId: string, portData?: MotorPort | SimplePort | ProbePort) => {
    setValue('case_light.port', portId);
    if (portData && 'pin' in portData) {
      setValue('case_light.pin', (portData as SimplePort).pin);
    }
  };

  const toggleTarget = (ref: string) => {
    const next = fxTargets.includes(ref)
      ? fxTargets.filter((t) => t !== ref)
      : [...fxTargets, ref];
    setValue('effects.targets', next);
  };

  return (
    <ConfigPanel title="Lighting" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Case Light */}
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-yellow-300">Case Lighting</div>
              <p className="text-xs text-yellow-200/70 mt-1">
                PWM strips get a brightness slider in Mainsail/Fluidd. Fan and heater
                ports are ideal for LED strips - they are MOSFET-switched outputs at
                supply voltage.
              </p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setValue('case_light.enabled', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
          />
          <span className="text-sm font-medium text-slate-300">Enable case lighting</span>
        </label>

        {enabled && (
          <div className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['pwm', 'PWM strip (slider)'],
                  ['onoff', 'On/Off (switch)'],
                  ['neopixel', 'Neopixel RGB(W)'],
                ] as [CaseLightType, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => setValue('case_light.type', t)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                      clType === t
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            {toolboardEnabled && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Connected To</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['mainboard', 'toolboard'] as const).map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setValue('case_light.location', loc)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        location === loc
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {loc === 'mainboard' ? 'Mainboard' : 'Toolboard'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Port selection for PWM/on-off strips */}
            {clType !== 'neopixel' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Port</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['fan', 'Fan port'],
                      ['heater', 'Heater port'],
                      ['manual', 'Manual pin'],
                    ] as [PortSource, string][]).map(([src, label]) => (
                      <button
                        key={src}
                        onClick={() => setValue('case_light.port_source', src)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                          portSource === src
                            ? 'bg-yellow-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Fan ports (~1A) suit most strips; heater ports handle long high-power strips.
                  </p>
                </div>

                {portSource !== 'manual' && activeBoardData && (
                  <PortSelector
                    label={portSource === 'fan' ? 'Fan Port' : 'Heater Port'}
                    portType={portSource}
                    value={getValue('case_light.port')}
                    onChange={handlePortChange}
                    boardData={activeBoardData}
                    usedPorts={activeRegistry.getUsedByType(portSource)}
                    placeholder={`Select ${portSource} port for case light...`}
                  />
                )}
              </div>
            )}

            {/* Manual pin entry - always available (raw MCU pins stay valid) */}
            {(clType === 'neopixel' || portSource === 'manual') && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {clType === 'neopixel' ? 'Data Pin' : 'Pin'}
                </label>
                <input
                  type="text"
                  value={getValue('case_light.pin')}
                  onChange={(e) => setValue('case_light.pin', e.target.value || undefined)}
                  placeholder={clType === 'neopixel' ? 'e.g. PB0' : 'e.g. PD13'}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 font-mono text-sm"
                />
              </div>
            )}

            {/* Neopixel options */}
            {clType === 'neopixel' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">LED Count</label>
                  <input
                    type="number"
                    min={1}
                    value={getValue('case_light.chain_count', 10)}
                    onChange={(e) => setValue('case_light.chain_count', parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Color Order</label>
                  <select
                    value={colorOrder}
                    onChange={(e) => setValue('case_light.color_order', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                  >
                    <option value="GRB">GRB (most common)</option>
                    <option value="RGB">RGB</option>
                    <option value="GRBW">GRBW</option>
                    <option value="RGBW">RGBW</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LED Effects */}
        <div className="border-t border-slate-700 pt-4 space-y-4">
          <div className="flex items-start gap-3">
            <Sparkles className="text-fuchsia-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-fuchsia-300">LED Effects</div>
              <p className="text-xs text-fuchsia-200/70 mt-1">
                Effect presets for addressable strips. Requires the{' '}
                <code className="bg-slate-800 px-1 rounded">klipper-led_effect</code> plugin.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={fxEnabled}
              onChange={(e) => setValue('effects.enabled', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-fuchsia-500 focus:ring-fuchsia-500"
            />
            <span className="text-sm font-medium text-slate-300">Enable LED effect presets</span>
          </label>

          {fxEnabled && strips.length === 0 && (
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
              <p className="text-xs text-amber-200">
                No addressable (Neopixel) strips configured. Add a Neopixel case light above -
                PWM/on-off strips cannot show effects.
              </p>
            </div>
          )}

          {fxEnabled && strips.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Strips</label>
                <div className="space-y-2">
                  {strips.map((s) => (
                    <label key={s.ref} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fxTargets.includes(s.ref)}
                        onChange={() => toggleTarget(s.ref)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-fuchsia-500 focus:ring-fuchsia-500"
                      />
                      <span className="text-sm text-slate-300">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Presets</label>
                <div className="space-y-2">
                  {([
                    ['idle', 'Idle breathing (starts automatically)', true],
                    ['error', 'Error flash (runs on Klipper shutdown)', true],
                    ['heating', 'Heating gradient (manual/macro activation)', false],
                    ['printing', 'Printing white (manual/macro activation)', false],
                  ] as [string, string, boolean][]).map(([key, label, def]) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={getValue(`effects.${key}`, def)}
                        onChange={(e) => setValue(`effects.${key}`, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-fuchsia-500 focus:ring-fuchsia-500"
                      />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {getValue('effects.heating', false) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Heater for heating gradient
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['heater_bed', 'Heated bed'],
                      ['extruder', 'Hotend'],
                    ] as const).map(([h, label]) => (
                      <button
                        key={h}
                        onClick={() => setValue('effects.heater', h)}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                          getValue('effects.heater', 'heater_bed') === h
                            ? 'bg-fuchsia-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400">
                    Activate manual effects with{' '}
                    <code className="bg-slate-900 px-1 rounded">SET_LED_EFFECT EFFECT=lighting_heating</code>.
                    Idle and error presets run automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ConfigPanel>
  );
}
