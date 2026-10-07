import React from 'react';
import { IndicatorType, IndicatorSettings } from '../types';
import { 
  Activity, 
  BarChart3, 
  Layers, 
  Zap, 
  TrendingUp, 
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Settings2
} from 'lucide-react';
import { TradingSessions } from './TradingSessions';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  activeType: IndicatorType;
  onSelect: (type: IndicatorType) => void;
  settings: IndicatorSettings;
  onToggleIndicator: (key: keyof IndicatorSettings) => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<Props> = ({ activeType, onSelect, settings, onToggleIndicator, onOpenSettings }) => {
  const menuItems: { id: IndicatorType; label: string; sub: string; color: string; settingKey?: keyof IndicatorSettings }[] = [
    { id: 'ALL', label: 'Full Analysis (All Indicators)', sub: 'Complete Market Sync', color: 'border-quant-green' },
    { id: 'RSI', label: 'Relative Strength Index (RSI)', sub: 'Momentum Oscillator', color: 'border-quant-green', settingKey: 'rsi' },
    { id: 'MACD', label: 'MACD (12, 26, 9)', sub: 'Trend Following', color: 'border-blue-500', settingKey: 'macd' },
    { id: 'BB', label: 'Bollinger Bands', sub: 'Volatility Channels', color: 'border-purple-500', settingKey: 'bb' },
    { id: 'MA', label: 'Moving Averages (EMA)', sub: 'Directional Trend', color: 'border-yellow-500', settingKey: 'ma' },
    { id: 'FIB', label: 'Fibonacci Retracement', sub: 'Level Projection', color: 'border-green-500', settingKey: 'fib' },
    { id: 'SR', label: 'Support & Resistance', sub: 'Pivot Points', color: 'border-orange-500', settingKey: 'sr' },
    { id: 'SUPER', label: 'SuperTrend (Trend Flip)', sub: 'Reliable Confirmation', color: 'border-quant-orange', settingKey: 'superTrend' },
    { id: 'ELLIOTT', label: 'Elliott Wave Theory', sub: 'Fractal Cycle Analysis', color: 'border-blue-400', settingKey: 'elliott' },
    { id: 'DEPTH', label: 'Market Depth (L2)', sub: 'Order Book Liquidity', color: 'border-quant-blue', settingKey: 'depth' },
    { id: 'SETTINGS' as any, label: 'Indicator & App Settings', sub: 'Alerts, theme, and push options', color: 'border-quant-green' },
  ];

  return (
    <aside className="w-full md:w-64 border-r border-quant-border bg-quant-surface flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0">
      <div className="p-3 text-[10px] font-bold text-quant-muted uppercase tracking-widest border-b border-quant-border/50">
        Indicator Library
      </div>
      
      <div className="flex flex-col space-y-[1px]">
        {menuItems.map((item) => {
          const isEnabled = item.settingKey ? settings[item.settingKey]?.enabled : true;
          const isSettings = item.id === ('SETTINGS' as any);
          
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => {
                  if (isSettings) {
                    onOpenSettings?.();
                  } else {
                    onSelect(item.id);
                  }
                }}
                className={cn(
                  "w-full p-3 transition-all duration-150 text-left relative pr-10",
                  activeType === item.id 
                    ? "bg-quant-green/5 border-l-2 border-quant-green" 
                    : "hover:bg-white/5 border-l-2 border-transparent"
                )}
              >
                <div className={cn(
                  "text-xs font-bold transition-colors",
                  activeType === item.id ? "text-quant-text" : (isEnabled ? "text-quant-muted group-hover:text-quant-text" : "text-quant-muted/40")
                )}>
                  {item.label}
                </div>
                <div className={cn(
                  "text-[10px] mt-1 transition-colors",
                  activeType === item.id ? "text-quant-muted italic underline underline-offset-2" : (isEnabled ? "text-quant-muted/60" : "text-quant-muted/20")
                )}>
                  {item.sub}
                </div>
              </button>
              
              {item.settingKey && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleIndicator(item.settingKey!);
                  }}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all",
                    isEnabled ? "text-quant-muted hover:text-quant-green hover:bg-quant-green/10" : "text-quant-muted/30 hover:text-quant-muted/60 bg-black/10"
                  )}
                  title={isEnabled ? "Hide Indicator" : "Show Indicator"}
                >
                  {isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              )}

              {isSettings && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-quant-muted group-hover:text-quant-green">
                  <Settings2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto space-y-4 p-4 border-t border-quant-border">
        <TradingSessions />
        <button className="w-full bg-quant-green text-black text-center py-2 text-[11px] font-black uppercase tracking-widest cursor-pointer hover:bg-quant-green/90 transition-colors">
          Apply Strategy
        </button>
      </div>
    </aside>
  );
};

function labelById(id: IndicatorType) {
  switch(id) {
    case 'MA': return 'Moving Averages';
    case 'RSI': return 'RSI';
    case 'MACD': return 'MACD';
    case 'BB': return 'Bollinger Bands';
    case 'FIB': return 'Fibonacci';
    case 'SR': return 'S & R Levels';
    case 'SUPER': return 'SuperTrend';
    case 'DEPTH': return 'Market Depth';
  }
}
