export interface PricePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData extends PricePoint {
  ma?: number;
  ema?: number;
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
  superTrend?: {
    value: number;
    direction: 'up' | 'down';
  };
  atr?: number;
  elliottWaves?: {
    motive: { index: number; price: number; label: string }[];
    corrective: { index: number; price: number; label: string }[];
    confidence: number;
    rules: { name: string; pass: boolean }[];
  };
}

export type IndicatorType = 'MA' | 'MACD' | 'RSI' | 'BB' | 'FIB' | 'SR' | 'SUPER' | 'ELLIOTT' | 'DEPTH' | 'ALL';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export interface Alert {
  id: string;
  symbol: string;
  level?: number;
  condition: 'above' | 'below' | 'pattern';
  patternType?: 'bullish' | 'bearish' | 'any';
  patternName?: string;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
}

export interface IndicatorSettings {
  ma: { period: number; enabled: boolean };
  ema: { period: number; enabled: boolean };
  rsi: { period: number; enabled: boolean };
  macd: { fast: number; slow: number; signal: number; enabled: boolean };
  bb: { period: number; stdDev: number; enabled: boolean };
  superTrend: { period: number; multiplier: number; enabled: boolean };
  elliott: { enabled: boolean };
  fib: { enabled: boolean };
  sr: { enabled: boolean };
  patterns: { enabled: boolean };
  depth: { enabled: boolean };
}

export interface FibonacciLevelConfig {
  value: number;
  label: string;
  enabled: boolean;
  color?: string;
}

export interface FibonacciSettings {
  levels: FibonacciLevelConfig[];
  showLabels: boolean;
  customRange?: {
    high: number;
    low: number;
  };
  timeZones?: {
    enabled: boolean;
    startIndex: number;
  };
}

export interface Position {
  id: string;
  symbol: string;
  label: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  qty: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  margin: number;
  pnl: number;
  timestamp: string;
}

export interface TradeHistory {
  id: string;
  symbol: string;
  label: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  exitReason: 'MANUAL' | 'TP' | 'SL';
  timestamp: string;
}
