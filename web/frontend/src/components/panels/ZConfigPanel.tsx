import { ConfigPanel } from './ConfigPanel';
import useWizardStore from '../../stores/wizardStore';
import { ArrowDown } from 'lucide-react';

const Z_MOTOR_COUNTS = [
  {
    count: 1,
    name: 'Single Z',
    description: 'One motor, center back',
    diagram: `
      ┌─────────┐
      │         │
      │    Z    │
      │         │
      └─────────┘
    `
  },
  {
    count: 2,
    name: 'Dual Z',
    description: 'Two motors, left & right back',
    diagram: `
      ┌─────────┐
      │ Z    Z1 │
      │         │
      │         │
      └─────────┘
    `
  },
  {
    count: 3,
    name: 'Triple Z',
    description: 'Trident-style: 2 back, 1 front',
    diagram: `
      ┌─────────┐
      │ Z    Z1 │
      │         │
      │   Z2    │
      └─────────┘
    `
  },
  {
    count: 4,
    name: 'Quad Z',
    description: 'Four corners',
    diagram: `
      ┌─────────┐
      │ Z    Z1 │
      │         │
      │Z2    Z3 │
      └─────────┘
    `
  },
];

export function ZConfigPanel() {
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const setField = useWizardStore((state) => state.setField);
  const state = useWizardStore((state) => state.state);

  const currentCount = state['z_config.motor_count'] ?? 1;

  return (
    <ConfigPanel title="Z-Axis Configuration" onClose={() => setActivePanel(null)}>
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ArrowDown className="text-indigo-400 shrink-0 mt-0.5" size={20} />
            <div>
              <div className="text-sm font-medium text-indigo-300">Z-Motor Configuration</div>
              <p className="text-xs text-indigo-200/70 mt-1">
                Select how many Z motors your printer uses. The 3D model will update to show motor positions.
              </p>
            </div>
          </div>
        </div>

        {/* Motor Count Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Number of Z Motors
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Z_MOTOR_COUNTS.map((option) => (
              <button
                key={option.count}
                onClick={() => setField('z_config.motor_count', option.count)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  currentCount === option.count
                    ? 'bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-500'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${
                    currentCount === option.count ? 'text-indigo-400' : 'text-slate-300'
                  }`}>
                    {option.count}
                  </span>
                  <span className={`text-sm font-medium ${
                    currentCount === option.count ? 'text-indigo-300' : 'text-slate-400'
                  }`}>
                    {option.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{option.description}</p>

                {/* ASCII diagram */}
                <pre className={`mt-2 text-xs font-mono leading-tight ${
                  currentCount === option.count ? 'text-indigo-400' : 'text-slate-600'
                }`}>
                  {option.diagram}
                </pre>
              </button>
            ))}
          </div>
        </div>

        {/* Individual Z Stepper Config Links */}
        {currentCount > 0 && (
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Configure Individual Steppers</h3>
            <div className="space-y-2">
              {Array.from({ length: currentCount }, (_, i) => {
                const name = i === 0 ? 'stepper_z' : `stepper_z${i}`;
                const label = i === 0 ? 'Z Stepper' : `Z${i} Stepper`;
                return (
                  <button
                    key={name}
                    onClick={() => setActivePanel(name)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                  >
                    <span className="text-slate-300">{label}</span>
                    <span className="text-slate-500">→</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Z Tilt / Quad Gantry Level info */}
        {currentCount >= 3 && (
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">
              {currentCount === 4 ? 'Quad Gantry Level' : 'Z Tilt Adjust'}
            </h4>
            <p className="text-xs text-slate-500">
              {currentCount === 4
                ? 'With 4 Z motors, you can use [quad_gantry_level] for automatic gantry leveling.'
                : 'With 3 Z motors, you can use [z_tilt] for automatic bed tramming.'}
            </p>
          </div>
        )}
      </div>
    </ConfigPanel>
  );
}

