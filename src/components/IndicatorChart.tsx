import React from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Bar,
  ReferenceLine,
  Label,
  Scatter
} from 'recharts';
import { IndicatorData, IndicatorType, FibonacciSettings, IndicatorSettings } from '../types';
import { CandlestickPattern } from '../utils/patterns';
import { SRLevel } from '../utils/levels';
import { formatPrice } from '../utils/formatters';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChartProps {
  data: IndicatorData[];
  type: IndicatorType;
  patterns?: CandlestickPattern[];
  levels?: SRLevel[];
  fibSettings?: FibonacciSettings;
  indicatorSettings?: IndicatorSettings;
  chartStyle?: 'candlestick' | 'bar' | 'line';
}

export const IndicatorChart: React.FC<ChartProps> = ({ 
  data, 
  type, 
  patterns = [], 
  levels = [],
  fibSettings,
  indicatorSettings,
  chartStyle = 'candlestick'
}) => {
  const priceValues = data.map(d => Number(d.close)).filter(v => !isNaN(v));
  const highValues = data.map(d => Number(d.high)).filter(v => !isNaN(v));
  const lowValues = data.map(d => Number(d.low)).filter(v => !isNaN(v));

  const minPrice = lowValues.length > 0 ? Math.min(...lowValues) * 0.9995 : 0;
  const maxPrice = highValues.length > 0 ? Math.max(...highValues) * 1.0005 : 100;

  // Fibonacci Levels
  const visibleHigh = fibSettings?.customRange?.high ?? (highValues.length > 0 ? Math.max(...highValues) : 0);
  const visibleLow = fibSettings?.customRange?.low ?? (lowValues.length > 0 ? Math.min(...lowValues) : 0);
  const fibDiff = visibleHigh - visibleLow;

  const defaultFibLevels = [
    { value: 0, label: '0%', enabled: true },
    { value: 23.6, label: '23.6%', enabled: true },
    { value: 38.2, label: '38.2%', enabled: true },
    { value: 50, label: '50%', enabled: true },
    { value: 61.8, label: '61.8%', enabled: true },
    { value: 78.6, label: '78.6%', enabled: true },
    { value: 100, label: '100%', enabled: true },
  ];

  const activeFibLevels = (fibSettings?.levels || defaultFibLevels)
    .filter(l => l.enabled)
    .map(l => {
      const val = visibleHigh - fibDiff * (l.value / 100);
      // Check for confluence with SR levels
      const confluenceThreshold = (visibleHigh - visibleLow) * 0.005; // 0.5% of range threshold
      const hasConfluence = levels.some(sr => Math.abs(sr.price - val) <= confluenceThreshold);
      
      return {
        ...l,
        val,
        hasConfluence
      };
    });

  // Fibonacci Time Zones
  const fibTimeZones = React.useMemo(() => {
    if (!fibSettings?.timeZones?.enabled) return [];
    
    const sequence = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
    const startIndex = fibSettings.timeZones.startIndex;
    
    return sequence
      .map((fib, i) => {
        const index = startIndex + fib;
        const candle = data[index];
        return {
          index,
          time: candle?.time,
          label: i.toString()
        };
      })
      .filter(f => f.time);
  }, [fibSettings?.timeZones, data]);

  // Simple S/R levels
  const srLevels = levels;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pattern = patterns.find(p => p.timestamp === label);
      return (
        <div className="bg-quant-bg border border-quant-border p-2 rounded shadow-2xl text-[10px] font-mono">
          <p className="text-quant-muted mb-1 border-b border-quant-border pb-1">{label}</p>
          {pattern && (
             <div className="mb-2 space-y-1">
               <p className={cn("font-black uppercase", 
                 pattern.type === 'bullish' ? "text-quant-green" : "text-quant-red")}>
                 {pattern.name}
               </p>
               {pattern.isConfirmed && (
                 <p className="text-[7px] text-quant-green uppercase font-black tracking-tighter">
                   ✓ Direction Confirmed
                 </p>
               )}
               {pattern.entry && (
                 <div className="pt-1 mt-1 border-t border-quant-border/30 space-y-0.5">
                   <div className="flex justify-between items-center gap-2">
                     <span className="text-[7px] text-quant-muted uppercase font-bold">Entry</span>
                     <span className="text-quant-blue font-bold">{formatPrice(pattern.entry)}</span>
                   </div>
                   <div className="flex justify-between items-center gap-2">
                     <span className="text-[7px] text-quant-muted uppercase font-bold">Stop</span>
                     <span className="text-red-500 font-bold">{formatPrice(pattern.stopLoss!)}</span>
                   </div>
                   <div className="flex justify-between items-center gap-2">
                     <span className="text-[7px] text-quant-muted uppercase font-bold">Target</span>
                     <span className="text-quant-green font-bold">{formatPrice(pattern.takeProfit!)}</span>
                   </div>
                 </div>
               )}
               {pattern.metadata && (
                 <div className="pt-1 mt-1 border-t border-quant-border/30 space-y-0.5 max-w-[150px]">
                   <div className="flex justify-between items-center gap-2">
                     <span className="text-[7px] text-quant-muted uppercase font-bold">Probability</span>
                     <span className={cn("text-[9px] font-black", parseFloat(pattern.metadata.winRate) > 65 ? "text-quant-green" : "text-quant-blue")}>{pattern.metadata.winRate}</span>
                   </div>
                   <p className="text-[7px] text-quant-muted leading-tight whitespace-normal mt-1">
                     <span className="font-bold text-quant-text">Edge: </span>
                     {pattern.metadata.historicalScenario}
                   </p>
                 </div>
               )}
             </div>
          )}
          {payload.map((p: any, i: number) => {
            if (p.name === 'OHLC' && p.payload) {
              const { open, high, low, close } = p.payload;
              return (
                <div key={i} className="space-y-2">
                  <div className="mt-2 pt-2 border-t border-quant-border/30 grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-quant-muted uppercase">Open</span>
                      <span className="font-bold">{formatPrice(open)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-quant-muted uppercase">High</span>
                      <span className="font-bold">{formatPrice(high)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-quant-muted uppercase">Low</span>
                      <span className="font-bold">{formatPrice(low)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-quant-muted uppercase">Close</span>
                      <span className={cn("font-bold", close >= open ? "text-quant-green" : "text-quant-red")}>
                        {formatPrice(close)}
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Fibonacci Level context in tooltip */}
                  {(type === 'FIB' || type === 'ALL') && activeFibLevels.length > 0 && (
                    <div className="pt-2 border-t border-quant-border/20 mt-2">
                      <p className="text-[7px] text-quant-muted uppercase font-black mb-1 tracking-widest">Fibonacci Context</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        {activeFibLevels.map((lvl, idx) => {
                          const isPriceNear = Math.abs(close - lvl.val) / lvl.val < 0.001; // Highlight if within 0.1%
                          return (
                            <div key={idx} className={cn(
                              "flex justify-between items-center text-[8px]",
                              isPriceNear ? "bg-quant-blue/20 px-1 rounded -mx-1" : "",
                              lvl.hasConfluence ? "border-l-2 border-quant-blue pl-2 mt-0.5" : ""
                            )}>
                              <span className={cn(
                                "font-bold",
                                lvl.value === 61.8 ? "text-quant-green" : (lvl.hasConfluence ? "text-quant-blue" : "text-quant-muted")
                              )}>
                                {lvl.label} {lvl.hasConfluence ? "★" : ""}
                              </span>
                              <span className={cn(
                                "font-mono",
                                isPriceNear ? "text-quant-blue font-black" : "text-quant-text"
                              )}>
                                {formatPrice(lvl.val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Support / Resistance Context */}
                  {(type === 'SR' || type === 'ALL') && srLevels.length > 0 && (
                    <div className="pt-2 border-t border-quant-border/20 mt-2">
                      <p className="text-[7px] text-quant-muted uppercase font-black mb-1 tracking-widest">Levels Context</p>
                      <div className="space-y-1">
                        {srLevels
                          .filter(lvl => Math.abs(close - lvl.price) / lvl.price < 0.015) // Within 1.5% for context
                          .sort((a, b) => Math.abs(close - a.price) - Math.abs(close - b.price))
                          .slice(0, 3)
                          .map((lvl, idx) => {
                            const isNear = Math.abs(close - lvl.price) / lvl.price < 0.003;
                            return (
                              <div key={idx} className={cn(
                                "flex justify-between items-center text-[8px] px-1.5 py-0.5 rounded border border-transparent",
                                isNear ? "bg-quant-text/5 border-quant-border/30" : ""
                              )}>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "font-black uppercase text-[7px]",
                                    lvl.type === 'resistance' ? "text-quant-red" : "text-quant-blue"
                                  )}>
                                    {lvl.type === 'resistance' ? 'RES' : 'SUP'}
                                  </span>
                                  {lvl.isMajor && (
                                    <span className="text-[6px] bg-quant-green text-black px-0.5 rounded-sm font-black uppercase tracking-tighter">Major</span>
                                  )}
                                  <span className="text-quant-muted text-[7px]">Str: {lvl.strength}</span>
                                </div>
                                <span className={cn(
                                  "font-mono font-bold",
                                  isNear ? (lvl.type === 'resistance' ? "text-quant-red" : "text-quant-blue") : "text-quant-text"
                                )}>
                                  {formatPrice(lvl.price)}
                                </span>
                              </div>
                            );
                          })
                        }
                        {srLevels.filter(lvl => Math.abs(close - lvl.price) / lvl.price < 0.015).length === 0 && (
                          <p className="text-[7px] text-quant-muted italic px-1">Price in vacuum (no levels near)</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            if (!p.value || isNaN(p.value) || p.name === 'Pattern') return null;
            if (p.name.includes('ST ')) {
               const stType = p.name.includes('BULL') ? 'BULL' : 'BEAR';
               return (
                <p key={i} style={{ color: p.color }} className="flex justify-between gap-4 mt-1 border-quant-border/50 border rounded px-1 bg-white/5">
                  <span className="font-black uppercase text-[8px]">ST {stType}</span>
                  <span className="font-bold">{formatPrice(p.value)}</span>
                </p>
               );
            }
            return (
              <p key={i} style={{ color: p.color }} className="flex justify-between gap-4 mt-1">
                <span>{p.name}</span>
                <span className="font-bold">{typeof p.value === 'number' ? formatPrice(p.value) : p.value}</span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const scatterData = patterns.map(p => {
    const candle = data[p.index];
    if (!candle) return null;
    const price = p.type === 'bullish' ? candle.low * 0.9995 : candle.high * 1.0005;
    if (isNaN(price)) return null;
    return {
      time: p.timestamp,
      price: price,
      type: p.type,
      name: p.name,
      isConfirmed: p.isConfirmed
    };
  }).filter((s): s is any => s !== null);

  const Candlestick = (props: any) => {
    const { x, width, payload, yAxis } = props;
    if (isNaN(x) || isNaN(width) || !yAxis || !payload) return null;

    const { open, close, high, low } = payload;
    if (isNaN(open) || isNaN(close) || isNaN(high) || isNaN(low)) return null;

    const isUp = close >= open;
    const color = isUp ? "#22c55e" : "#ef4444";

    const yHigh = yAxis.scale(high);
    const yLow = yAxis.scale(low);
    const yOpen = yAxis.scale(open);
    const yClose = yAxis.scale(close);
    
    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

    return (
      <g>
        <line
          x1={x + width / 2}
          y1={yHigh}
          x2={x + width / 2}
          y2={yLow}
          stroke={color}
          strokeWidth={1}
        />
        <rect
          x={x}
          y={bodyTop}
          width={width}
          height={bodyHeight}
          fill={color}
        />
      </g>
    );
  };

  const OhlcBar = (props: any) => {
    const { x, width, payload, yAxis } = props;
    if (isNaN(x) || isNaN(width) || !yAxis || !payload) return null;

    const { open, close, high, low } = payload;
    if (isNaN(open) || isNaN(close) || isNaN(high) || isNaN(low)) return null;

    const isUp = close >= open;
    const color = isUp ? "#22c55e" : "#ef4444";

    const yHigh = yAxis.scale(high);
    const yLow = yAxis.scale(low);
    const yOpen = yAxis.scale(open);
    const yClose = yAxis.scale(close);
    
    const centerX = x + width / 2;
    const tickWidth = width * 0.4;

    return (
      <g>
        <line x1={centerX} y1={yHigh} x2={centerX} y2={yLow} stroke={color} strokeWidth={1.5} />
        <line x1={centerX - tickWidth} y1={yOpen} x2={centerX} y2={yOpen} stroke={color} strokeWidth={1.5} />
        <line x1={centerX} y1={yClose} x2={centerX + tickWidth} y2={yClose} stroke={color} strokeWidth={1.5} />
      </g>
    );
  };

  const safeMinPrice = isNaN(minPrice) ? 0 : minPrice;
  const safeMaxPrice = isNaN(maxPrice) ? 100 : maxPrice;

  return (
    <div className="w-full h-[320px] bg-quant-bg border border-quant-border/30 rounded">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--quant-border)" opacity={0.3} vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="var(--quant-muted)" 
            fontSize={9} 
            tickLine={false} 
            axisLine={false}
            minTickGap={40}
            fontFamily="JetBrains Mono"
          />
          <YAxis 
            domain={[safeMinPrice, safeMaxPrice]} 
            orientation="right" 
            stroke="var(--quant-muted)" 
            fontSize={9} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(v) => typeof v === 'number' ? formatPrice(v) : v}
            fontFamily="JetBrains Mono"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={30} iconType="rect" wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />

          {/* Patterns Scatter */}
          {indicatorSettings?.patterns?.enabled !== false && (
            <Scatter isAnimationActive={false} 
              name="Pattern" 
              data={scatterData} 
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                if (isNaN(cx) || isNaN(cy)) return null;
                
                const color = payload.type === 'bullish' ? "#22c55e" : "#ef4444";
                
                if (payload.isConfirmed) {
                  // Return an arrow/triangle for confirmed signals
                  const points = payload.type === 'bullish' 
                    ? `${cx},${cy-8} ${cx-5},${cy+2} ${cx+5},${cy+2}` // Triangle Up (larger)
                    : `${cx},${cy+8} ${cx-5},${cy-2} ${cx+5},${cy-2}`; // Triangle Down (larger)
                  
                  return (
                    <g>
                      {/* Outer glow aura */}
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={12} 
                        fill={color} 
                        fillOpacity={0.15} 
                      />
                      <polygon 
                        points={points}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={10} 
                        fill="none" 
                        stroke={color} 
                        strokeWidth={1} 
                        strokeDasharray="3 3"
                        className="animate-spin-slow"
                      />
                      {/* Confirmation Checkmark Label */}
                      <text 
                        x={cx + 8} 
                        y={cy + (payload.type === 'bullish' ? -8 : 12)} 
                        fill={color} 
                        fontSize="7px" 
                        fontWeight="900" 
                        fontFamily="Inter"
                        textAnchor="start"
                        className="uppercase"
                      >
                        Confirmed
                      </text>
                    </g>
                  );
                }

                return (
                  <circle cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={0.5} />
                );
              }}
            />
          )}

          {/* Base price visualization */}
          {chartStyle === 'line' ? (
            <Line 
              isAnimationActive={false}
              name="PRICE"
              type="monotone"
              dataKey="close"
              stroke="var(--quant-text)"
              strokeWidth={1.5}
              dot={false}
            />
          ) : (
            <Bar 
              isAnimationActive={false} 
              name="OHLC"
              dataKey={(d) => [d.open, d.close]} 
              shape={chartStyle === 'bar' ? <OhlcBar /> : <Candlestick />}
            />
          )}

          {(type === 'MA' || type === 'ALL') && (
            <>
              {indicatorSettings?.ma.enabled !== false && (
                <Line isAnimationActive={false} 
                  name={`SMA ${indicatorSettings?.ma.period ?? 20}`} 
                  type="monotone" 
                  dataKey="ma" 
                  stroke="#EAB308" 
                  strokeWidth={1} 
                  strokeDasharray="4 4"
                  dot={false} 
                />
              )}
              {indicatorSettings?.ema.enabled !== false && (
                <Line isAnimationActive={false} 
                  name={`EMA ${indicatorSettings?.ema.period ?? 50}`} 
                  type="monotone" 
                  dataKey="ema" 
                  stroke="var(--quant-green)" 
                  strokeWidth={1.5} 
                  dot={false} 
                />
              )}
            </>
          )}

          {(type === 'BB' || type === 'ALL') && indicatorSettings?.bb.enabled !== false && (
            <>
              <Area isAnimationActive={false} 
                name="VOLATILITY"
                type="monotone" 
                dataKey={(v: any) => (v.bBands && !isNaN(v.bBands.lower) && !isNaN(v.bBands.upper)) ? [v.bBands.lower, v.bBands.upper] : [null, null]} 
                fill="var(--quant-green)" 
                fillOpacity={0.03} 
                stroke="none"
              />
              <Line isAnimationActive={false} 
                name="BB UPPER" 
                type="monotone" 
                dataKey="bBands.upper" 
                stroke="var(--quant-green)" 
                strokeWidth={1} 
                dot={false} 
                opacity={0.3}
              />
              <Line isAnimationActive={false} 
                name="BB LOWER" 
                type="monotone" 
                dataKey="bBands.lower" 
                stroke="var(--quant-green)" 
                strokeWidth={1} 
                dot={false} 
                opacity={0.3}
              />
            </>
          )}

          {(type === 'FIB' || type === 'ALL') && indicatorSettings?.fib?.enabled !== false && activeFibLevels.map((lvl, i) => !isNaN(lvl.val) && (
            <ReferenceLine 
              key={`fib-${i}`} 
              y={lvl.val} 
              stroke={lvl.hasConfluence ? "var(--quant-blue)" : (lvl.value === 61.8 ? "var(--quant-green)" : (lvl.color || "var(--quant-border)"))} 
              strokeDasharray={lvl.hasConfluence ? "" : "2 2"}
              strokeWidth={lvl.hasConfluence ? 1.5 : (lvl.value === 61.8 ? 1 : 0.5)}
              strokeOpacity={lvl.hasConfluence ? 1 : 0.6}
            >
              {(fibSettings?.showLabels ?? true) && (
                <Label 
                  value={`${lvl.label} (${formatPrice(lvl.val)})${lvl.hasConfluence ? " CONFLUENCE" : ""}`} 
                  position="left" 
                  fill={lvl.hasConfluence ? "var(--quant-blue)" : "var(--quant-muted)"} 
                  fontSize={lvl.hasConfluence ? 9 : 8} 
                  offset={10} 
                  fontFamily="JetBrains Mono"
                  fontWeight={lvl.hasConfluence ? "bold" : "normal"}
                />
              )}
            </ReferenceLine>
          ))}
          
          {(type === 'FIB' || type === 'ALL') && indicatorSettings?.fib?.enabled !== false && fibSettings?.timeZones?.enabled && fibTimeZones.map((tz, i) => (
            <ReferenceLine 
              key={`tz-${i}`} 
              x={tz.time} 
              stroke="var(--quant-blue)" 
              strokeDasharray="4 4" 
              strokeOpacity={0.4}
              strokeWidth={1}
            >
              <Label 
                value={`F${tz.label}`} 
                position="top" 
                fill="var(--quant-blue)" 
                fontSize={8} 
                fontFamily="JetBrains Mono"
                offset={5}
              />
            </ReferenceLine>
          ))}

          {(type === 'SR' || type === 'ALL') && indicatorSettings?.sr?.enabled !== false && srLevels.map((lvl, i) => !isNaN(lvl.price) && (
            <ReferenceLine 
              key={`sr-${i}`} 
              y={lvl.price} 
              stroke={lvl.type === 'resistance' ? "var(--quant-red)" : "var(--quant-blue)"} 
              strokeOpacity={lvl.isMajor ? 0.8 : 0.4}
              strokeWidth={lvl.isMajor ? 1.5 : 1}
              strokeDasharray={lvl.isMajor ? "" : "5 5"}
            >
              <Label 
                value={`${lvl.type === 'resistance' ? "R" : "S"} ${lvl.isMajor ? "KEY" : ""}`} 
                position="right" 
                fill={lvl.type === 'resistance' ? "var(--quant-red)" : "var(--quant-blue)"} 
                fontSize={lvl.isMajor ? 9 : 7} 
                fontWeight={lvl.isMajor ? "900" : "500"}
                fontFamily="JetBrains Mono"
                offset={10}
              />
            </ReferenceLine>
          ))}

          {(type === 'SUPER' || type === 'ALL') && indicatorSettings?.superTrend.enabled !== false && (
            <>
              <Line isAnimationActive={false} 
                name={`ST BULLISH (${indicatorSettings?.superTrend.period ?? 10}, ${indicatorSettings?.superTrend.multiplier ?? 3})`} 
                type="stepAfter" 
                dataKey={(d: any) => d.superTrend?.direction === 'up' ? d.superTrend.value : null} 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
              />
              <Line isAnimationActive={false} 
                name={`ST BEARISH (${indicatorSettings?.superTrend.period ?? 10}, ${indicatorSettings?.superTrend.multiplier ?? 3})`} 
                type="stepAfter" 
                dataKey={(d: any) => d.superTrend?.direction === 'down' ? d.superTrend.value : null} 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </>
          )}

          {/* Elliott Waves Rendering */}
          {(type === 'ELLIOTT' || type === 'ALL') && indicatorSettings?.elliott?.enabled !== false && data[data.length - 1]?.elliottWaves && (
            <g>
              {[
                ...data[data.length - 1].elliottWaves!.motive.map(w => ({ ...w, color: '#3b82f6', type: 'motive' })),
                ...data[data.length - 1].elliottWaves!.corrective.map(w => ({ ...w, color: '#f59e0b', type: 'corrective' }))
              ].map((wave, idx, arr) => {
                const candle = data[wave.index];
                if (!candle) return null;
                
                // Draw connecting lines between wave points
                const nextWave = arr[idx + 1];
                const nextCandle = nextWave ? data[nextWave.index] : null;

                return (
                  <React.Fragment key={`ew-${idx}`}>
                    {nextCandle && nextWave.type === wave.type && (
                      <ReferenceLine 
                        segment={[
                          { x: candle.time, y: wave.price },
                          { x: nextCandle.time, y: nextWave.price }
                        ]}
                        stroke={wave.color}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        opacity={0.6}
                      />
                    )}
                    <ReferenceLine 
                      x={candle.time} 
                      y={wave.price} 
                      stroke="transparent"
                    >
                      <Label 
                        value={wave.label} 
                        position={idx % 2 === 0 ? "top" : "bottom"}
                        fill={wave.color}
                        fontSize={12}
                        fontWeight="900"
                        fontFamily="JetBrains Mono"
                        offset={10}
                      />
                    </ReferenceLine>
                  </React.Fragment>
                );
              })}
            </g>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SubIndicatorChart: React.FC<ChartProps> = ({ data, type, indicatorSettings }) => {
  if (type === 'ALL') {
    return (
      <div className="flex flex-col gap-2 mt-2">
        {indicatorSettings?.rsi.enabled !== false && (
          <div className="w-full h-[100px] bg-quant-bg border border-quant-border/30 rounded">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--quant-border)" opacity={0.3} vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis orientation="right" stroke="var(--quant-muted)" fontSize={8} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--quant-bg)', border: '1px solid var(--quant-border)', fontSize: '8px' }}
                />
                <Line isAnimationActive={false} name={`RSI ${indicatorSettings?.rsi.period ?? 14}`} type="monotone" dataKey="rsi" stroke="var(--quant-green)" strokeWidth={1} dot={false} />
                <ReferenceLine y={70} stroke="var(--quant-red)" strokeDasharray="3 3" strokeWidth={0.5} />
                <ReferenceLine y={30} stroke="var(--quant-blue)" strokeDasharray="3 3" strokeWidth={0.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {indicatorSettings?.macd.enabled !== false && (
          <div className="w-full h-[100px] bg-quant-bg border border-quant-border/30 rounded">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--quant-border)" opacity={0.3} vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis orientation="right" stroke="var(--quant-muted)" fontSize={8} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--quant-bg)', border: '1px solid var(--quant-border)', fontSize: '8px' }}
                />
                <Bar isAnimationActive={false} name="HIST" dataKey="macd.histogram" fill="var(--quant-muted)" opacity={0.3} />
                <Line isAnimationActive={false} name="MACD" type="monotone" dataKey="macd.macd" stroke="var(--quant-blue)" strokeWidth={1} dot={false} />
                <Line isAnimationActive={false} name="SIGNAL" type="monotone" dataKey="macd.signal" stroke="var(--quant-red)" strokeWidth={1} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  if (type !== 'RSI' && type !== 'MACD') return null;
  if ((type === 'RSI' && indicatorSettings?.rsi.enabled === false) || (type === 'MACD' && indicatorSettings?.macd.enabled === false)) return null;

  return (
    <div className="w-full h-[150px] bg-quant-bg border border-quant-border/30 rounded mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--quant-border)" opacity={0.3} vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis 
            orientation="right" 
            stroke="var(--quant-muted)" 
            fontSize={9} 
            tickLine={false} 
            axisLine={false}
            domain={type === 'RSI' ? [0, 100] : ['auto', 'auto']}
            fontFamily="JetBrains Mono"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--quant-bg)', border: '1px solid var(--quant-border)', fontSize: '9px', fontFamily: 'JetBrains Mono' }}
            itemStyle={{ fontSize: '9px' }}
          />

          {type === 'RSI' && (
            <>
              <Line isAnimationActive={false} name="RSI" type="monotone" dataKey="rsi" stroke="var(--quant-green)" strokeWidth={1.5} dot={false} />
              <ReferenceLine y={70} stroke="var(--quant-red)" strokeDasharray="3 3" strokeWidth={0.5} />
              <ReferenceLine y={30} stroke="var(--quant-blue)" strokeDasharray="3 3" strokeWidth={0.5} />
            </>
          )}

          {type === 'MACD' && (
            <>
              <Bar isAnimationActive={false} name="HIST" dataKey="macd.histogram" fill="var(--quant-muted)" opacity={0.3} />
              <Line isAnimationActive={false} name="MACD" type="monotone" dataKey="macd.macd" stroke="var(--quant-blue)" strokeWidth={1} dot={false} />
              <Line isAnimationActive={false} name="SIGNAL" type="monotone" dataKey="macd.signal" stroke="var(--quant-red)" strokeWidth={1} dot={false} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
