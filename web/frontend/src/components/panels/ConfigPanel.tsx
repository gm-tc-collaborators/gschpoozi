import React from 'react';
import { X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ConfigPanelProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}

export function ConfigPanel({ title, children, onClose, className }: ConfigPanelProps) {
  return (
    <div
      className={twMerge(
        "absolute right-0 top-0 h-full w-[400px] bg-slate-800 shadow-2xl overflow-y-auto",
        "transform transition-transform duration-300 ease-out",
        "border-l border-slate-700",
        className
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
