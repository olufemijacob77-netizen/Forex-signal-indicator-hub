import React, { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { Alert } from '../types';
import { cn } from '../App';

interface AlertsManagerProps {
  alerts: Alert[];
  onAddAlert: (alert: Omit<Alert, 'id' | 'isTriggered' | 'isActive'>) => void;
  onDeleteAlert: (id: string) => void;
  availablePairs: { label: string, symbol: string, category?: string }[];
  currentSymbol?: string;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({ 
  alerts, 
  onAddAlert, 
  onDeleteAlert,
  availablePairs,
  currentSymbol
}) => {
  const [symbol, setSymbol] = useState(currentSymbol || availablePairs[0]?.symbol || '');
  const [level, setLevel] = useState('');
  const [condition, setCondition] = useState<'above' | 'below' | 'pattern'>('above');
  const [patternType, setPatternType] = useState<'bullish' | 'bearish' | 'any'>('any');
  const [patternName, setPatternName] = useState<string>('any');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (condition !== 'pattern' && (!level || isNaN(Number(level)))) return;

    onAddAlert({
      symbol,
      level: condition === 'pattern' ? undefined : Number(level),
      condition,
      patternType: condition === 'pattern' ? patternType : undefined,
      patternName: condition === 'pattern' ? patternName : undefined
    });
    setLevel('');
    setIsAdding(false);
  };

  return (
    <div className="bg-quant-surface border border-quant-border rounded p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] sm:text-[11px] font-bold text-quant-text uppercase tracking-widest flex items-center gap-2">
          <Bell className="w-3 h-3 text-quant-blue" />
          Price Alerts
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-[9px] uppercase font-bold text-quant-blue hover:text-quant-text transition-colors flex items-center gap-1"
        >
          {isAdding ? "Cancel" : <><Plus className="w-3 h-3" /> New Alert</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-3 bg-quant-bg border border-quant-border rounded space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[8px] text-quant-muted uppercase font-bold">Symbol</label>
              <select 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-quant-surface border border-quant-border text-[10px] font-mono text-quant-green px-2 py-1.5 rounded outline-none"
              >
                {Object.entries(
                  availablePairs.reduce((acc, pair) => {
                    const cat = pair.category || 'Other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(pair);
                    return acc;
                  }, {} as Record<string, typeof availablePairs>)
                ).map(([category, items]) => (
                  <optgroup key={category} label={category} className="bg-quant-bg text-quant-muted text-[8px] font-sans font-bold uppercase tracking-wider">
                    {(items as typeof availablePairs).map(p => (
                      <option key={p.symbol} value={p.symbol} className="bg-quant-surface text-quant-text font-mono text-[10px] normal-case">
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] text-quant-muted uppercase font-bold">Condition</label>
              <select 
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below' | 'pattern')}
                className="w-full bg-quant-surface border border-quant-border text-[10px] font-mono text-quant-green px-2 py-1.5 rounded outline-none"
              >
                <option value="above">Price Above</option>
                <option value="below">Price Below</option>
                <option value="pattern">Pattern Detected</option>
              </select>
            </div>
          </div>

          {condition === 'pattern' ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] text-quant-muted uppercase font-bold">Pattern Type</label>
                <select 
                  value={patternType}
                  onChange={(e) => setPatternType(e.target.value as any)}
                  className="w-full bg-quant-surface border border-quant-border text-[10px] font-mono text-quant-text px-2 py-1.5 rounded outline-none"
                >
                  <option value="any">Any Signal</option>
                  <option value="bullish">Bullish Only</option>
                  <option value="bearish">Bearish Only</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-quant-muted uppercase font-bold">Specific Pattern</label>
                <select 
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  className="w-full bg-quant-surface border border-quant-border text-[10px] font-mono text-quant-text px-2 py-1.5 rounded outline-none"
                >
                  <option value="any">Any Pattern</option>
                  <option value="Doji">Doji</option>
                  <option value="Hammer">Hammer</option>
                  <option value="Inverted Hammer">Inverted Hammer</option>
                  <option value="Bullish Engulfing">Bullish Engulfing</option>
                  <option value="Bearish Engulfing">Bearish Engulfing</option>
                  <option value="Shooting Star">Shooting Star</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[8px] text-quant-muted uppercase font-bold">Target Price</label>
              <input 
                type="text"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                placeholder="1.08500"
                className="w-full bg-quant-surface border border-quant-border text-[10px] font-mono text-quant-text px-2 py-1.5 rounded outline-none placeholder:text-quant-muted"
              />
            </div>
          )}
          <button 
            type="submit"
            className="w-full bg-quant-blue/20 hover:bg-quant-blue/30 border border-quant-blue/40 text-quant-blue text-[10px] font-bold uppercase py-2 rounded transition-colors"
          >
            Create Alert
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
        {alerts.length === 0 && !isAdding && (
          <div className="text-center py-6 border border-dashed border-quant-border rounded">
            <p className="text-[9px] text-quant-muted uppercase font-bold">No active alerts</p>
          </div>
        )}
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={cn(
              "p-2 bg-quant-bg border rounded flex items-center justify-between transition-all",
              alert.isTriggered ? "border-quant-green/50 bg-quant-green/5" : "border-quant-border"
            )}
          >
            <div className="flex items-center gap-2">
              {alert.isTriggered ? (
                <div className="w-1.5 h-1.5 bg-quant-green rounded-full shadow-[0_0_8px_rgba(0,230,118,0.6)]" />
              ) : (
                <div className="w-1.5 h-1.5 bg-quant-blue rounded-full opacity-40" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-quant-text uppercase">{availablePairs.find(p => p.symbol === alert.symbol)?.label}</span>
                  <span className={cn(
                    "text-[8px] uppercase tracking-tighter font-mono",
                    alert.condition === 'pattern' ? "text-quant-blue" : "text-quant-muted"
                  )}>
                    {alert.condition === 'pattern' ? (
                      <span className="flex items-center gap-1">
                        <Zap className="w-2 h-2" />
                        {alert.patternType === 'any' ? 'Any' : alert.patternType} {alert.patternName === 'any' ? 'Pattern' : alert.patternName}
                      </span>
                    ) : (
                      `${alert.condition === 'above' ? '>' : '<'} ${alert.level?.toFixed(5)}`
                    )}
                  </span>
                </div>
                {alert.isTriggered && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[7px] text-quant-green font-bold uppercase">Alert Triggered</p>
                    {alert.triggeredAt && (
                      <span className="text-[6px] text-quant-muted font-mono">{new Date(alert.triggeredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => onDeleteAlert(alert.id)}
              className="p-1.5 text-gray-600 hover:text-quant-red transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
