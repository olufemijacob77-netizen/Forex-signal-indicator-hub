import { PricePoint, IndicatorData } from '../types';
import { Decimal } from 'decimal.js';

export interface DeepSignal {
  type: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  probability: number;
  reasons: string[];
  levels?: {
    entry: number;
    tp: number;
    sl: number;
  };
}

export function getDeepConsensus(data: IndicatorData[]): DeepSignal {
  if (data.length < 2) return { type: 'hold', probability: 0, reasons: ['Insufficient data'] };
  
  const current = data[data.length - 1];
  const prev = data[data.length - 2];
  const reasons: string[] = [];
  let score = 0;

  // EMA/MA Alignment
  if (current.ema && current.ma) {
    if (current.close > current.ema && current.ema > current.ma) {
      score += 2;
      reasons.push('EMA/MA Golden Stack');
    } else if (current.close < current.ema && current.ema < current.ma) {
      score -= 2;
      reasons.push('EMA/MA Death Stack');
    }
  }

  // SuperTrend Confirmation
  if (current.superTrend) {
    if (current.superTrend.direction === 'up') {
      score += 2;
      reasons.push('SuperTrend Bullish State');
    } else {
      score -= 2;
      reasons.push('SuperTrend Bearish State');
    }
  }

  // MACD Momentum
  if (current.macd && prev.macd) {
    const isBullishCross = current.macd.macd > current.macd.signal && prev.macd.macd <= prev.macd.signal;
    const isBearishCross = current.macd.macd < current.macd.signal && prev.macd.macd >= prev.macd.signal;
    
    if (isBullishCross) {
      score += 3;
      reasons.push('Fresh MACD Bullish Crossover');
    } else if (isBearishCross) {
      score -= 3;
      reasons.push('Fresh MACD Bearish Crossover');
    } else if (current.macd.macd > current.macd.signal) {
      score += 1;
      reasons.push('MACD Trending Bullish');
    } else {
      score -= 1;
      reasons.push('MACD Trending Bearish');
    }
  }

  // RSI Overextension Check
  if (current.rsi) {
    if (current.rsi < 30) {
      score += 1.5;
      reasons.push('RSI Oversold Recovery Potential');
    } else if (current.rsi > 70) {
      score -= 1.5;
      reasons.push('RSI Overbought Exhaustion');
    }
  }

  // Final Classification
  let type: DeepSignal['type'] = 'hold';
  if (score >= 6) type = 'strong_buy';
  else if (score >= 2) type = 'buy';
  else if (score <= -6) type = 'strong_sell';
  else if (score <= -2) type = 'sell';

  const probability = Math.min(Math.abs(score) / 10 * 100, 100);

  // Calculate Trade Levels using dynamic volatility (ATR or BB width)
  let levels;
  if (type !== 'hold') {
    const entry = current.close;
    // Fallback ATR calculation if not present in current data
    const lastAtr = current.atr || (current.high - current.low);
    const stopDist = lastAtr * 2; // 2x ATR for Stop Loss
    const rewardDist = stopDist * 3; // 1:3 Risk/Reward

    if (type.includes('buy')) {
      levels = {
        entry,
        tp: entry + rewardDist,
        sl: entry - stopDist
      };
    } else {
      levels = {
        entry,
        tp: entry - rewardDist,
        sl: entry + stopDist
      };
    }
  }

  return { type, probability, reasons, levels };
}

export function calculateMA(data: PricePoint[], period: number): number[] {
  const mas: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      mas.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc.add(new Decimal(val.close)), new Decimal(0));
    mas.push(sum.div(period).toNumber());
  }
  return mas;
}

export function calculateEMA(data: PricePoint[], period: number): number[] {
  const emas: number[] = [];
  const k = new Decimal(2).div(period + 1);
  let ema = new Decimal(data[0].close);
  
  for (let i = 0; i < data.length; i++) {
    const close = new Decimal(data[i].close);
    // EMA = Price * k + Previous EMA * (1 - k)
    ema = close.mul(k).add(ema.mul(new Decimal(1).sub(k)));
    emas.push(ema.toNumber());
  }
  return emas;
}

export function calculateRSI(data: PricePoint[], period: number = 14): number[] {
  const rsis: number[] = [];
  const gains: Decimal[] = [];
  const losses: Decimal[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = new Decimal(data[i].close).sub(data[i - 1].close);
    gains.push(diff.gt(0) ? diff : new Decimal(0));
    losses.push(diff.lt(0) ? diff.abs() : new Decimal(0));
  }

  if (gains.length < period) return Array(data.length).fill(null);

  let avgGain = gains.slice(0, period).reduce((a, b) => a.add(b), new Decimal(0)).div(period);
  let avgLoss = losses.slice(0, period).reduce((a, b) => a.add(b), new Decimal(0)).div(period);

  for (let i = 0; i < period; i++) rsis.push(null);

  const calculateRsiValue = (gain: Decimal, loss: Decimal) => {
    if (loss.isZero()) return gain.isZero() ? 50 : 100;
    const rs = gain.div(loss);
    return new Decimal(100).sub(new Decimal(100).div(new Decimal(1).add(rs))).toNumber();
  };

  rsis.push(calculateRsiValue(avgGain, avgLoss));

  const dPeriod = new Decimal(period);
  const dSub1 = new Decimal(period - 1);

  for (let i = period + 1; i < data.length; i++) {
    const currentGain = gains[i - 1];
    const currentLoss = losses[i - 1];
    
    // Wilder's smoothing: (AvgGain * 13 + CurrentGain) / 14
    avgGain = avgGain.mul(dSub1).add(currentGain).div(dPeriod);
    avgLoss = avgLoss.mul(dSub1).add(currentLoss).div(dPeriod);
    
    rsis.push(calculateRsiValue(avgGain, avgLoss));
  }

  return rsis;
}

export function calculateMACD(data: PricePoint[], fast: number = 12, slow: number = 26, signalPeriod: number = 9): { macd: number; signal: number; histogram: number }[] {
  const emaFast = calculateEMA(data, fast);
  const emaSlow = calculateEMA(data, slow);
  const macdLine = emaFast.map((val, i) => new Decimal(val).sub(emaSlow[i]));
  
  // Calculate Signal Line (ema of MACD Line)
  const signalLine: number[] = [];
  const k = new Decimal(2).div(signalPeriod + 1);
  let signal = macdLine[0];

  for (let i = 0; i < macdLine.length; i++) {
    signal = macdLine[i].mul(k).add(signal.mul(new Decimal(1).sub(k)));
    signalLine.push(signal.toNumber());
  }

  return macdLine.map((val, i) => ({
    macd: val.toNumber(),
    signal: signalLine[i],
    histogram: val.sub(signalLine[i]).toNumber()
  }));
}

export function calculateBollingerBands(data: PricePoint[], period: number = 20, stdDev: number = 2) {
  const bands: { upper: number; middle: number; lower: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      bands.push({ upper: null, middle: null, lower: null });
      continue;
    }
    const chunk = data.slice(i - period + 1, i + 1).map(d => new Decimal(d.close));
    const mean = chunk.reduce((acc, val) => acc.add(val), new Decimal(0)).div(period);
    const variance = chunk.reduce((acc, val) => acc.add(val.sub(mean).pow(2)), new Decimal(0)).div(period);
    const sd = variance.sqrt();
    const dStdDev = new Decimal(stdDev);

    bands.push({
      upper: mean.add(dStdDev.mul(sd)).toNumber(),
      middle: mean.toNumber(),
      lower: mean.sub(dStdDev.mul(sd)).toNumber()
    });
  }
  return bands;
}

export function calculateFibonacci(high: number, low: number) {
  const diff = high - low;
  return {
    0: high,
    23.6: high - diff * 0.236,
    38.2: high - diff * 0.382,
    50: high - diff * 0.5,
    61.8: high - diff * 0.618,
    78.6: high - diff * 0.786,
    100: low
  };
}

export function findSupportResistance(data: PricePoint[]) {
  // Simple logic: find local minima and maxima
  const prices = data.map(d => d.close);
  const levels = [];
  for (let i = 5; i < prices.length - 5; i++) {
    const isLevel = (
      (prices[i] < prices[i - 1] && prices[i] < prices[i + 1] && prices[i] < prices[i - 2] && prices[i] < prices[i + 2]) ||
      (prices[i] > prices[i - 1] && prices[i] > prices[i + 1] && prices[i] > prices[i - 2] && prices[i] > prices[i + 2])
    );
    if (isLevel) {
      levels.push(prices[i]);
    }
  }
  // Group similar levels
  const grouped: number[] = [];
  levels.sort((a, b) => a - b);
  if (levels.length > 0) {
    let current = levels[0];
    let count = 1;
    for (let i = 1; i < levels.length; i++) {
      if (Math.abs(levels[i] - current) < 0.005) { // Sensitivity threshold
        current = (current * count + levels[i]) / (count + 1);
        count++;
      } else {
        if (count >= 2) grouped.push(current);
        current = levels[i];
        count = 1;
      }
    }
  }
  return [...new Set(grouped)].slice(-5); // Return the top 5 most relevant levels
}

export function calculateATR(data: PricePoint[], period: number = 14): number[] {
  const atrs: number[] = [];
  const trs: Decimal[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trs.push(new Decimal(data[i].high).sub(data[i].low));
    } else {
      const high = new Decimal(data[i].high);
      const low = new Decimal(data[i].low);
      const prevClose = new Decimal(data[i - 1].close);

      const tr = Decimal.max(
        high.sub(low),
        high.sub(prevClose).abs(),
        low.sub(prevClose).abs()
      );
      trs.push(tr);
    }
  }

  // Initial ATR is SMA of TRs
  if (trs.length < period) return Array(data.length).fill(null);
  
  let atr = trs.slice(0, period).reduce((a, b) => a.add(b), new Decimal(0)).div(period);
  for (let i = 0; i < period; i++) atrs.push(null);
  atrs[period - 1] = atr.toNumber();

  const dPeriod = new Decimal(period);
  const dSub1 = new Decimal(period - 1);

  for (let i = period; i < data.length; i++) {
    atr = atr.mul(dSub1).add(trs[i]).div(dPeriod);
    atrs.push(atr.toNumber());
  }

  return atrs;
}

export function calculateSuperTrend(data: PricePoint[], period: number = 10, multiplier: number = 3) {
  const atrs = calculateATR(data, period);
  const st: { value: number; direction: 'up' | 'down' }[] = [];
  
  let upperBand = new Decimal(0);
  let lowerBand = new Decimal(0);
  let trend: 'up' | 'down' = 'up';
  
  for (let i = 0; i < data.length; i++) {
    if (i < period || atrs[i] === null) {
      st.push({ value: null, direction: 'up' });
      continue;
    }
    
    const mid = new Decimal(data[i].high).add(data[i].low).div(2);
    const atr = new Decimal(atrs[i]);
    const dMultiplier = new Decimal(multiplier);
    
    let basicUpperBand = mid.add(dMultiplier.mul(atr));
    let basicLowerBand = mid.sub(dMultiplier.mul(atr));
    
    const prevClose = new Decimal(data[i - 1].close);
    
    // Final Upper Band
    if (basicUpperBand.lt(upperBand) || prevClose.gt(upperBand)) {
      upperBand = basicUpperBand;
    }
    
    // Final Lower Band
    if (basicLowerBand.gt(lowerBand) || prevClose.lt(lowerBand)) {
      lowerBand = basicLowerBand;
    }
    
    const close = new Decimal(data[i].close);

    // Trend direction
    if (trend === 'up' && close.lt(lowerBand)) {
      trend = 'down';
    } else if (trend === 'down' && close.gt(upperBand)) {
      trend = 'up';
    }
    
    st.push({
      value: (trend === 'up' ? lowerBand : upperBand).toNumber(),
      direction: trend
    });
  }
  
  return st;
}

export function calculateElliottWaves(data: PricePoint[]) {
  // Simplified heuristic for Elliott Wave detection
  // 1. Find local extrema
  const motive: { index: number; price: number; label: string }[] = [];
  const corrective: { index: number; price: number; label: string }[] = [];
  const rules: { name: string; pass: boolean }[] = [];
  
  if (data.length < 50) return { motive: [], corrective: [], confidence: 0, rules: [] };

  const prices = data.map(d => d.close);
  const extrema: { index: number; price: number; type: 'peak' | 'trough' }[] = [];

  for (let i = 10; i < prices.length - 10; i++) {
    const window = prices.slice(i - 10, i + 11);
    const current = prices[i];
    if (current === Math.max(...window)) {
      extrema.push({ index: i, price: current, type: 'peak' });
    } else if (current === Math.min(...window)) {
      extrema.push({ index: i, price: current, type: 'trough' });
    }
  }

  // Filter overlapping extrema types
  const filteredExtrema: typeof extrema = [];
  for (const e of extrema) {
    if (filteredExtrema.length === 0 || filteredExtrema[filteredExtrema.length - 1].type !== e.type) {
      filteredExtrema.push(e);
    } else {
      const prev = filteredExtrema[filteredExtrema.length - 1];
      if ((e.type === 'peak' && e.price > prev.price) || (e.type === 'trough' && e.price < prev.price)) {
        filteredExtrema[filteredExtrema.length - 1] = e;
      }
    }
  }

  const lastExtrema = filteredExtrema.slice(-8);
  if (lastExtrema.length === 8) {
    const motiveIndices = [0, 1, 2, 3, 4];
    const correctiveIndices = [5, 6, 7];

    motiveIndices.forEach((idx, i) => {
      motive.push({
        index: lastExtrema[idx].index,
        price: lastExtrema[idx].price,
        label: (i + 1).toString()
      });
    });

    correctiveIndices.forEach((idx, i) => {
      corrective.push({
        index: lastExtrema[idx].index,
        price: lastExtrema[idx].price,
        label: String.fromCharCode(65 + i)
      });
    });

    // Simple Elliott Rule Engine
    const w1 = lastExtrema[0];
    const w2 = lastExtrema[1];
    const w3 = lastExtrema[2];
    const w4 = lastExtrema[3];
    const w5 = lastExtrema[4];

    // Rule 1: Wave 2 never retraces more than 100% of Wave 1
    const r1 = Math.abs(w2.price - w1.price) < Math.abs(w1.price - (filteredExtrema.at(-9)?.price || data[0].close));
    rules.push({ name: "Wave 2 Retracement Safe", pass: r1 });

    // Rule 2: Wave 3 is never the shortest
    const len1 = Math.abs(w1.price - (filteredExtrema.at(-9)?.price || data[0].close));
    const len3 = Math.abs(w3.price - w2.price);
    const len5 = Math.abs(w5.price - w4.price);
    const r2 = len3 > Math.min(len1, len5);
    rules.push({ name: "Wave 3 Impulse Strong", pass: r2 });

    // Rule 3: Wave 4 never enters Wave 1 territory (Strict)
    const r3 = w4.type === 'trough' ? w4.price > w1.price : w4.price < w1.price;
    rules.push({ name: "Wave 4 Territory Gap", pass: r3 });
  }

  const confidence = (rules.filter(r => r.pass).length / 3) * 100;

  return { motive, corrective, confidence, rules };
}
