import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { Wrench, Layers, Package, Settings2 } from 'lucide-react';

type ToolingType = 'single' | 'multi_extruder' | 'mmu' | 'toolchanger';

const TOOLING_TYPES: {
  id: ToolingType;
  name: string;
  description: string;
  icon: typeof Wrench;
}[] = [
  {
    id: 'single',
    name: 'Single Extruder',
    description: 'Standard single toolhead setup',
    icon: Settings2,
  },
  {
    id: 'multi_extruder',
    name: 'Multi-Extruder',
    description: 'Multiple hotends (T0, T1, T2...)',
    icon: Layers,
  },
  {
    id: 'mmu',
    name: 'MMU / ERCF',
    description: 'Filament switching unit (ERCF, Tradrack, etc.)',
    icon: Package,
  },
  {
    id: 'toolchanger',
    name: 'Toolchanger',
    description: 'Physical tool changing (Stealthchanger, Tapchanger)',
    icon: Wrench,
  },
];

const MMU_TYPES = [
  { id: 'ercf', name: 'ERCF v1/v2', description: 'Enraged Rabbit Carrot Feeder' },
  { id: 'tradrack', name: 'Tradrack', description: 'TradRack filament changer' },
  { id: 'box_turtle', name: 'Box Turtle', description: 'Box Turtle MMU' },
  { id: '3ms', name: '3MS', description: '3-Material Switching' },
  { id: 'custom', name: 'Custom MMU', description: 'Custom/other MMU system' },
];

const TOOLCHANGER_TYPES = [
  { id: 'stealthchanger', name: 'Stealthchanger', description: 'Voron Stealthchanger' },
  { id: 'tapchanger', name: 'Tapchanger', description: 'Tapchanger system' },
  { id: 'e3d_tc', name: 'E3D ToolChanger', description: 'E3D Motion System' },
  { id: 'custom', name: 'Custom', description: 'Custom toolchanger' },
];

export function ToolingPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  const toolingType = (state['tooling.type'] as ToolingType) ?? 'single';
  const toolCount = state['tooling.count'] ?? 2;
  const mmuType = state['tooling.mmu_type'] ?? 'ercf';
  const mmuLanes = state['tooling.mmu_lanes'] ?? 6;
  const toolchangerType = state['tooling.toolchanger_type'] ?? 'stealthchanger';

  return (
    <ConfigPanel title="Tooling Configuration" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Wrench className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-amber-300">Tooling Setup</div>
              <p className="text-xs text-amber-200/70 mt-1">
                Configure single or multi-material printing capabilities.
              </p>
            </div>
          </div>
        </div>

        {/* Tooling Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Tooling Type
          </label>
          <div className="space-y-2">
            {TOOLING_TYPES.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setField('tooling.type', option.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all flex items-start gap-3 ${
                    toolingType === option.id
                      ? 'bg-amber-600/20 border-amber-500 ring-1 ring-amber-500'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Icon className={`shrink-0 mt-0.5 ${
                    toolingType === option.id ? 'text-amber-400' : 'text-slate-500'
                  }`} size={20} />
                  <div>
                    <div className={`text-sm font-medium ${
                      toolingType === option.id ? 'text-amber-300' : 'text-slate-300'
                    }`}>
                      {option.name}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Extruder Options */}
        {toolingType === 'multi_extruder' && (
          <div className="border-t border-slate-700 pt-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Multi-Extruder Settings</h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Number of Extruders
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setField('tooling.count', n)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      toolCount === n
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500">
                This will create extruder, extruder1, extruder2... sections in your config.
                Each extruder can have its own hotend or share one (mixing hotend).
              </p>
            </div>

            {/* Links to configure each extruder */}
            <div className="space-y-2">
              {Array.from({ length: toolCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setActivePanel(i === 0 ? 'extruder' : `extruder${i}`)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                >
                  <span className="text-slate-300">
                    {i === 0 ? 'Extruder (T0)' : `Extruder ${i} (T${i})`}
                  </span>
                  <span className="text-slate-500">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MMU Options */}
        {toolingType === 'mmu' && (
          <div className="border-t border-slate-700 pt-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-300">MMU Settings</h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                MMU Type
              </label>
              <select
                value={mmuType}
                onChange={(e) => setField('tooling.mmu_type', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                {MMU_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Number of Lanes/Gates
              </label>
              <div className="flex gap-2 flex-wrap">
                {[4, 6, 8, 9, 12].map((n) => (
                  <button
                    key={n}
                    onClick={() => setField('tooling.mmu_lanes', n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mmuLanes === n
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500">
                MMU configuration requires Happy Hare or similar software.
                The basic Klipper config will be generated, but you'll need to install
                the appropriate MMU software separately.
              </p>
            </div>

            {/* MMU-specific options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state['tooling.mmu_toolhead_sensor'] ?? true}
                  onChange={(e) => setField('tooling.mmu_toolhead_sensor', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-300">Toolhead filament sensor</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state['tooling.mmu_gate_sensors'] ?? false}
                  onChange={(e) => setField('tooling.mmu_gate_sensors', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-300">Individual gate sensors</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state['tooling.mmu_encoder'] ?? true}
                  onChange={(e) => setField('tooling.mmu_encoder', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-300">Filament encoder</span>
              </label>
            </div>
          </div>
        )}

        {/* Toolchanger Options */}
        {toolingType === 'toolchanger' && (
          <div className="border-t border-slate-700 pt-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-300">Toolchanger Settings</h3>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Toolchanger Type
              </label>
              <select
                value={toolchangerType}
                onChange={(e) => setField('tooling.toolchanger_type', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                {TOOLCHANGER_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Number of Tools
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setField('tooling.count', n)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      toolCount === n
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-500">
                Toolchanger configuration requires KTCC (Klipper Tool Changer Code) or similar.
                Each tool will have its own extruder section and tool offsets.
              </p>
            </div>

            {/* Tool offset configuration hint */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-400">Tool Docks</h4>
              {Array.from({ length: toolCount }, (_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 bg-slate-800 rounded-lg text-sm">
                  <span className="text-slate-300">Tool {i} (T{i})</span>
                  <span className="text-slate-500 text-xs">
                    X: {state[`tooling.tool${i}_dock_x`] ?? '?'},
                    Y: {state[`tooling.tool${i}_dock_y`] ?? '?'}
                  </span>
                </div>
              ))}
              <p className="text-xs text-slate-500 mt-2">
                Dock positions and tool offsets are typically configured after initial setup.
              </p>
            </div>
          </div>
        )}
      </div>
    </ConfigPanel>
  );
}

