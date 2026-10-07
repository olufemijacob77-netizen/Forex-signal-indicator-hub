import React from 'react';
import { Settings2, Eye, EyeOff } from 'lucide-react';
import { FibonacciSettings, FibonacciLevelConfig } from '../types';
import { cn } from '../App';

interface FibonacciConfigProps {
  settings: FibonacciSettings;
  onChange: (settings: FibonacciSettings) => void;
}

export const FibonacciConfig: React.FC<FibonacciConfigProps> = ({ settings, onChange }) => {
  const toggleLevel = (index: number) => {
    const newLevels = [...settings.levels];
    newLevels[index].enabled = !newLevels[index].enabled;
    onChange({ ...settings, levels: newLevels });
  };

  const toggleLabels = () => {
    onChange({ ...settings, showLabels: !settings.showLabels });
  };

  const toggleTimeZones = () => {
    onChange({
      ...settings,
      timeZones: {
        enabled: !settings.timeZones?.enabled,
        startIndex: settings.timeZones?.startIndex ?? 0
      }
    });
  };

  const updateStartTime = (val: string) => {
    const idx = parseInt(val);
    if (isNaN(idx)) return;
    onChange({
      ...settings,
      timeZones: {
        enabled: settings.timeZones?.enabled ?? false,
        startIndex: idx
      }
    });
  };

  return (
    <div className="bg-quant-surface border border-quant-border rounded p-4 sm:p-5">
      <h3 className="text-[10px] sm:text-[11px] font-bold text-quant-text uppercase tracking-widest mb-4 flex items-center gap-2">
        <Settings2 className="w-3 h-3 text-quant-green" />
        Fibonacci Settings
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-quant-muted uppercase font-bold">Show Labels</span>
          <button 
            onClick={toggleLabels}
            className={cn(
              "p-1 rounded transition-colors",
              settings.showLabels ? "text-quant-green bg-quant-green/10" : "text-quant-muted bg-quant-border/30"
            )}
          >
            {settings.showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-quant-border/30">
          <div className="flex flex-col">
            <span className="text-[10px] text-quant-muted uppercase font-bold">Time Zones</span>
            <span className="text-[8px] text-quant-muted">Vertical Time Intervals</span>
          </div>
          <button 
            onClick={toggleTimeZones}
            className={cn(
              "px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors",
              settings.timeZones?.enabled ? "text-quant-blue bg-quant-blue/10 border border-quant-blue/30" : "text-quant-muted bg-quant-border/30 border border-transparent"
            )}
          >
            {settings.timeZones?.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        {settings.timeZones?.enabled && (
          <div className="flex items-center justify-between gap-4 py-2 bg-quant-bg/50 rounded px-2 border border-quant-border/20">
            <span className="text-[9px] text-quant-muted uppercase font-bold">Start Index:</span>
            <input 
              type="number" 
              value={settings.timeZones.startIndex}
              onChange={(e) => updateStartTime(e.target.value)}
              className="bg-quant-bg border border-quant-border text-[10px] font-mono text-quant-blue px-2 py-0.5 rounded outline-none w-20 text-right"
              min={0}
              max={300}
            />
          </div>
        )}

        <div className="pt-2 border-t border-quant-border/30">
          <span className="text-[10px] text-quant-muted uppercase font-bold mb-2 block">Retracement Levels</span>
          <div className="grid grid-cols-2 gap-2">
            {settings.levels.map((lvl, i) => (
              <button
                key={i}
                onClick={() => toggleLevel(i)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded border text-[9px] font-mono transition-all",
                  lvl.enabled 
                    ? "border-quant-green/50 bg-quant-green/5 text-quant-green" 
                    : "border-quant-border bg-quant-bg text-quant-muted"
                )}
              >
                <span>{lvl.label}</span>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  lvl.enabled ? "bg-quant-green" : "bg-quant-muted"
                )} />
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-quant-border/50">
          <p className="text-[8px] text-quant-muted uppercase font-black tracking-tighter mb-2 italic">
            * Levels projected from visible range high/low
          </p>
        </div>
      </div>
    </div>
  );
};
