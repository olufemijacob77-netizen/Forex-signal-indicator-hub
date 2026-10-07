
import { CandlestickPattern } from '../utils/patterns';
import { formatPrice } from '../utils/formatters';
import { PricePoint } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Focus, TrendingUp, TrendingDown, Clock, Info, X, BookOpen, Target, Zap, BarChart3, History, CheckCircle2, ArrowRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PatternScannerProps {
  patterns: CandlestickPattern[];
  data: PricePoint[];
}

function PatternVisualizer({ pattern, data }: { pattern: CandlestickPattern, data: PricePoint[] }) {
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);

  const candles = useMemo(() => {
    const start = Math.max(0, pattern.index - 5);
    const end = Math.min(data.length, pattern.index + 5);
    return data.slice(start, end);
  }, [pattern, data]);

  if (candles.length === 0) return null;

  const chartHeight = 80;
  const chartWidth = 200;
  const padding = 10;
  
  const high = Math.max(...candles.map(c => c.high));
  const low = Math.min(...candles.map(c => c.low));
  const range = high - low || 0.0001; // Avoid division by zero
  
  const getY = (price: number) => {
    return chartHeight - padding - ((price - low) / range) * (chartHeight - 2 * padding);
  };

  const candleWidth = (chartWidth - 2 * padding) / candles.length;
  const barWidth = candleWidth * 0.7;

  return (
    <div className="bg-quant-bg/50 border border-quant-border rounded-lg p-3 mb-4 overflow-hidden relative group/chart">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-quant-green/5 opacity-0 group-hover/chart:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[8px] font-black text-quant-muted uppercase tracking-widest flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-quant-blue" />
          Pattern Anatomy
        </span>
        <div className="flex gap-2">
           <span className="text-[7px] font-mono text-quant-muted uppercase bg-quant-border/30 px-1 rounded">H: {formatPrice(high)}</span>
           <span className="text-[7px] font-mono text-quant-muted uppercase bg-quant-border/30 px-1 rounded">L: {formatPrice(low)}</span>
        </div>
      </div>
      
      <div className="relative">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
        {/* Horizontal Grid lines */}
        {[0, 0.5, 1].map(p => (
          <line 
            key={p}
            x1="0" 
            y1={padding + p * (chartHeight - 2 * padding)} 
            x2={chartWidth} 
            y2={padding + p * (chartHeight - 2 * padding)} 
            stroke="var(--quant-border)" 
            strokeWidth="0.5" 
            strokeDasharray="2 2"
          />
        ))}

        {candles.map((candle, i) => {
          const x = padding + i * candleWidth + (candleWidth - barWidth) / 2;
          const openY = getY(candle.open);
          const closeY = getY(candle.close);
          const highY = getY(candle.high);
          const lowY = getY(candle.low);
          const isUp = candle.close >= candle.open;
          const color = isUp ? "#22c55e" : "#ef4444";
          
          // Multi-candle pattern highlighting
          const patternOffset = i - (pattern.index - Math.max(0, pattern.index - 5));
          let isPatternCandle = false;
          
          if (pattern.name.includes('Star') || pattern.name.includes('Soldiers') || pattern.name.includes('Crows')) {
            isPatternCandle = patternOffset >= -2 && patternOffset <= 0;
          } else if (pattern.name.includes('Engulfing')) {
            isPatternCandle = patternOffset >= -1 && patternOffset <= 0;
          } else {
            isPatternCandle = patternOffset === 0;
          }

          return (
            <g 
              key={i} 
              className="group/candle cursor-help"
              onMouseEnter={() => isPatternCandle && setHoveredCandle(i)}
              onMouseLeave={() => setHoveredCandle(null)}
            >
              {/* Highlight Glow for pattern candles */}
              {isPatternCandle && (
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0.1, 0.25, 0.1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  x={x - 4}
                  y={Math.min(highY, lowY) - 4}
                  width={barWidth + 8}
                  height={Math.abs(highY - lowY) + 8}
                  fill={color}
                  rx="4"
                  className="blur-[6px] pointer-events-none"
                />
              )}

              <line 
                x1={x + barWidth / 2} 
                y1={highY} 
                x2={x + barWidth / 2} 
                y2={lowY} 
                stroke={color} 
                strokeWidth={isPatternCandle ? "1.5" : "1"} 
                strokeOpacity={isPatternCandle ? 1 : 0.4}
                className="transition-all duration-300"
              />
              <motion.rect 
                initial={isPatternCandle ? { scaleY: 0.8, opacity: 0.5 } : {}}
                animate={isPatternCandle ? { scaleY: 1, opacity: 1 } : {}}
                x={x} 
                y={Math.min(openY, closeY)} 
                width={barWidth} 
                height={Math.max(1, Math.abs(openY - closeY))} 
                fill={color} 
                fillOpacity={isPatternCandle ? 1 : 0.4}
                rx="1"
                className={cn(
                  "transition-all duration-300 cursor-help",
                  isPatternCandle && "filter drop-shadow-[0_0_2px_rgba(255,255,255,0.2)]"
                )}
              />
              {isPatternCandle && (
                <motion.g
                  initial={{ y: -2, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    y: {
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 1,
                      ease: "easeInOut"
                    }
                  }}
                >
                  <circle 
                    cx={x + barWidth / 2} 
                    cy={Math.min(openY, closeY) - 10} 
                    r="2.5" 
                    fill={color} 
                    className="animate-pulse"
                  />
                  <circle 
                    cx={x + barWidth / 2} 
                    cy={Math.min(openY, closeY) - 10} 
                    r="1.5" 
                    fill="white" 
                  />
                </motion.g>
              )}
            </g>
          );
        })}
      </svg>
      <AnimatePresence>
        {hoveredCandle !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-20 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-quant-surface border border-quant-border shadow-2xl rounded-lg p-3 pointer-events-none"
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-quant-border/50">
              <span className="text-[10px] font-black uppercase text-quant-text">{pattern.name}</span>
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                pattern.type === 'bullish' ? "bg-quant-green/20 text-quant-green" : 
                pattern.type === 'bearish' ? "bg-quant-red/20 text-quant-red" : "bg-quant-muted/20 text-quant-muted"
              )}>
                {pattern.type}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-quant-bg/50 p-1.5 rounded">
                <span className="text-[9px] font-mono text-quant-muted uppercase">Historical Win Rate</span>
                <span className={cn(
                  "text-[10px] font-black font-mono",
                  parseFloat(pattern.metadata?.winRate || '0') > 65 ? "text-quant-green" : "text-quant-blue"
                )}>
                  {pattern.metadata?.winRate || "N/A"}
                </span>
              </div>
              <p className="text-[9px] text-quant-muted leading-relaxed">
                <span className="font-bold text-quant-text">Statistical Edge: </span>
                {pattern.metadata?.historicalScenario}
              </p>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-quant-border" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
}

export function PatternScanner({ patterns, data }: PatternScannerProps) {
  const [selectedPattern, setSelectedPattern] = useState<CandlestickPattern | null>(null);

  // Get unique patterns for the most recent candles (last 10)
  const recentPatterns = patterns.slice(-5).reverse();

  return (
    <div className="bg-quant-surface border border-quant-border rounded p-4 sm:p-5 relative">
      <h3 className="text-[10px] sm:text-[11px] font-bold text-quant-text uppercase tracking-widest mb-4 flex items-center gap-2">
        <Focus className="w-3 h-3 text-quant-green" />
        Pattern Scanner
      </h3>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {recentPatterns.length > 0 ? (
            recentPatterns.map((p, i) => (
              <motion.div
                key={`${p.timestamp}-${p.name}-${p.index}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedPattern(p)}
                className={cn(
                  "flex items-center gap-3 p-2 rounded border border-transparent hover:border-quant-border transition-colors group cursor-pointer",
                  p.type === 'bullish' && "bg-quant-green/5 hover:bg-quant-green/10",
                  p.type === 'bearish' && "bg-quant-red/5 hover:bg-quant-red/10",
                  p.type === 'neutral' && "bg-quant-muted/5 hover:bg-quant-muted/10",
                )}
              >
                <div className={cn(
                  "w-1.5 h-6 rounded-full transition-transform group-hover:scale-y-110",
                  p.type === 'bullish' ? "bg-quant-green" : p.type === 'bearish' ? "bg-quant-red" : "bg-quant-muted"
                )} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-quant-text group-hover:text-white transition-colors">{p.name}</span>
                    <div className="flex items-center gap-1">
                      {p.isConfirmed && (
                        <div className="flex items-center gap-1 bg-quant-green/20 px-1 rounded-sm border border-quant-green/30">
                          <CheckCircle2 className="w-2 h-2 text-quant-green" />
                          <span className="text-[6px] font-black text-quant-green uppercase">Verified</span>
                        </div>
                      )}
                      {p.type === 'bullish' ? (
                        <TrendingUp className="w-3 h-3 text-quant-green" />
                      ) : p.type === 'bearish' ? (
                        <TrendingDown className="w-3 h-3 text-quant-red" />
                      ) : (
                        <Clock className="w-3 h-3 text-quant-muted" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] font-mono text-quant-muted uppercase">
                      {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[8px] font-mono text-quant-muted">•</span>
                    <span className={cn(
                      "text-[8px] font-bold uppercase",
                      p.type === 'bullish' ? "text-quant-green" : p.type === 'bearish' ? "text-quant-red" : "text-quant-muted"
                    )}>
                      {p.type}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-quant-muted opacity-50">
              <Info className="w-5 h-5 mb-2" />
              <p className="text-[9px] uppercase font-bold tracking-widest text-center">Scanning data for formations...</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedPattern && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPattern(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl max-h-[90vh] z-[201] bg-quant-surface border border-quant-border shadow-2xl rounded-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-quant-border flex items-center justify-between bg-quant-surface/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedPattern.type === 'bullish' ? "bg-quant-green/20 text-quant-green" : 
                    selectedPattern.type === 'bearish' ? "bg-quant-red/20 text-quant-red" : "bg-quant-muted/20 text-quant-muted"
                  )}>
                    {selectedPattern.type === 'bullish' ? <TrendingUp className="w-5 h-5" /> : 
                     selectedPattern.type === 'bearish' ? <TrendingDown className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      {selectedPattern.name}
                      {selectedPattern.isConfirmed && (
                        <span className="text-[8px] bg-quant-green/10 text-quant-green border border-quant-green/30 px-1.5 py-0.5 rounded uppercase font-black">Confirmed</span>
                      )}
                    </h2>
                    <p className="text-[10px] text-quant-muted font-mono uppercase tracking-widest">
                      Detected @ {new Date(selectedPattern.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-quant-muted hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
                {/* Visualizer */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-quant-muted">
                    <Focus className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Technical Signature</span>
                  </div>
                  <PatternVisualizer pattern={selectedPattern} data={data} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Knowledge */}
                  <div className="space-y-6">
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-quant-blue">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Description</span>
                      </div>
                      <p className="text-xs text-quant-text leading-relaxed tracking-wide font-medium border-l-2 border-quant-blue pl-4 py-1 italic bg-quant-blue/5 rounded-r">
                        "{selectedPattern.metadata?.definition}"
                      </p>
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-quant-orange">
                        <Zap className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Significance</span>
                      </div>
                      <p className="text-xs text-quant-muted leading-relaxed">
                        {selectedPattern.metadata?.significance}
                      </p>
                    </section>
                  </div>

                  {/* Right Column: Execution */}
                  <div className="space-y-6">
                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-quant-green">
                        <Target className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Trading Strategy</span>
                      </div>
                      <div className="bg-quant-bg/50 border border-quant-border rounded-lg p-3 space-y-3">
                        <p className="text-[11px] text-quant-text font-mono leading-tight">
                          {selectedPattern.metadata?.strategy}
                        </p>
                        
                        {selectedPattern.entry && (
                          <div className="pt-3 border-t border-quant-border/50 space-y-2">
                             <div className="flex justify-between items-center">
                               <span className="text-[8px] text-quant-muted uppercase font-bold">Limit Entry</span>
                               <span className="text-xs font-mono font-bold text-quant-blue">{formatPrice(selectedPattern.entry)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-[8px] text-quant-muted uppercase font-bold">Stop Protection</span>
                               <span className="text-xs font-mono font-bold text-quant-red">{formatPrice(selectedPattern.stopLoss!)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                               <span className="text-[8px] text-quant-muted uppercase font-bold">Target Horizon</span>
                               <span className="text-xs font-mono font-bold text-quant-green">{formatPrice(selectedPattern.takeProfit!)}</span>
                             </div>
                             <div className="flex justify-between items-center pt-1">
                               <span className="text-[8px] text-quant-muted uppercase font-bold">R/R Ratio</span>
                               <span className="text-xs font-mono font-bold text-white">1:2.0</span>
                             </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-quant-bg/80 border-t border-quant-border flex items-center justify-between">
                <div className="flex gap-4">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-quant-blue shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                     <span className="text-[8px] font-bold text-quant-blue uppercase tracking-widest">Active Scan</span>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedPattern(null)}
                  className="px-6 py-2 bg-quant-green hover:bg-quant-green/80 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all transform active:scale-95"
                >
                  Dismiss Data View
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

