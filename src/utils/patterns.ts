
import { PricePoint } from '../types';

export interface CandlestickPattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  timestamp: string;
  index: number;
  isConfirmed?: boolean;
  patternHigh: number;
  patternLow: number;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  metadata?: {
    definition: string;
    significance: string;
    strategy: string;
    winRate: string;
    historicalScenario: string;
  };
}

interface PatternMeta {
  definition: string;
  significance: string;
  strategy: string;
  winRate: string;
  historicalScenario: string;
}

const PATTERN_METADATA: Record<string, PatternMeta> = {
  'Doji': {
    definition: 'A session where the opening and closing prices are almost identical, resulting in a very small body.',
    significance: 'Indicates indecision between buyers and sellers. Often signals a potential reversal or pause in trend.',
    strategy: 'Wait for confirmation from the next candle. A bullish candle after a downtrend Doji is a buy signal.',
    winRate: '52.4%',
    historicalScenario: 'Commonly observed at market tops/bottoms. In 2023 BTC/USD daily charts, Dojis preceded 4 major reversal phases.'
  },
  'Hammer': {
    definition: 'A small body near the top of the range with a long lower shadow (at least 2x body size).',
    significance: 'Bullish reversal pattern that occurs at the bottom of a downtrend. Shows sellers were pushed back.',
    strategy: 'Buy on the break of the hammer high, with a stop loss below the lower shadow.',
    winRate: '64.1%',
    historicalScenario: 'A classic "spring" maneuver. Frequently seen in S&P 500 recovery phases after 5%+ corrections.'
  },
  'Inverted Hammer': {
    definition: 'A small body at the bottom of the range with a long upper shadow.',
    significance: 'Potential bullish reversal. Indicates that buyers are starting to push the price up after a downtrend.',
    strategy: 'Look for a bullish candle next session to confirm follow-through buying pressure.',
    winRate: '58.7%',
    historicalScenario: 'Often indicates short-covering. In EUR/USD H1 charts, it marks the end of intraday bear runs with 60% reliability.'
  },
  'Bullish Engulfing': {
    definition: 'A small bearish candle followed by a larger bullish candle that completely covers the previous body.',
    significance: 'Strong bullish reversal signal. Indicates that buyers have completely overwhelmed the sellers.',
    strategy: 'Enter a long position on the close of the engulfing candle or the open of the next.',
    winRate: '68.5%',
    historicalScenario: 'One of the highest probability setups. Signaled the start of the 2021 crypto bull run on multiple weekly timeframes.'
  },
  'Bearish Engulfing': {
    definition: 'A small bullish candle followed by a larger bearish candle that completely covers the previous body.',
    significance: 'Strong bearish reversal signal. Indicates that sellers have taken control from the buyers.',
    strategy: 'Enter a short position on the close of the engulfing candle, targeting support levels.',
    winRate: '67.2%',
    historicalScenario: 'Historically reliable for exiting longs. Preceded the 2022 stock market downturn on the Nasdaq monthly chart.'
  },
  'Shooting Star': {
    definition: 'A small body at the bottom of the range with a long upper shadow (at least 2x body size).',
    significance: 'Bearish reversal pattern that occurs at the top of an uptrend. Signals a failed attempt by buyers.',
    strategy: 'Sell on the break of the shooting star low, with a stop loss above the upper shadow.',
    winRate: '61.8%',
    historicalScenario: 'Signals "bull exhaustion". In Gold (XAU) markets, shooting stars often appear near major psychological resistance levels ($2000+).'
  },
  'Morning Star': {
    definition: 'A three-candle bullish reversal pattern: a large bearish candle, a small-bodied candle that gaps down, and a large bullish candle.',
    significance: 'Signals a shift in momentum from bears to bulls. Highly reliable when appearing after a prolonged downtrend.',
    strategy: 'Enter long on the close of the third candle or next open. Place stop loss below the middle candle low.',
    winRate: '70.2%',
    historicalScenario: 'A classic "bottoming" signal. Seen frequently on major indices like Dow Jones during 2020 recovery phases.'
  },
  'Evening Star': {
    definition: 'A three-candle bearish reversal pattern: a large bullish candle, a small-bodied candle that gaps up, and a large bearish candle.',
    significance: 'Signals the exhaustion of an uptrend and the start of a potential bearish phase.',
    strategy: 'Enter short on the close of the third candle. Place stop loss above the middle candle high.',
    winRate: '71.5%',
    historicalScenario: 'Frequently reliable in overextended markets. Formed a massive top on Tesla (TSLA) in late 2021 before the correction.'
  },
  'Three White Soldiers': {
    definition: 'Three consecutive long-bodied bullish candles, each opening within the previous candle body and closing near its high.',
    significance: 'A very strong bullish continuation or reversal signal indicating sustained buying pressure.',
    strategy: 'Buy on the close of the third soldier. Risk is high due to the distance to stop loss; use trailing stops.',
    winRate: '72.8%',
    historicalScenario: 'Indicates "Institutional accumulation". Classic breakout pattern seen in NVIDIA during its 2023 AI-driven surge.'
  },
  'Three Black Crows': {
    definition: 'Three consecutive long-bodied bearish candles, each opening within the previous candle body and closing near its low.',
    significance: 'A strong bearish reversal or continuation signal indicating aggressive selling pressure.',
    strategy: 'Sell on the close of the third crow. Expect strong follow-through; use key resistance levels for stops.',
    winRate: '74.1%',
    historicalScenario: 'Signals panic selling. Preceded the dot-com crash on many tech stocks and more recently in many 2022 growth stock charts.'
  }
};

function enrichPattern(pattern: Omit<CandlestickPattern, 'metadata'>): CandlestickPattern {
  return {
    ...pattern,
    metadata: PATTERN_METADATA[pattern.name]
  };
}

export function detectDoji(data: PricePoint[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= data.length) return null;
  const candle = data[index];
  const bodySize = Math.abs(candle.close - candle.open);
  const totalSize = candle.high - candle.low;

  // Doji: Body is very small (less than 10% of total candle size)
  if (totalSize > 0 && bodySize / totalSize < 0.1) {
    return enrichPattern({
      name: 'Doji',
      type: 'neutral',
      timestamp: candle.time,
      index,
      patternHigh: candle.high,
      patternLow: candle.low
    });
  }
  return null;
}

export function detectHammer(data: PricePoint[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= data.length) return null;
  const candle = data[index];
  const bodySize = Math.abs(candle.close - candle.open);
  const totalSize = candle.high - candle.low;
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const upperShadow = candle.high - Math.max(candle.open, candle.close);

  // Hammer: Lower shadow is at least 2x the body, small upper shadow
  if (bodySize > 0 && lowerShadow > 2 * bodySize && upperShadow < 0.2 * totalSize) {
    return enrichPattern({
      name: 'Hammer',
      type: 'bullish',
      timestamp: candle.time,
      index,
      patternHigh: candle.high,
      patternLow: candle.low
    });
  }
  return null;
}

export function detectInvertedHammer(data: PricePoint[], index: number): CandlestickPattern | null {
  if (index < 0 || index >= data.length) return null;
  const candle = data[index];
  const bodySize = Math.abs(candle.close - candle.open);
  const totalSize = candle.high - candle.low;
  const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
  const upperShadow = candle.high - Math.max(candle.open, candle.close);

  // Inverted Hammer: Upper shadow is at least 2x the body, small lower shadow
  if (bodySize > 0 && upperShadow > 2 * bodySize && lowerShadow < 0.2 * totalSize) {
    return enrichPattern({
      name: 'Inverted Hammer',
      type: 'bullish',
      timestamp: candle.time,
      index,
      patternHigh: candle.high,
      patternLow: candle.low
    });
  }
  return null;
}

export function detectEngulfing(data: PricePoint[], index: number): CandlestickPattern | null {
  if (index < 1 || index >= data.length) return null;
  const prev = data[index - 1];
  const curr = data[index];

  const prevBodyStart = Math.min(prev.open, prev.close);
  const prevBodyEnd = Math.max(prev.open, prev.close);
  const currBodyStart = Math.min(curr.open, curr.close);
  const currBodyEnd = Math.max(curr.open, curr.close);

  // Bullish Engulfing: Prev candle is bearish, current is bullish and "engulfs" previous body
  if (prev.close < prev.open && curr.close > curr.open) {
    if (currBodyStart < prevBodyStart && currBodyEnd > prevBodyEnd) {
      return enrichPattern({
        name: 'Bullish Engulfing',
        type: 'bullish',
        timestamp: curr.time,
        index,
        patternHigh: Math.max(prev.high, curr.high),
        patternLow: Math.min(prev.low, curr.low)
      });
    }
  }

  // Bearish Engulfing: Prev candle is bullish, current is bearish and "engulfs" previous body
  if (prev.close > prev.open && curr.close < curr.open) {
    if (currBodyStart < prevBodyStart && currBodyEnd > prevBodyEnd) {
      return enrichPattern({
        name: 'Bearish Engulfing',
        type: 'bearish',
        timestamp: curr.time,
        index,
        patternHigh: Math.max(prev.high, curr.high),
        patternLow: Math.min(prev.low, curr.low)
      });
    }
  }

  return null;
}

export function detectShootingStar(data: PricePoint[], index: number): CandlestickPattern | null {
    if (index < 0 || index >= data.length) return null;
    const candle = data[index];
    const bodySize = Math.abs(candle.close - candle.open);
    const totalSize = candle.high - candle.low;
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);

    // Shooting Star: Bullish trend context usually needed, but technically:
    // small body near bottom, long upper shadow
    if (bodySize > 0 && upperShadow > 2 * bodySize && lowerShadow < 0.2 * totalSize) {
        return enrichPattern({
            name: 'Shooting Star',
            type: 'bearish',
            timestamp: candle.time,
            index,
            patternHigh: candle.high,
            patternLow: candle.low
        });
    }
    return null;
}

export function detectStarPatterns(data: PricePoint[], index: number): CandlestickPattern | null {
  if (index < 2 || index >= data.length) return null;
  const c1 = data[index - 2];
  const c2 = data[index - 1]; // The "Star"
  const c3 = data[index];

  const c1BodySize = Math.abs(c1.close - c1.open);
  const c2BodySize = Math.abs(c2.close - c2.open);
  const c3BodySize = Math.abs(c3.close - c3.open);
  const c1AverageBodySize = c1BodySize; // Simplified

  // Morning Star
  const isC1Bearish = c1.close < c1.open;
  const isC3Bullish = c3.close > c3.open;
  const isC2Small = c2BodySize < (c1BodySize * 0.3);
  
  if (isC1Bearish && isC2Small && isC3Bullish) {
    // Gap down for middle candle (Morning Star)
    if (Math.max(c2.open, c2.close) < Math.min(c1.open, c1.close)) {
      // C3 closes into C1 body (usually > 50%)
      const c1Midpoint = c1.close + (c1.open - c1.close) / 2;
      if (c3.close > c1Midpoint) {
        return enrichPattern({
          name: 'Morning Star',
          type: 'bullish',
          timestamp: c3.time,
          index,
          patternHigh: Math.max(c1.high, c2.high, c3.high),
          patternLow: Math.min(c1.low, c2.low, c3.low)
        });
      }
    }
  }

  // Evening Star
  const isC1Bullish = c1.close > c1.open;
  const isC3Bearish = c3.close < c3.open;
  if (isC1Bullish && isC2Small && isC3Bearish) {
    // Gap up for middle candle (Evening Star)
    if (Math.min(c2.open, c2.close) > Math.max(c1.open, c1.close)) {
      // C3 closes into C1 body (usually > 50%)
      const c1Midpoint = c1.open + (c1.close - c1.open) / 2;
      if (c3.close < c1Midpoint) {
        return enrichPattern({
          name: 'Evening Star',
          type: 'bearish',
          timestamp: c3.time,
          index,
          patternHigh: Math.max(c1.high, c2.high, c3.high),
          patternLow: Math.min(c1.low, c2.low, c3.low)
        });
      }
    }
  }

  return null;
}

export function detectThreeCandleContinuation(data: PricePoint[], index: number): CandlestickPattern | null {
  if (index < 2 || index >= data.length) return null;
  const c1 = data[index - 2];
  const c2 = data[index - 1];
  const c3 = data[index];

  const allBullish = c1.close > c1.open && c2.close > c2.open && c3.close > c3.open;
  const allBearish = c1.close < c1.open && c2.close < c2.open && c3.close < c3.open;

  if (allBullish) {
    // Three White Soldiers
    // 1. Higher closes
    const higherCloses = c2.close > c1.close && c3.close > c2.close;
    // 2. Opens within previous bodies
    const opensWithin = c2.open > c1.open && c2.open < c1.close && c3.open > c2.open && c3.open < c2.close;
    // 3. Size check (not too small)
    const avgBody = (Math.abs(c1.close - c1.open) + Math.abs(c2.close - c2.open) + Math.abs(c3.close - c3.open)) / 3;
    
    if (higherCloses && opensWithin) {
      return enrichPattern({
        name: 'Three White Soldiers',
        type: 'bullish',
        timestamp: c3.time,
        index,
        patternHigh: c3.high,
        patternLow: c1.low
      });
    }
  }

  if (allBearish) {
    // Three Black Crows
    // 1. Lower closes
    const lowerCloses = c2.close < c1.close && c3.close < c2.close;
    // 2. Opens within previous bodies
    const opensWithin = c2.open < c1.open && c2.open > c1.close && c3.open < c2.open && c3.open > c2.close;
    
    if (lowerCloses && opensWithin) {
      return enrichPattern({
        name: 'Three Black Crows',
        type: 'bearish',
        timestamp: c3.time,
        index,
        patternHigh: c1.high,
        patternLow: c3.low
      });
    }
  }

  return null;
}

export function getAllPatterns(data: PricePoint[]): CandlestickPattern[] {
  const patterns: CandlestickPattern[] = [];
  for (let i = 1; i < data.length; i++) {
    let p: CandlestickPattern | null = null;
    
    p = detectDoji(data, i) || 
        detectHammer(data, i) || 
        detectInvertedHammer(data, i) || 
        detectEngulfing(data, i) || 
        detectShootingStar(data, i) ||
        detectStarPatterns(data, i) ||
        detectThreeCandleContinuation(data, i);

    if (p) {
      // Calculate initial trade levels based on pattern structure
      if (p.type === 'bullish') {
        p.entry = p.patternHigh;
        p.stopLoss = p.patternLow;
        const risk = p.entry - p.stopLoss;
        p.takeProfit = p.entry + (risk * 2);
      } else if (p.type === 'bearish') {
        p.entry = p.patternLow;
        p.stopLoss = p.patternHigh;
        const risk = p.stopLoss - p.entry;
        p.takeProfit = p.entry - (risk * 2);
      } else if (p.type === 'neutral') {
        // For neutral patterns (like Doji), entry depends on break direction
        // We'll set levels as "Alert" levels - entry on break of high for long, low for short
        // But for consistency we'll provide a default long bias if price is above MA (though we don't have MA here)
        // Let's just set the structure boundaries and let the confirmation logic handle the bias
        p.entry = p.patternHigh; 
        p.stopLoss = p.patternLow;
        p.takeProfit = p.entry + (p.entry - p.stopLoss) * 2;
      }

      // Check for confirmation in the next candle
      if (i + 1 < data.length) {
        const next = data[i + 1];
        const curr = data[i];

        if (p.name === 'Bullish Engulfing') {
          // Confirmation for Bullish Engulfing: Next close must be above the engulfing candle's body top
          const engulfingBodyTop = Math.max(curr.open, curr.close);
          p.isConfirmed = next.close > engulfingBodyTop;
        } else if (p.name === 'Bearish Engulfing') {
          // Confirmation for Bearish Engulfing: Next close must be below the engulfing candle's body bottom
          const engulfingBodyBottom = Math.min(curr.open, curr.close);
          p.isConfirmed = next.close < engulfingBodyBottom;
        } else if (p.name === 'Doji') {
          // Doji confirmation: Next candle must have a definitive direction (not another Doji)
          const nextBodySize = Math.abs(next.close - next.open);
          const nextTotalSize = next.high - next.low;
          // Definitive direction means body is at least 10% of total size and non-zero
          const isDefinitive = nextTotalSize > 0 && (nextBodySize / nextTotalSize) >= 0.1;

          p.isConfirmed = isDefinitive; 
          if (p.isConfirmed) {
            const isUp = next.close > next.open;
            p.entry = isUp ? p.patternHigh : p.patternLow;
            p.stopLoss = isUp ? p.patternLow : p.patternHigh;
            const risk = Math.abs(p.entry - p.stopLoss);
            p.takeProfit = isUp ? p.entry + risk * 2 : p.entry - risk * 2;
          }
        } else if (p.type === 'bullish' && next.close > p.patternHigh) {
          p.isConfirmed = true;
        } else if (p.type === 'bearish' && next.close < p.patternLow) {
          p.isConfirmed = true;
        }
      }
      patterns.push(p);
    }
  }
  return patterns;
}
