import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrinterScene } from '../components/three/PrinterScene';
import useWizardStore from '../stores/wizardStore';
import {
  MCUPanel,
  ToolboardPanel,
  StepperPanel,
  ExtruderPanel,
  HotendPanel,
  HeaterBedPanel,
  ProbePanel,
  FanPanel,
  ZConfigPanel,
  ToolingPanel,
} from '../components/panels';
import { ConfigPreview } from '../components/preview/ConfigPreview';
import {
  Cpu,
  CircuitBoard,
  Settings,
  Flame,
  Thermometer,
  Crosshair,
  Fan,
  ChevronLeft,
  Download,
  RotateCcw,
  Save,
  Upload,
  Menu,
  X,
  ArrowDown,
  Wrench,
} from 'lucide-react';

interface SidebarItem {
  id: string;
  name: string;
  icon: typeof Cpu;
  color: string;
  section?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  // Core Components
  { id: 'mcu', name: 'Mainboard', icon: Cpu, color: 'text-cyan-400', section: 'Core' },
  { id: 'toolboard', name: 'Toolboard', icon: CircuitBoard, color: 'text-emerald-400', section: 'Core' },
  { id: 'z_config', name: 'Z Config', icon: ArrowDown, color: 'text-indigo-400', section: 'Core' },
  { id: 'tooling', name: 'Tooling', icon: Wrench, color: 'text-amber-400', section: 'Core' },

  // Motion
  { id: 'stepper_x', name: 'Stepper X', icon: Settings, color: 'text-blue-400', section: 'Motion' },
  { id: 'stepper_y', name: 'Stepper Y', icon: Settings, color: 'text-blue-400', section: 'Motion' },
  { id: 'stepper_z', name: 'Stepper Z', icon: Settings, color: 'text-blue-400', section: 'Motion' },

  // Heating
  { id: 'extruder', name: 'Extruder', icon: Settings, color: 'text-purple-400', section: 'Heating' },
  { id: 'hotend', name: 'Hotend', icon: Flame, color: 'text-orange-400', section: 'Heating' },
  { id: 'heater_bed', name: 'Heated Bed', icon: Thermometer, color: 'text-red-400', section: 'Heating' },

  // Sensors & Cooling
  { id: 'probe', name: 'Probe', icon: Crosshair, color: 'text-violet-400', section: 'Sensors' },
  { id: 'fans', name: 'Fans', icon: Fan, color: 'text-sky-400', section: 'Sensors' },
];

export function Configurator() {
  const navigate = useNavigate();
  const kinematics = useWizardStore((state) => state.state['printer.kinematics'] || '');
  const modelType = useWizardStore((state) => state.state['printer.model'] || '');
  const activePanel = useWizardStore((state) => state.activePanel);
  const setActivePanel = useWizardStore((state) => state.setActivePanel);
  const resetState = useWizardStore((state) => state.resetState);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);

  if (!kinematics) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
        <div className="text-6xl mb-4">🔧</div>
        <h2 className="text-2xl font-bold mb-2">No Kinematics Selected</h2>
        <p className="text-slate-400 mb-6">Please select your printer type to continue.</p>
        <button
          onClick={() => navigate('/select-kinematics')}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-medium transition-colors"
        >
          Select Kinematics
        </button>
      </div>
    );
  }

  const renderActivePanel = () => {
    if (!activePanel) return null;

    // Z Configuration panel
    if (activePanel === 'z_config') {
      return <ZConfigPanel />;
    }

    // Tooling panel
    if (activePanel === 'tooling') {
      return <ToolingPanel />;
    }

    // MCU panel
    if (activePanel === 'mcu') {
      return <MCUPanel />;
    }

    // Toolboard panel
    if (activePanel === 'toolboard') {
      return <ToolboardPanel />;
    }

    // Stepper panels (including dynamic Z steppers)
    if (activePanel.startsWith('stepper_')) {
      return <StepperPanel stepperName={activePanel} />;
    }

    // Extruder panel (cold end - motor/gears)
    if (activePanel === 'extruder' || activePanel.startsWith('extruder')) {
      return <ExtruderPanel />;
    }

    // Hotend panel (hot end - heater/thermistor)
    if (activePanel === 'hotend') {
      return <HotendPanel />;
    }

    // Other panels
    switch (activePanel) {
      case 'heater_bed':
        return <HeaterBedPanel />;
      case 'probe':
        return <ProbePanel />;
      case 'fans':
        return <FanPanel />;
      default:
        return null;
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all configuration? This cannot be undone.')) {
      resetState();
      navigate('/select-kinematics');
    }
  };

  // Group sidebar items by section
  const sections = SIDEBAR_ITEMS.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, SidebarItem[]>);

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* Left Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-lg text-cyan-400">gschpoozi</h1>
              <p className="text-xs text-slate-500 capitalize">{kinematics.replace('_', ' ')}</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {Object.entries(sections).map(([sectionName, items]) => (
            <div key={sectionName} className="mb-4">
              {sidebarOpen && (
                <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {sectionName}
                </div>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePanel(isActive ? null : item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? item.color : ''} />
                    {sidebarOpen && <span className="text-sm">{item.name}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="p-2 border-t border-slate-700">
          {sidebarOpen ? (
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg transition-colors">
                <Save size={16} />
                Save State
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg transition-colors">
                <Upload size={16} />
                Import Config
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg transition-colors">
                <Download size={16} />
                Export Config
              </button>
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button className="p-2 text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg">
                <Save size={16} />
              </button>
              <button className="p-2 text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg">
                <Upload size={16} />
              </button>
              <button className="p-2 text-slate-400 hover:bg-slate-700/50 hover:text-white rounded-lg">
                <Download size={16} />
              </button>
              <button
                onClick={handleReset}
                className="p-2 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-12 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Click components in the 3D view or use the sidebar to configure
            </span>
          </div>
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {previewOpen ? <X size={14} /> : <Menu size={14} />}
            Preview
          </button>
        </div>

        {/* 3D Scene + Config Panel + Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* 3D Scene */}
          <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <PrinterScene modelType={modelType} />

            {/* Active Panel Overlay */}
            {activePanel && renderActivePanel()}
          </div>

          {/* Config Preview */}
          {previewOpen && (
            <div className="w-[450px] border-l border-slate-700">
              <ConfigPreview />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
