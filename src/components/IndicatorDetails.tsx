import React from 'react';
import { IndicatorType } from '../types';
import { Info, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';

interface Props {
  type: IndicatorType;
}

export const IndicatorDetails: React.FC<Props> = ({ type }) => {
  const content = {
    MA: {
      title: "Moving Averages",
      code: "EMA",
      description: "A Moving Average smooths out price data by creating a constantly updated average price. It helps identify the trend direction and potential support/resistance levels.",
      usage: [
        { title: "Directional Trend", detail: "If the price is above the MA, the trend is generally considered up. If below, the trend is down." },
        { title: "Dynamic Support", detail: "EMA 20, 50, and 200 acting as hidden floors or ceilings where price tends to bounce." },
        { title: "Signal Crossovers", detail: "Bullish 'Golden Cross' occurs when short-term MA crosses above long-term MA." }
      ],
      example: "In a bullish market, the 50 EMA acts as a dynamic floor where price bounces off during pullbacks."
    },
    RSI: {
      title: "Relative Strength Index",
      code: "RSI",
      description: "RSI is a momentum oscillator that measures the speed and change of price movements. Developed by J. Welles Wilder, it fluctuates between zero and 100.",
      usage: [
        { title: "Overbought Level (70+)", detail: "Indicates asset price has likely reached peak valuation in the short term." },
        { title: "Oversold Level (30-)", detail: "Suggests the security has been sold off too hard and may be ripe for a rally." },
        { title: "Convergence/Divergence", detail: "When price makes a higher high but RSI makes a lower high, a reversal is imminent." }
      ],
      example: "EUR/USD drops quickly and RSI hits 25, indicating oversold status and potential corrective rally."
    },
    MACD: {
      title: "Convergence Divergence",
      code: "MACD",
      description: "MACD follows the trend and shows the relationship between two moving averages of a security's price.",
      usage: [
        { title: "MACD Line Crossing", detail: "A bullish signal occurs when the MACD crosses above its signal line." },
        { title: "Centerline Crossover", detail: "Crossing above 0 confirms bullish trend; below 0 confirms bearishness." },
        { title: "Momentum Histogram", detail: "Visualizes the distance between the MACD and its signal line." }
      ],
      example: "A MACD crossover below the zero line signals a strong buying opportunity as momentum shifts."
    },
    BB: {
      title: "Bollinger Bands",
      code: "Bands",
      description: "Bollinger Bands consist of a middle band (SMA) and two outer bands (standard deviations) measuring volatility.",
      usage: [
        { title: "Volatility Squeeze", detail: "Tightening bands suggest low volatility and an imminent sharp price breakout." },
        { title: "Band Walking", detail: "Price staying outside bands indicates a persistent and strong trend." },
        { title: "Mean Reversion", detail: "Price tends to return to the middle SMA after hitting extreme outer bands." }
      ],
      example: "During high-impact news, bands expand rapidly, showing increased market uncertainty."
    },
    FIB: {
      title: "Fibonacci Retracement",
      code: "FIB",
      description: "Mathematical tools used to identify potential areas of support and resistance based on the golden ratio sequence.",
      usage: [
        { title: "Golden Ratio (61.8%)", detail: "Considered the 'sweet spot' for high-probability trend continuations." },
        { title: "Retracement Depths", detail: "23.6%, 38.2%, and 50.0% levels serve as primary entry points during pullbacks." },
        { title: "Counter-Trend Exhaustion", detail: "Levels indicate where corrective moves might lose power." }
      ],
      example: "After a 100-pip rally, price retraces exactly 61.8 pips before resuming the bullish move."
    },
    SR: {
      title: "Support & Resistance",
      code: "S/R",
      description: "The most fundamental concept in technical analysis. Supply and demand zones that create price floors and ceilings.",
      usage: [
        { title: "Role Reversal", detail: "Broken resistance often becomes new support, validating a breakout." },
        { title: "Psychological round numbers", detail: "Levels like 1.1000 or 1.2000 act as natural magnets for price action." },
        { title: "Pivot Point Clusters", detail: "Areas where multiple time-frame levels overlap creating high friction zones." }
      ],
      example: "GBP/USD fails to break 1.2800 multiple times, establishing it as a massive resistance barrier."
    },
    SUPER: {
      title: "SuperTrend",
      code: "ST",
      description: "SuperTrend is a trend-following indicator based on Average True Range (ATR). It provides clear signals for trend switches and acts as a dynamic trailing stop.",
      usage: [
        { title: "Trend Confirmation", detail: "When ST flips below price (Green), it confirms a bullish trend. Above price (Red) confirms bearishness." },
        { title: "Trailing Stop-Loss", detail: "The ST line itself serves as an optimal level for placing stop-loss orders in an active trade." },
        { title: "Signal Reliability", detail: "Combining ST with RSI or MACD filters out noise and increases the probability of catching major moves." }
      ],
      example: "After a long consolidation, the ST flips below price, signaling a breakout that lasts for multiple periods."
    },
    ELLIOTT: {
      title: "Elliott Wave Theory",
      code: "EW",
      description: "A profound framework for understanding market cycles through fractal wave patterns. It suggests that collective investor psychology moves between optimism and pessimism in recurring sequences. Our engine scans for motive waves that drive the trend and corrective waves that rebalance it.",
      usage: [
        { title: "Motive Waves (1-2-3-4-5)", detail: "The 'Engine' of the trend. Waves 1, 3, and 5 move with the trend, while 2 and 4 are pullbacks. Wave 3 is almost always the strongest and longest phase." },
        { title: "Rule of Alternation", detail: "If Wave 2 is a sharp price correction, expect Wave 4 to be a sideways time correction (range-bound), and vice versa." },
        { title: "The Three Unbreakable Rules", detail: "1. Wave 2 never retraces more than 100% of Wave 1. 2. Wave 3 is never the shortest. 3. Wave 4 never overlaps Wave 1 territory." },
        { title: "Corrective ABC Zigzags", detail: "Following a 5-wave impulsive surge, the market naturally settles into a 3-wave correction to absorb the move before next expansion." }
      ],
      example: "Market has completed a clear 5-wave impulse. We are currently in Wave B of a corrective A-B-C, signaling one last dip (Wave C) before a potential major long entry."
    },
    ALL: {
      title: "Full Tech-Stack Analysis",
      code: "ENSEMBLE",
      description: "A comprehensive analysis mode that combines trend, momentum, volatility, and historical price levels into a single coherent market view.",
      usage: [
        { title: "Confluence Scanning", detail: "Looking for points where multiple indicators (e.g., RSI oversold + Fib 61.8%) align to increase probability." },
        { title: "Multi-Timeframe Sync", detail: "Confirming signals across various metrics to filter out market noise." },
        { title: "Advanced Interpretation", detail: "Our engine synthesizes these inputs to provide a real-time sentiment score." }
      ],
      example: "When EMA, RSI, and MACD all signal the same direction, trade probability increases significantly."
    },
    DEPTH: {
      title: "Market Depth (L2)",
      code: "DEPTH",
      description: "Visualizes the order book's liquidity by showing the pending bid (buy) and ask (sell) volume at various price levels. It provides a real-time view of market supply and demand imbalance.",
      usage: [
        { title: "Buy/Sell Walls", detail: "Large volume concentrations at specific prices indicate potential strong support (Bids) or resistance (Asks)." },
        { title: "Order Imbalance", detail: "Significant volume differences between bids and asks can signal the likely next direction of price movement." },
        { title: "Slippage Prediction", detail: "Thin liquidity suggests higher potential for price gaps and slippage during volatile periods." }
      ],
      example: "A massive sell wall appears just above current price, suggesting high resistance and potential downward pressure."
    }
  }[type];

  if (!content) return null;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-baseline space-x-3">
        <h1 className="text-2xl font-light text-quant-text">{content.title} <span className="text-quant-green font-bold">{content.code}</span></h1>
        <span className="text-[10px] border border-quant-border px-2 py-0.5 rounded text-quant-muted uppercase font-mono">technical.analysis</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        <div className="flex flex-col space-y-4">
          <div className="bg-quant-surface p-5 border border-quant-border rounded">
            <h3 className="text-[11px] font-bold text-quant-green uppercase mb-3 tracking-widest">Technical Explanation</h3>
            <p className="text-xs text-quant-muted leading-relaxed">
              {content.description}
            </p>
          </div>
          
          <div className="bg-quant-surface p-5 border border-quant-border rounded flex-1">
            <h3 className="text-[11px] font-bold text-quant-green uppercase mb-3 tracking-widest">Market Interpretation</h3>
            <ul className="space-y-4">
              {content.usage.map((point, i) => (
                <li key={i} className="flex items-start">
                  <div className="h-4 w-4 bg-quant-green/20 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <div className="h-1.5 w-1.5 bg-quant-green rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-quant-text">{point.title}</p>
                    <p className="text-[10px] text-quant-muted leading-tight">{point.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-quant-surface p-5 border border-quant-border rounded">
            <h3 className="text-[11px] font-bold text-quant-blue uppercase mb-3 tracking-widest">Scenario Analysis</h3>
            <p className="text-[10px] text-quant-muted italic leading-relaxed border-l-2 border-quant-blue/30 pl-3">
              "{content.example}"
            </p>
          </div>

          <div className="p-5 border border-quant-green/30 bg-quant-green/5 rounded">
            <p className="text-[11px] font-bold text-quant-text uppercase tracking-tight mb-2">Trading Recommendation</p>
            <p className="text-[10px] text-quant-muted leading-relaxed">
              Identify {content.title} confluences with price action. Enter on confirmation candles and keep stop-losses beyond recently validated levels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
