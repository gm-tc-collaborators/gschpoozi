import { useState } from 'react';
import { ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Zap, Settings2 } from 'lucide-react';
import type { MotorPort } from './PortSelector';

interface PinEditorProps {
  /** The motor port data from board template */
  portData: MotorPort | null | undefined;
  /** Current pin values from wizard state */
  pins: {
    step_pin?: string;
    dir_pin?: string;
    enable_pin?: string;
    uart_pin?: string;
    cs_pin?: string;
    diag_pin?: string;
  };
  /** Callback when any pin value changes */
  onPinChange: (pinType: string, value: string) => void;
  /** Available GPIO pins from board for advanced override */
  availablePins?: string[];
  /** Whether to show the advanced override section */
  showAdvanced?: boolean;
}

/**
 * Check if a pin has the invert prefix (!)
 */
function isInverted(pin: string | undefined): boolean {
  return pin?.startsWith('!') || false;
}

/**
 * Get the base pin without modifiers (!, ^)
 */
function getBasePin(pin: string | undefined): string {
  if (!pin) return '';
  return pin.replace(/^[!^]+/, '');
}

/**
 * Toggle the invert prefix on a pin
 */
function toggleInvert(pin: string | undefined): string {
  if (!pin) return '';
  if (pin.startsWith('!')) {
    return pin.slice(1);
  }
  // If it has pullup (^), put ! before it
  if (pin.startsWith('^')) {
    return '!' + pin;
  }
  return '!' + pin;
}

/**
 * Check if a pin has pullup prefix (^)
 */
function hasPullup(pin: string | undefined): boolean {
  return pin?.includes('^') || false;
}

/**
 * Toggle the pullup prefix on a pin
 */
function togglePullup(pin: string | undefined): string {
  if (!pin) return '';
  const hasInvert = pin.startsWith('!');
  const base = getBasePin(pin);
  const currentlyHasPullup = hasPullup(pin);

  if (currentlyHasPullup) {
    // Remove pullup
    return hasInvert ? '!' + base : base;
  } else {
    // Add pullup
    return hasInvert ? '!^' + base : '^' + base;
  }
}

interface PinRowProps {
  label: string;
  pinType: string;
  value: string | undefined;
  originalValue: string | undefined;
  onChange: (pinType: string, value: string) => void;
  showInvert?: boolean;
  showPullup?: boolean;
  availablePins?: string[];
  showOverride?: boolean;
}

function PinRow({
  label,
  pinType,
  value,
  originalValue,
  onChange,
  showInvert = true,
  showPullup = false,
  availablePins,
  showOverride = false,
}: PinRowProps) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const inverted = isInverted(value);
  const pullup = hasPullup(value);
  const basePin = getBasePin(value);
  const isModified = value !== originalValue;

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-slate-400 text-xs w-20">{label}:</span>
        <code className={`text-sm font-mono ${isModified ? 'text-amber-400' : 'text-emerald-400'}`}>
          {value || <span className="text-slate-500 italic">not set</span>}
        </code>
        {isModified && (
          <span className="text-xs text-amber-500/70">(modified)</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Invert toggle */}
        {showInvert && value && (
          <button
            type="button"
            onClick={() => onChange(pinType, toggleInvert(value))}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              inverted
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title={inverted ? 'Click to remove inversion (!)' : 'Click to invert pin (!)'}
          >
            {inverted ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            <span>Invert</span>
          </button>
        )}

        {/* Pullup toggle for endstop/probe pins */}
        {showPullup && value && (
          <button
            type="button"
            onClick={() => onChange(pinType, togglePullup(value))}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              pullup
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title={pullup ? 'Click to remove pullup (^)' : 'Click to add pullup (^)'}
          >
            {pullup ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            <span>Pullup</span>
          </button>
        )}

        {/* Override dropdown */}
        {showOverride && availablePins && availablePins.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOverrideOpen(!overrideOpen)}
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
              title="Override pin"
            >
              <Settings2 size={14} />
            </button>
            {overrideOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto min-w-[120px]">
                {availablePins.map((pin) => (
                  <button
                    key={pin}
                    type="button"
                    onClick={() => {
                      // Preserve modifiers when changing base pin
                      const prefix = (inverted ? '!' : '') + (pullup ? '^' : '');
                      onChange(pinType, prefix + pin);
                      setOverrideOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs font-mono hover:bg-slate-700 transition-colors ${
                      basePin === pin ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-300'
                    }`}
                  >
                    {pin}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PinEditor({
  portData,
  pins,
  onPinChange,
  availablePins = [],
  showAdvanced = true,
}: PinEditorProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (!portData) {
    return null;
  }

  // Calculate original pins from port data (with standard Klipper conventions)
  const originalPins = {
    step_pin: portData.step_pin,
    dir_pin: portData.dir_pin,
    enable_pin: '!' + portData.enable_pin, // Enable is typically active-low
    uart_pin: portData.uart_pin,
    cs_pin: portData.cs_pin,
    diag_pin: portData.diag_pin || undefined,
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        <Zap size={14} className="text-cyan-400" />
        <span className="text-xs font-medium text-slate-300">Auto-configured pins</span>
        <span className="text-xs text-slate-500 ml-auto">Click toggles to modify</span>
      </div>

      {/* Pin rows */}
      <div className="px-3 py-2">
        <PinRow
          label="step_pin"
          pinType="step_pin"
          value={pins.step_pin}
          originalValue={originalPins.step_pin}
          onChange={onPinChange}
          showInvert={false} // Step pin shouldn't be inverted
          availablePins={availablePins}
          showOverride={advancedOpen}
        />
        <PinRow
          label="dir_pin"
          pinType="dir_pin"
          value={pins.dir_pin}
          originalValue={originalPins.dir_pin}
          onChange={onPinChange}
          showInvert={true}
          availablePins={availablePins}
          showOverride={advancedOpen}
        />
        <PinRow
          label="enable_pin"
          pinType="enable_pin"
          value={pins.enable_pin}
          originalValue={originalPins.enable_pin}
          onChange={onPinChange}
          showInvert={true}
          availablePins={availablePins}
          showOverride={advancedOpen}
        />
        {pins.uart_pin && (
          <PinRow
            label="uart_pin"
            pinType="uart_pin"
            value={pins.uart_pin}
            originalValue={originalPins.uart_pin}
            onChange={onPinChange}
            showInvert={false}
            availablePins={availablePins}
            showOverride={advancedOpen}
          />
        )}
        {pins.cs_pin && (
          <PinRow
            label="cs_pin"
            pinType="cs_pin"
            value={pins.cs_pin}
            originalValue={originalPins.cs_pin}
            onChange={onPinChange}
            showInvert={false}
            availablePins={availablePins}
            showOverride={advancedOpen}
          />
        )}
        {pins.diag_pin && (
          <PinRow
            label="diag_pin"
            pinType="diag_pin"
            value={pins.diag_pin}
            originalValue={originalPins.diag_pin}
            onChange={onPinChange}
            showInvert={true}
            showPullup={true}
            availablePins={availablePins}
            showOverride={advancedOpen}
          />
        )}
      </div>

      {/* Advanced override section */}
      {showAdvanced && availablePins.length > 0 && (
        <div className="border-t border-slate-700">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Advanced: Override individual pins</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Simple pin editor for non-motor pins (fans, heaters, etc.)
 */
interface SimplePinEditorProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  showInvert?: boolean;
  showPullup?: boolean;
  availablePins?: string[];
}

export function SimplePinEditor({
  label,
  value,
  onChange,
  showInvert = true,
  showPullup = false,
  availablePins = [],
}: SimplePinEditorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inverted = isInverted(value);
  const pullup = hasPullup(value);
  const basePin = getBasePin(value);

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{label}:</span>
          <code className="text-sm font-mono text-emerald-400">
            {value || <span className="text-slate-500 italic">not set</span>}
          </code>
        </div>

        <div className="flex items-center gap-2">
          {showInvert && value && (
            <button
              type="button"
              onClick={() => onChange(toggleInvert(value))}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                inverted
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {inverted ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              <span>Invert</span>
            </button>
          )}

          {showPullup && value && (
            <button
              type="button"
              onClick={() => onChange(togglePullup(value))}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                pullup
                  ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {pullup ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              <span>Pullup</span>
            </button>
          )}

          {availablePins.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Settings2 size={14} />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setDropdownOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-700 transition-colors border-b border-slate-700"
                  >
                    Clear selection
                  </button>
                  {availablePins.map((pin) => (
                    <button
                      key={pin}
                      type="button"
                      onClick={() => {
                        const prefix = (inverted ? '!' : '') + (pullup ? '^' : '');
                        onChange(prefix + pin);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-mono hover:bg-slate-700 transition-colors ${
                        basePin === pin ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-300'
                      }`}
                    >
                      {pin}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PinEditor;
