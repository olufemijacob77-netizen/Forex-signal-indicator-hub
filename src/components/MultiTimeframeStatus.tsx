import React from 'react';
import { IndicatorData, Timeframe } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MultiTimeframeStatusProps {
  currentTF: Timeframe;
  onTFChange: (tf: Timeframe) => void;
  data: IndicatorData[];
}

export const MultiTimeframeStatus: React.FC<MultiTimeframeStatusProps> = ({ currentTF, onTFChange, data }) => {
  const timeframes: { label: string; value: Timeframe }[] = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1d', value: '1d' },
    { label: '1w', value: '1w' }
  ];

  const getStatus = (tf: Timeframe) => {
    // For current TF we can use actual data
    if (tf === currentTF && data.length > 0) {
      const last = data[data.length - 1];
      const prev = data[data.length - 2];
      if (!prev) return 'Neutral';
      if (last.close > prev.close) return 'Bullish';
      if (last.close < prev.close) return 'Bearish';
      return 'Neutral';
    }
    // For others, we'll return a simulated bias for UI purposes or "Unknown"
    // In a real app we'd fetch all or have a cache
    return 'Scanning';
  };

  return (
    <div className="bg-quant-surface border border-quant-border rounded p-4 sm:p-5">
      <h3 className="text-[10px] sm:text-[11px] font-bold text-quant-text uppercase tracking-widest mb-4">
        Multi-Timeframe Bias
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {timeframes.map((tf) => {
          const status = getStatus(tf.value);
          const isActive = tf.value === currentTF;
          
          return (
            <button
              key={tf.value}
              onClick={() => onTFChange(tf.value)}
              className={cn(
                "flex items-center justify-between p-2 rounded border transition-all",
                isActive ? "bg-quant-green/10 border-quant-green/50" : "bg-quant-bg/40 border-quant-border/30 hover:border-quant-text/20"
              )}
            >
              <span className={cn(
                "text-[9px] font-black uppercase",
                isActive ? "text-quant-text" : "text-quant-muted"
              )}>
                {tf.label}
              </span>
              <div className="flex items-center gap-1">
                {status === 'Bullish' && <TrendingUp className="w-2.5 h-2.5 text-quant-green" />}
                {status === 'Bearish' && <TrendingDown className="w-2.5 h-2.5 text-quant-red" />}
                {status === 'Neutral' && <Minus className="w-2.5 h-2.5 text-quant-muted" />}
                {status === 'Scanning' && <div className="w-1.5 h-1.5 rounded-full bg-quant-blue/50 animate-pulse" />}
                <span className={cn(
                  "text-[8px] font-bold uppercase",
                  status === 'Bullish' ? "text-quant-green" : 
                  status === 'Bearish' ? "text-quant-red" : "text-quant-muted"
                )}>
                  {status === 'Scanning' ? 'Scan' : status}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
