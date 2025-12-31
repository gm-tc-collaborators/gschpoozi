/**
 * Component to display configuration conflicts and validation warnings
 */

import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Conflict, ConflictSeverity } from '../../lib';

interface ConflictsDisplayProps {
  conflicts: Conflict[];
  className?: string;
  /** Only show conflicts of these severities */
  filter?: ConflictSeverity[];
  /** Collapse by default */
  defaultCollapsed?: boolean;
}

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-700',
    textColor: 'text-red-400',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-700',
    textColor: 'text-amber-400',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-700',
    textColor: 'text-blue-400',
    label: 'Info',
  },
};

function ConflictItem({ conflict }: { conflict: Conflict }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[conflict.rule.severity];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-lg overflow-hidden`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/5 transition-colors"
      >
        <Icon className={`${config.textColor} shrink-0 mt-0.5`} size={18} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${config.textColor}`}>
            {conflict.rule.message}
          </div>
          {conflict.rule.suggestion && (
            <p className="text-xs text-slate-400 mt-1">
              {conflict.rule.suggestion}
            </p>
          )}
        </div>
        <div className="shrink-0 text-slate-500">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {expanded && (conflict.rule.details || Object.keys(conflict.context).length > 0) && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-700/50">
          {conflict.rule.details && (
            <p className="text-xs text-slate-400 mt-2">
              {conflict.rule.details}
            </p>
          )}
          {Object.keys(conflict.context).length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-slate-500 mb-1">Current values:</div>
              <div className="font-mono text-xs bg-slate-800/50 rounded p-2">
                {Object.entries(conflict.context).map(([key, value]) => (
                  <div key={key} className="text-slate-400">
                    <span className="text-slate-500">{key}:</span>{' '}
                    <span className="text-slate-300">
                      {value === undefined ? 'not set' : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ConflictsDisplay({
  conflicts,
  className = '',
  filter,
  defaultCollapsed = false,
}: ConflictsDisplayProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Filter conflicts if specified
  const filteredConflicts = filter
    ? conflicts.filter((c) => filter.includes(c.rule.severity))
    : conflicts;

  if (filteredConflicts.length === 0) {
    return null;
  }

  // Count by severity
  const errorCount = filteredConflicts.filter((c) => c.rule.severity === 'error').length;
  const warningCount = filteredConflicts.filter((c) => c.rule.severity === 'warning').length;
  const infoCount = filteredConflicts.filter((c) => c.rule.severity === 'info').length;

  return (
    <div className={className}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-300">
            Configuration Issues
          </span>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-900/50 text-red-400 text-xs">
                <AlertCircle size={12} />
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/50 text-amber-400 text-xs">
                <AlertTriangle size={12} />
                {warningCount}
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/50 text-blue-400 text-xs">
                <Info size={12} />
                {infoCount}
              </span>
            )}
          </div>
        </div>
        <div className="text-slate-500">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Conflicts list */}
      {!collapsed && (
        <div className="mt-2 space-y-2">
          {/* Errors first */}
          {filteredConflicts
            .filter((c) => c.rule.severity === 'error')
            .map((conflict) => (
              <ConflictItem key={conflict.rule.id} conflict={conflict} />
            ))}
          {/* Then warnings */}
          {filteredConflicts
            .filter((c) => c.rule.severity === 'warning')
            .map((conflict) => (
              <ConflictItem key={conflict.rule.id} conflict={conflict} />
            ))}
          {/* Then info */}
          {filteredConflicts
            .filter((c) => c.rule.severity === 'info')
            .map((conflict) => (
              <ConflictItem key={conflict.rule.id} conflict={conflict} />
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline conflict indicator for use in forms
 */
export function ConflictIndicator({
  conflicts,
  field,
}: {
  conflicts: Conflict[];
  field: string;
}) {
  const fieldConflicts = conflicts.filter(
    (c) => c.rule.relatedFields?.includes(field)
  );

  if (fieldConflicts.length === 0) {
    return null;
  }

  const hasError = fieldConflicts.some((c) => c.rule.severity === 'error');
  const config = hasError ? SEVERITY_CONFIG.error : SEVERITY_CONFIG.warning;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 ${config.textColor} text-xs mt-1`}>
      <Icon size={12} />
      <span>{fieldConflicts[0].rule.message}</span>
    </div>
  );
}

export default ConflictsDisplay;
