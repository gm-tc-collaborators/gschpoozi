import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, AlertCircle, Search } from 'lucide-react';

// Types for board port data
export interface MotorPort {
  label: string;
  step_pin: string;
  dir_pin: string;
  enable_pin: string;
  uart_pin?: string;
  cs_pin?: string;
  diag_pin?: string | null;
  spi_bus?: string;
  notes?: string;
}

export interface SimplePort {
  label: string;
  pin: string;
  notes?: string;
  pwm?: boolean;
  voltage?: string;
  max_current_amps?: number;
  pullup?: string;
}

export interface ProbePort {
  label: string;
  signal_pin: string;
  servo_pin?: string;
  notes?: string;
}

export type PortType = 'motor' | 'fan' | 'heater' | 'thermistor' | 'endstop' | 'probe';

export interface BoardData {
  id: string;
  name: string;
  manufacturer: string;
  motor_ports?: Record<string, MotorPort>;
  fan_ports?: Record<string, SimplePort>;
  heater_ports?: Record<string, SimplePort>;
  thermistor_ports?: Record<string, SimplePort>;
  endstop_ports?: Record<string, SimplePort>;
  probe_ports?: Record<string, ProbePort>;
  default_assignments?: Record<string, string>;
}

export interface PortSelectorProps {
  portType: PortType;
  value: string;
  onChange: (portId: string, portData?: MotorPort | SimplePort | ProbePort) => void;
  boardData?: BoardData | Record<string, any> | null;
  usedPorts?: Map<string, string>; // portId -> "used by stepper_x"
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

interface PortOption {
  id: string;
  label: string;
  pins: string;
  notes?: string;
  usedBy?: string;
  data: MotorPort | SimplePort | ProbePort;
}

function getPortsForType(boardData: BoardData | Record<string, any>, portType: PortType): Record<string, any> {
  switch (portType) {
    case 'motor':
      return boardData.motor_ports || {};
    case 'fan':
      return boardData.fan_ports || {};
    case 'heater':
      return boardData.heater_ports || {};
    case 'thermistor':
      return boardData.thermistor_ports || {};
    case 'endstop':
      return boardData.endstop_ports || {};
    case 'probe':
      return boardData.probe_ports || {};
    default:
      return {};
  }
}

function formatPins(port: MotorPort | SimplePort | ProbePort, portType: PortType): string {
  if (portType === 'motor') {
    const motorPort = port as MotorPort;
    const pins = [`step: ${motorPort.step_pin}`, `dir: ${motorPort.dir_pin}`];
    if (motorPort.uart_pin) pins.push(`uart: ${motorPort.uart_pin}`);
    return pins.join(', ');
  } else if (portType === 'probe') {
    const probePort = port as ProbePort;
    const pins = [`signal: ${probePort.signal_pin}`];
    if (probePort.servo_pin) pins.push(`servo: ${probePort.servo_pin}`);
    return pins.join(', ');
  } else {
    const simplePort = port as SimplePort;
    return simplePort.pin;
  }
}

export function PortSelector({
  portType,
  value,
  onChange,
  boardData,
  usedPorts = new Map(),
  placeholder = 'Select port...',
  label,
  disabled = false,
  allowClear = true,
  className = '',
}: PortSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Build options from board data
  const options: PortOption[] = [];
  if (boardData) {
    const ports = getPortsForType(boardData, portType);
    for (const [portId, portData] of Object.entries(ports)) {
      const usedBy = usedPorts.get(portId);
      options.push({
        id: portId,
        label: portData.label || portId,
        pins: formatPins(portData, portType),
        notes: portData.notes,
        usedBy,
        data: portData,
      });
    }
  }

  // Filter options by search term
  const filteredOptions = options.filter(
    (opt) =>
      opt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.pins.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected option details
  const selectedOption = options.find((opt) => opt.id === value);

  const handleSelect = (option: PortOption) => {
    onChange(option.id, option.data);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
  };

  if (!boardData) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
        )}
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-500 text-sm">
          Select a mainboard first...
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between bg-slate-700 border rounded-lg px-3 py-2 text-left transition-colors ${
          disabled
            ? 'border-slate-700 text-slate-500 cursor-not-allowed'
            : isOpen
            ? 'border-cyan-500 ring-1 ring-cyan-500'
            : 'border-slate-600 hover:border-slate-500'
        }`}
      >
        <div className="flex-1 min-w-0">
          {selectedOption ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{selectedOption.id}</span>
                <span className="text-slate-400 text-sm truncate">
                  {selectedOption.label}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {selectedOption.pins}
              </div>
            </div>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {allowClear && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            >
              <span className="text-xs">✕</span>
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Search input */}
          {options.length > 5 && (
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ports..."
                  className="w-full bg-slate-700 border border-slate-600 rounded pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-slate-500 text-sm">
                No ports available
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;
                const isUsedByOther = option.usedBy && option.usedBy !== value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`w-full px-3 py-2.5 text-left transition-colors border-b border-slate-700/50 last:border-0 ${
                      isSelected
                        ? 'bg-cyan-600/20'
                        : isUsedByOther
                        ? 'bg-amber-900/10 hover:bg-amber-900/20'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              isSelected ? 'text-cyan-400' : 'text-white'
                            }`}
                          >
                            {option.id}
                          </span>
                          <span className="text-slate-400 text-sm truncate">
                            {option.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {option.pins}
                        </div>
                        {option.notes && (
                          <div className="text-xs text-slate-600 mt-0.5 truncate">
                            {option.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUsedByOther && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                            <AlertCircle size={12} />
                            <span>{option.usedBy}</span>
                          </div>
                        )}
                        {isSelected && <Check size={16} className="text-cyan-400" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component to show resolved pins after selection
export function ResolvedPins({
  portData,
  portType,
}: {
  portData?: MotorPort | SimplePort | ProbePort | null;
  portType: PortType;
}) {
  if (!portData) return null;

  if (portType === 'motor') {
    const motor = portData as MotorPort;
    return (
      <div className="mt-2 p-2 bg-slate-800 rounded-lg text-xs font-mono">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-400">
          <div>
            step_pin: <span className="text-emerald-400">{motor.step_pin}</span>
          </div>
          <div>
            dir_pin: <span className="text-emerald-400">{motor.dir_pin}</span>
          </div>
          <div>
            enable_pin: <span className="text-emerald-400">!{motor.enable_pin}</span>
          </div>
          {motor.uart_pin && (
            <div>
              uart_pin: <span className="text-emerald-400">{motor.uart_pin}</span>
            </div>
          )}
          {motor.diag_pin && (
            <div>
              diag_pin: <span className="text-emerald-400">{motor.diag_pin}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (portType === 'probe') {
    const probe = portData as ProbePort;
    return (
      <div className="mt-2 p-2 bg-slate-800 rounded-lg text-xs font-mono">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-400">
          <div>
            pin: <span className="text-emerald-400">^{probe.signal_pin}</span>
          </div>
          {probe.servo_pin && (
            <div>
              servo_pin: <span className="text-emerald-400">{probe.servo_pin}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const simple = portData as SimplePort;
  return (
    <div className="mt-2 p-2 bg-slate-800 rounded-lg text-xs font-mono text-slate-400">
      pin: <span className="text-emerald-400">{simple.pin}</span>
      {simple.pwm !== undefined && (
        <span className="ml-3">
          PWM: <span className="text-emerald-400">{simple.pwm ? 'yes' : 'no'}</span>
        </span>
      )}
      {simple.voltage && (
        <span className="ml-3">
          Voltage: <span className="text-emerald-400">{simple.voltage}</span>
        </span>
      )}
    </div>
  );
}

