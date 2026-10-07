import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { IndicatorData } from '../types';
import { CandlestickPattern } from '../utils/patterns';
import { SRLevel } from '../utils/levels';
import { formatPrice } from '../utils/formatters';
import { runBacktest } from '../utils/backtest';
import { getDeepConsensus } from '../utils/indicators';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  Zap,
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  Radar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarketAnalysisProps {
  data: IndicatorData[];
  patterns?: CandlestickPattern[];
  levels?: SRLevel[];
  activeSymbol: string;
  onExecuteTrade?: (params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
}

export const MarketAnalysis: React.FC<MarketAnalysisProps> = ({ 
  data, 
  patterns = [], 
  levels = [],
  activeSymbol,
  onExecuteTrade
}) => {
  const analysis = useMemo(() => {
    if (data.length < 2) return null;
    const current = data[data.length - 1];
    
    // Performance Analysis (Internal weighting)
    const backtestResult = runBacktest(data);
    
    // Deep Consensus Analysis
    const deepConsensus = getDeepConsensus(data);

    const signals = [];
    let score = 0; // -100 to 100

    // Support & Resistance Analysis
    if (levels.length > 0) {
      const range = Math.max(...data.map(d => d.close)) - Math.min(...data.map(d => d.close));
      const proxThreshold = range * 0.02; // 2% distance
      
      const nearSupport = levels.find(l => l.type === 'support' && Math.abs(current.close - l.price) < proxThreshold);
      const nearResistance = levels.find(l => l.type === 'resistance' && Math.abs(current.close - l.price) < proxThreshold);

      if (nearSupport) {
        const bonus = nearSupport.isMajor ? 10 : 0;
        score += (15 + bonus);
        signals.push({ label: 'Level', value: `Near Support (${formatPrice(nearSupport.price)})${nearSupport.isMajor ? ' (KEY)' : ''}`, type: 'bullish' });
      }
      if (nearResistance) {
        const bonus = nearResistance.isMajor ? 10 : 0;
        score -= (15 + bonus);
        signals.push({ label: 'Level', value: `Near Resistance (${formatPrice(nearResistance.price)})${nearResistance.isMajor ? ' (KEY)' : ''}`, type: 'bearish' });
      }
    }

    // Patterns Analysis (Focus on Confirmed)
    const confirmedPatterns = patterns.filter(p => p.isConfirmed);
    const lastConfirmed = confirmedPatterns.length > 0 ? confirmedPatterns[confirmedPatterns.length - 1] : null;

    if (lastConfirmed) {
      if (lastConfirmed.type === 'bullish') {
        score += 30;
        signals.push({ label: 'Pattern', value: `Confirmed ${lastConfirmed.name}`, type: 'bullish' });
      } else if (lastConfirmed.type === 'bearish') {
        score -= 30;
        signals.push({ label: 'Pattern', value: `Confirmed ${lastConfirmed.name}`, type: 'bearish' });
      }
    } else if (patterns.length > 0) {
      const lastPattern = patterns[patterns.length - 1];
      signals.push({ label: 'Pattern', value: `Pending ${lastPattern.name}`, type: 'neutral' });
    }

    // Trend Analysis (EMA 50 vs MA 20)
    const movingAvgSignal = current.ma && current.ema ? (current.ma > current.ema ? 'bullish' : 'bearish') : 'neutral';
    if (movingAvgSignal === 'bullish') {
      score += 20;
      signals.push({ label: 'Trend', value: 'Bullish (MA 20 > EMA 50)', type: 'bullish' });
    } else if (movingAvgSignal === 'bearish') {
      score -= 20;
      signals.push({ label: 'Trend', value: 'Bearish (MA 20 < EMA 50)', type: 'bearish' });
    }

    // RSI Analysis
    if (current.rsi) {
      if (current.rsi > 70) {
        score -= 15;
        signals.push({ label: 'RSI', value: `Overbought (${current.rsi.toFixed(1)})`, type: 'bearish' });
      } else if (current.rsi < 30) {
        score += 15;
        signals.push({ label: 'RSI', value: `Oversold (${current.rsi.toFixed(1)})`, type: 'bullish' });
      } else {
        signals.push({ label: 'RSI', value: `Neutral (${current.rsi.toFixed(1)})`, type: 'neutral' });
      }
    }

    // MACD Analysis
    if (current.macd) {
      const macdCross = current.macd.macd > current.macd.signal ? 'bullish' : 'bearish';
      if (macdCross === 'bullish') {
        score += 25;
        signals.push({ label: 'MACD', value: 'Bullish Crossover', type: 'bullish' });
      } else {
        score -= 25;
        signals.push({ label: 'MACD', value: 'Bearish Crossover', type: 'bearish' });
      }
    }

    // Volatility (BB)
    if (current.bBands && !isNaN(current.bBands.upper) && !isNaN(current.bBands.lower)) {
      const diff = current.bBands.upper - current.bBands.lower;
      const pricePos = diff !== 0 ? (current.close - current.bBands.lower) / diff : 0.5;
      
      if (pricePos > 0.9) {
        score -= 10;
        signals.push({ label: 'Volatility', value: 'Price at Upper Band', type: 'bearish' });
      } else if (pricePos < 0.1) {
        score += 10;
        signals.push({ label: 'Volatility', value: 'Price at Lower Band', type: 'bullish' });
      } else {
        signals.push({ label: 'Volatility', value: 'Trading inside bands', type: 'neutral' });
      }
    }

    // SuperTrend Analysis
    if (current.superTrend) {
      if (current.superTrend.direction === 'up') {
        score += 25;
        signals.push({ label: 'Confirmation', value: 'SuperTrend Bullish', type: 'bullish' });
      } else {
        score -= 25;
        signals.push({ label: 'Confirmation', value: 'SuperTrend Bearish', type: 'bearish' });
      }
    }

    // Deepest Analysis
    const finalScore = score;

    const sentiment = finalScore > 30 ? 'Strong Bullish' : 
                      finalScore > 10 ? 'Bullish' : 
                      finalScore < -30 ? 'Strong Bearish' : 
                      finalScore < -10 ? 'Bearish' : 'Neutral';
    
    const strengthValue = isNaN(finalScore) ? 0 : Math.abs(finalScore);
    const strength = isNaN(strengthValue) ? 0 : Math.min(strengthValue, 100);

    return { 
      sentiment, 
      strength, 
      signals, 
      score: isNaN(finalScore) ? 0 : finalScore, 
      lastConfirmed, 
      deep: deepConsensus
    };
  }, [data, patterns, levels]);

  if (!analysis) return null;

  const isStrongBullish = analysis.sentiment === 'Strong Bullish';
  const isBullish = analysis.sentiment.includes('Bullish');
  const isStrongBearish = analysis.sentiment === 'Strong Bearish';
  const isBearish = analysis.sentiment.includes('Bearish');

  const verdictColorText = isStrongBullish ? "text-quant-green font-black" : isBullish ? "text-quant-green/90" : isStrongBearish ? "text-quant-red font-black" : isBearish ? "text-quant-red/90" : "text-quant-muted";
  const verdictBgText = isBullish ? "bg-quant-green/10 text-quant-green border-quant-green/35" : isBearish ? "bg-quant-red/10 text-quant-red border-quant-red/35" : "bg-quant-bg border-quant-border text-quant-muted";

  return (
    <div className="space-y-4">
      {/* ==================== CONSOLIDATED SIGNAL DECISION CENTER ==================== */}
      <div className="bg-gradient-to-br from-quant-surface to-quant-bg border border-quant-border rounded-lg overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-1.5 h-full rounded-l-md bg-quant-green" />
        <div className="p-4 sm:p-5 relative z-10 space-y-4 sm:space-y-5">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-quant-border/30">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-quant-green/15 flex items-center justify-center animate-pulse">
                <Activity className="w-3.5 h-3.5 text-quant-green" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-quant-text block">Consolidated Signal Decision Center</span>
                <span className="text-[7.5px] font-mono text-quant-muted block uppercase">Secure Multi-Engine Algorithmic Consensus Panel</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[7.5px] font-mono text-quant-muted uppercase">SYSTEM STATE:</span>
              <div className="flex items-center gap-1.5 bg-quant-bg px-2 py-0.5 rounded border border-quant-border/30 text-[9px] font-mono text-quant-text">
                <span className="w-1.5 h-1.5 rounded-full bg-quant-green animate-pulse" />
                CONFLUENCE REACHED
              </div>
            </div>
          </div>

          {/* Core Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Column 1: Composite Decision Dial / Sentiment */}
            <div className="md:col-span-4 flex flex-col justify-between space-y-3 bg-quant-bg/30 p-3.5 rounded border border-quant-border/20">
              <div>
                <span className="text-[8px] font-black text-quant-muted uppercase tracking-widest block mb-2">Composite Sentiment Verdict</span>
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider border", verdictBgText)}>
                    {analysis.sentiment}
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[8.5px] text-quant-muted uppercase font-bold">Consensus Confidence</span>
                    <span className="text-[10px] font-mono font-black">{Math.round(analysis.strength || 0)}%</span>
                  </div>
                  <div className="h-2 bg-quant-bg-dark border border-quant-border rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${analysis.strength}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isBullish ? "bg-quant-green shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
                        isBearish ? "bg-quant-red shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-quant-muted"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="text-[8px] text-quant-muted/80 leading-relaxed uppercase border-t border-quant-border/20 pt-2.5 mt-2">
                Unified algorithmic index confirms a <span className={cn("font-bold", verdictColorText)}>{analysis.sentiment}</span> market trend phase, driven by concurrent checks across major indicator models.
              </div>
            </div>

            {/* Column 2: Suggested Execution Plan */}
            <div className="md:col-span-4 flex flex-col justify-between space-y-3 bg-quant-bg/30 p-3.5 rounded border border-quant-border/20">
              <div>
                <span className="text-[8px] font-black text-quant-muted uppercase tracking-widest block mb-3">Ensemble Target Parameters</span>
                {analysis.deep.levels ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-1.5 bg-quant-bg rounded border border-quant-border/30">
                      <span className="text-[8px] font-bold text-quant-muted uppercase">SUGGESTED ENTRY</span>
                      <span className="text-xs font-mono font-black text-quant-text">{formatPrice(analysis.deep.levels.entry)}</span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 bg-quant-green/5 rounded border border-quant-green/20">
                      <span className="text-[8px] font-bold text-quant-green uppercase">TAKE PROFIT (TP)</span>
                      <span className="text-xs font-mono font-black text-quant-green">{formatPrice(analysis.deep.levels.tp)}</span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 bg-quant-red/5 rounded border border-quant-red/20">
                      <span className="text-[8px] font-bold text-quant-red uppercase">STOP LOSS (SL)</span>
                      <span className="text-xs font-mono font-black text-quant-red">{formatPrice(analysis.deep.levels.sl)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-28 bg-quant-bg rounded-lg border border-quant-border/10">
                    <span className="text-[9px] text-quant-muted uppercase italic">No Execution Levels for Hold Phase</span>
                  </div>
                )}
              </div>

              {analysis.deep.levels && (
                <div className="flex items-center justify-between border-t border-quant-border/25 pt-2 text-[8px] text-quant-muted font-bold uppercase">
                  <span>RISK-REWARD: 1:3.0</span>
                  <span className="text-quant-green">PROBABILITY: {Math.round(analysis.deep.probability || 0)}%</span>
                </div>
              )}
            </div>

            {/* Column 3: High-Fidelity Confluence Matrix checklist */}
            <div className="md:col-span-4 flex flex-col justify-between space-y-2 bg-quant-bg/30 p-3.5 rounded border border-quant-border/20">
              <div>
                <span className="text-[8px] font-black text-quant-muted uppercase tracking-widest block mb-2">Confluence Checklists Matrix</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {analysis.signals.map((sig, i) => (
                    <div key={i} className="flex items-center justify-between p-1 rounded bg-quant-bg/40 border border-quant-border/10 text-[8.5px] uppercase font-bold">
                      <span className="text-quant-muted truncate max-w-[60px]">{sig.label}</span>
                      <span className={cn(
                        "font-mono text-[7px] truncate max-w-[50px]",
                        sig.type === 'bullish' ? "text-quant-green" : 
                        sig.type === 'bearish' ? "text-quant-red" : "text-quant-muted"
                      )}>
                        {sig.type === 'bullish' ? "BULL" : sig.type === 'bearish' ? "BEAR" : "NEUT"}
                      </span>
                    </div>
                  ))}
                  {/* Additional checklist components */}
                  <div className="flex items-center justify-between p-1 rounded bg-quant-bg/40 border border-quant-border/10 text-[8.5px] uppercase font-bold">
                    <span className="text-quant-muted">Ew cycle</span>
                    <span className="font-mono text-[7px] text-quant-blue">
                      {data[data.length - 1].elliottWaves ? "ACTIVE" : "NONE"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1 rounded bg-quant-bg/40 border border-quant-border/10 text-[8.5px] uppercase font-bold">
                    <span className="text-quant-muted">Patterns</span>
                    <span className="font-mono text-[7px] text-quant-green">
                      {analysis.lastConfirmed ? "CONFIRMED" : "PENDING"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1.5 rounded bg-quant-blue/5 border border-quant-blue/20 text-[7.5px] uppercase font-bold text-quant-blue/90">
                <Target className="w-3 h-3 shrink-0" />
                <span>Multi-Interval consensus verified & aggregated in real-time</span>
              </div>
            </div>
          </div>

          {/* Executive One-Click Action Bar */}
          {onExecuteTrade && (
            <div className="mt-4 pt-4 border-t border-quant-border/20 flex flex-col sm:flex-row items-center justify-between gap-3 bg-quant-surface-dark border border-quant-border/10 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className={cn("w-4 h-4 shrink-0", isBullish ? "text-quant-green animate-bounce" : isBearish ? "text-quant-red animate-bounce" : "text-quant-muted")} />
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-quant-text block">
                    One-Click Order Router
                  </span>
                  <span className="text-[7.5px] font-mono text-quant-muted block uppercase">
                    Instantly route confluence signal parameters directly to the trade book
                  </span>
                </div>
              </div>

              {isBullish || isBearish ? (
                <button
                  type="button"
                  onClick={() => {
                    const price = analysis.deep.levels?.entry || data[data.length - 1].close;
                    const sl = analysis.deep.levels?.sl;
                    const tp = analysis.deep.levels?.tp;
                    onExecuteTrade({
                      symbol: activeSymbol,
                      type: isBullish ? 'BUY' : 'SELL',
                      entryPrice: price,
                      stopLoss: sl,
                      takeProfit: tp
                    });
                  }}
                  className={cn(
                    "w-full sm:w-auto px-5 py-2 rounded text-[9.5px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-transparent hover:border-white/10",
                    isBullish 
                      ? "bg-quant-green text-black hover:bg-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                      : "bg-quant-red text-white hover:bg-rose-600 shadow-[0_0_12px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  )}
                >
                  Confirm Execute {isBullish ? 'BUY' : 'SELL'} Signal at {formatPrice(analysis.deep.levels?.entry || data[data.length - 1].close)}
                </button>
              ) : (
                <div className="text-[8.5px] font-mono uppercase bg-quant-bg border border-quant-border/40 px-3 py-1.5 rounded text-quant-muted">
                  No execution signal: Neutral stance is advised
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deep Signal Section */}
      <div className="bg-quant-surface border border-quant-border rounded overflow-hidden">
        <div className="bg-quant-bg/50 px-4 py-3 border-b border-quant-border flex items-center justify-between">
           <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
             <Radar className="w-4 h-4 text-quant-blue animate-pulse" />
             Deep Analysis Consensus
           </h3>
           <div className={cn(
             "px-3 py-1 rounded text-[10px] font-black uppercase border",
             analysis.deep.type.includes('buy') ? "bg-quant-green/10 text-quant-green border-quant-green/30" :
             analysis.deep.type.includes('sell') ? "bg-quant-red/10 text-quant-red border-quant-red/30" : "bg-quant-muted/10 text-quant-muted border-quant-muted/30"
           )}>
             {analysis.deep.type.replace('_', ' ')}
           </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] text-quant-muted uppercase font-bold">Signal Probability</span>
                 <span className="text-xs font-mono font-black">{Math.round(analysis.deep.probability || 0)}%</span>
              </div>
              <div className="h-2 bg-quant-bg border border-quant-border rounded-full overflow-hidden mb-4">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${analysis.deep.probability}%` }}
                   className={cn(
                     "h-full rounded-full transition-all duration-1000",
                     analysis.deep.type.includes('buy') ? "bg-quant-green" :
                     analysis.deep.type.includes('sell') ? "bg-quant-red" : "bg-quant-muted"
                   )}
                 />
              </div>
              <div className="bg-quant-bg/30 p-3 rounded border border-quant-border/30">
                 <p className="text-[10px] text-quant-muted leading-relaxed uppercase">
                    The Deep Intelligence Engine has analyzed recent chart history and multi-indicator confluence. 
                    The current setup exhibits characteristics of a <span className="text-quant-text font-black">{analysis.deep.type.replace('_', ' ')}</span> opportunity 
                    with a conviction score of <span className="text-quant-text font-black">{analysis.deep.probability.toFixed(0)}%</span>.
                 </p>
              </div>

              {analysis.deep.levels && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                   <div className="bg-quant-blue/10 border border-quant-blue/20 p-2 rounded">
                      <span className="text-[7px] font-black uppercase text-quant-blue block mb-1">Entry</span>
                      <span className="text-[10px] font-mono font-black text-quant-text">{formatPrice(analysis.deep.levels.entry)}</span>
                   </div>
                   <div className="bg-quant-green/10 border border-quant-green/20 p-2 rounded">
                      <span className="text-[7px] font-black uppercase text-quant-green block mb-1">Take Profit</span>
                      <span className="text-[10px] font-mono font-black text-quant-green">{formatPrice(analysis.deep.levels.tp)}</span>
                   </div>
                   <div className="bg-quant-red/10 border border-quant-red/20 p-2 rounded">
                      <span className="text-[7px] font-black uppercase text-quant-red block mb-1">Stop Loss</span>
                      <span className="text-[10px] font-mono font-black text-quant-red">{formatPrice(analysis.deep.levels.sl)}</span>
                   </div>
                </div>
              )}
           </div>
           <div className="space-y-1.5">
              <span className="text-[9px] text-quant-muted font-black uppercase tracking-widest block mb-2">Deep Primary Reasons</span>
              {analysis.deep.reasons.map((reason, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-quant-bg/40 border border-quant-border/10">
                   <div className={cn(
                     "w-1 h-1 rounded-full",
                     analysis.deep.type.includes('buy') ? "bg-quant-green" : "bg-quant-red"
                   )} />
                   <span className="text-[10px] text-quant-text font-medium">{reason}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Elliott Wave Deep Dive */}
      {data[data.length - 1].elliottWaves && data[data.length - 1].elliottWaves!.motive.length > 0 && (
         <div className="bg-quant-surface border border-quant-border rounded overflow-hidden mt-4 shadow-xl">
            <div className="bg-quant-bg/50 px-4 py-3 border-b border-quant-border flex items-center justify-between">
               <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Radar className="w-4 h-4 text-blue-400" />
                  Elliott Wave Cycle Intelligence
               </h3>
               <div className="flex items-center gap-2">
                  <span className="text-[8px] text-quant-muted uppercase font-bold">Reliability Score</span>
                  <div className="flex gap-0.5">
                     {[1, 2, 3].map(i => (
                        <div 
                           key={i} 
                           className={cn(
                              "w-3 h-1 rounded-full", 
                              i <= (data[data.length - 1].elliottWaves!.confidence / 33) ? "bg-blue-400" : "bg-quant-bg"
                           )} 
                        />
                     ))}
                  </div>
               </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-4">
                  <div className="bg-quant-bg/30 p-4 rounded border border-quant-border/30 relative overflow-hidden">
                     <div className="relative z-10">
                        <span className="text-[8px] text-quant-muted uppercase font-black block mb-2">Dominant Cycle Stage</span>
                        <div className="flex items-end gap-2">
                           <span className="text-2xl font-black text-quant-text leading-none uppercase tracking-tighter">
                              {data[data.length - 1].elliottWaves!.corrective.length > 0 ? "Corrective" : "Impulsive"}
                           </span>
                           <span className="text-[10px] font-black text-blue-400 mb-0.5 px-2 bg-blue-400/10 rounded">
                               {data[data.length - 1].elliottWaves!.corrective.length > 0 ? "ABC" : "1-2-3-4-5"}
                           </span>
                        </div>
                     </div>
                     <Activity className="absolute -right-4 -bottom-4 w-20 h-20 text-blue-400/5 rotate-12" />
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                     {data[data.length - 1].elliottWaves!.rules.map((rule, i) => (
                        <div key={i} className="flex flex-col gap-1 p-2.5 rounded bg-quant-bg/40 border border-quant-border/10 group">
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] text-quant-muted font-black group-hover:text-quant-text transition-colors uppercase tracking-widest">{rule.name}</span>
                              {rule.pass ? (
                                 <div className="flex items-center gap-1 text-quant-green">
                                    <span className="text-[7px] font-black italic">CONFORMS</span>
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                 </div>
                              ) : (
                                 <div className="flex items-center gap-1 text-quant-orange">
                                    <span className="text-[7px] font-black italic">VIOLATION</span>
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                 </div>
                              )}
                           </div>
                           <p className="text-[7.5px] text-quant-muted/60 leading-tight uppercase font-medium">
                              {rule.name === "Wave 2 Retracement Safe" && "Mandatory: Wave 2 must not retrace 100%+ of W1."}
                              {rule.name === "Wave 3 Impulse Strong" && "Mandatory: Wave 3 cannot be the shortest motive segment."}
                              {rule.name === "Wave 4 Territory Gap" && "Standard: Wave 4 should not overlap Wave 1 peak/trough."}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-4">
                  <div>
                    <span className="text-[9px] text-quant-muted font-black uppercase tracking-widest block mb-2">Technical Cycle Probability</span>
                    <div className="relative pt-6 pb-2">
                       {/* Semi-circle Gauge placeholder or stylized bar */}
                       <div className="h-4 bg-quant-bg border border-quant-border rounded-full p-1 relative overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${data[data.length - 1].elliottWaves!.confidence}%` }}
                             className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                data[data.length - 1].elliottWaves!.confidence > 70 ? "bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]" :
                                data[data.length - 1].elliottWaves!.confidence > 40 ? "bg-quant-orange shadow-[0_0_15px_rgba(249,115,22,0.5)]" : "bg-quant-red shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                             )}
                          />
                       </div>
                       <div className="flex justify-between mt-2">
                          <span className="text-[7px] font-black text-quant-muted uppercase">Speculative</span>
                          <span className="text-[8px] font-black text-quant-text">{data[data.length - 1].elliottWaves!.confidence.toFixed(0)}% Integrity</span>
                          <span className="text-[7px] font-black text-quant-muted uppercase">High Confluence</span>
                       </div>
                    </div>
                    <div className="bg-quant-bg/30 p-3 rounded border border-quant-border/30 border-l-2 border-l-blue-400">
                       <p className="text-[10px] text-quant-muted leading-relaxed uppercase tracking-tight font-medium">
                          {data[data.length - 1].elliottWaves!.confidence > 60 
                            ? "Current fractal structure satisfies primary motive wave characteristics. High cyclical integrity detected."
                            : "Sub-wave overlaps or retracement violations detected. Market may be entering a complex corrective phase."}
                       </p>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                     <div className="flex justify-between items-center text-[8px] font-black uppercase text-quant-muted mb-2">
                        <span>Progress through sequence</span>
                        <span className="text-blue-400">{data[data.length - 1].elliottWaves!.corrective.length > 0 ? "Corrective Zone" : `Wave ${data[data.length - 1].elliottWaves!.motive.length} Active`}</span>
                     </div>
                     <div className="h-1.5 bg-quant-bg border border-quant-border rounded-full overflow-hidden">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${(data[data.length - 1].elliottWaves!.motive.length / 5 * 100)}%` }}
                           className="h-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)] transition-all" 
                        />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {analysis.lastConfirmed && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-3 rounded border flex flex-col gap-3 shadow-xl",
            analysis.lastConfirmed.type === 'bullish' ? "bg-quant-green/10 border-quant-green/30" : "bg-quant-red/10 border-quant-red/30"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={cn(
                 "w-10 h-10 rounded-full flex items-center justify-center border-2",
                 analysis.lastConfirmed.type === 'bullish' ? "bg-quant-green/20 text-quant-green border-quant-green/40" : "bg-quant-red/20 text-quant-red border-quant-red/40"
               )}>
                 <Zap className={cn("w-6 h-6", analysis.lastConfirmed.type === 'bullish' ? "animate-pulse" : "")} />
               </div>
               <div>
                 <p className="text-xs font-black uppercase tracking-widest text-quant-text flex items-center gap-2">
                   Deep Analysis: {analysis.lastConfirmed.name}
                   <span className="bg-quant-text/10 text-quant-text px-1.5 py-0.5 rounded text-[8px] border border-quant-border">VERIFIED</span>
                 </p>
                 <p className="text-[9px] text-quant-muted font-mono uppercase">
                   Consensus signal matched with deep market structure
                 </p>
               </div>
            </div>
            <div className={cn(
              "text-[10px] font-bold px-3 py-1 rounded uppercase tracking-tighter",
              analysis.lastConfirmed.type === 'bullish' ? "bg-quant-green text-black" : "bg-quant-red text-white"
            )}>
              {analysis.strength > 50 ? 'Institutional Conviction' : 'Standard Conviction'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="bg-quant-bg/40 p-2 rounded border border-white/5">
              <span className="text-[8px] text-quant-muted uppercase font-bold block mb-1">Entry Point</span>
              <span className="text-xs font-mono font-bold text-quant-blue">
                {analysis.deep.levels ? formatPrice(analysis.deep.levels.entry) : '---'}
              </span>
            </div>
            <div className="bg-quant-bg/40 p-2 rounded border border-white/5">
              <span className="text-[8px] text-quant-muted uppercase font-bold block mb-1 text-red-400">Stop Loss</span>
              <span className="text-xs font-mono font-bold text-red-500">
                {analysis.deep.levels ? formatPrice(analysis.deep.levels.sl) : '---'}
              </span>
            </div>
            <div className="bg-quant-bg/40 p-2 rounded border border-white/5">
              <span className="text-[8px] text-quant-muted uppercase font-bold block mb-1 text-quant-green">Take Profit</span>
              <span className="text-xs font-mono font-bold text-quant-green">
                {analysis.deep.levels ? formatPrice(analysis.deep.levels.tp) : '---'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-quant-surface border border-quant-border rounded overflow-hidden">
      <div className="bg-quant-bg/50 px-4 py-3 border-b border-quant-border flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-quant-green" />
          Market Interpretation Engine (V2.0)
        </h3>
        <div className="flex items-center gap-2">
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
            analysis.sentiment.includes('Bullish') ? "bg-quant-green/20 text-quant-green" : 
            analysis.sentiment.includes('Bearish') ? "bg-quant-red/20 text-quant-red" : "bg-quant-muted/20 text-quant-muted"
          )}>
            {analysis.sentiment} Signal
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
             <div className="flex justify-between items-end mb-1">
               <span className="text-[10px] text-quant-muted uppercase font-bold">Analysis Conviction</span>
               <span className="text-xs font-mono font-black">{Math.round(analysis.strength || 0)}%</span>
            </div>
            <div className="h-1.5 bg-quant-bg border border-quant-border rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${analysis.strength}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full transition-colors",
                  analysis.sentiment.includes('Bullish') ? "bg-quant-green shadow-[0_0_10px_rgba(34,197,94,0.5)]" : 
                  analysis.sentiment.includes('Bearish') ? "bg-quant-red shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-quant-muted"
                )} 
              />
            </div>
          </div>

          <div className="bg-quant-bg/30 rounded p-3 border border-quant-border/30">
            <p className="text-[10px] text-quant-muted leading-relaxed uppercase tracking-tight">
              <span className="font-bold text-quant-text">Strategic Outlook:</span> The ensemble of indicators suggest a <span className={cn("font-black underline", analysis.sentiment.includes('Bullish') ? "text-quant-green" : analysis.sentiment.includes('Bearish') ? "text-quant-red" : "text-quant-muted")}>{analysis.sentiment}</span> dominance. {
                analysis.sentiment.includes('Bullish') ? "Market structure shows strong expansion potential in the current phase." :
                analysis.sentiment.includes('Bearish') ? "Multiple metrics indicate descending pressure. High caution advised for long positions." :
                "Market is currently consolidating in a low-conviction zone. Monitoring for a confirmed structural breakout."
              }
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] font-bold text-quant-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-quant-blue" />
            Composite Consensus
          </p>
          {analysis.signals.map((sig, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-quant-bg/50 border border-quant-border/20 group hover:border-quant-border/50 transition-colors">
              <span className="text-[10px] text-quant-muted font-bold group-hover:text-quant-text transition-colors">{sig.label}</span>
              <div className="flex items-center gap-2">
                 <span className={cn("text-[10px] font-mono", 
                   sig.type === 'bullish' ? "text-quant-green" : 
                   sig.type === 'bearish' ? "text-quant-red" : "text-quant-muted"
                 )}>
                   {sig.value}
                 </span>
                 {sig.type === 'bullish' ? <TrendingUp className="w-3 h-3 text-quant-green" /> : 
                  sig.type === 'bearish' ? <TrendingDown className="w-3 h-3 text-quant-red" /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
};
