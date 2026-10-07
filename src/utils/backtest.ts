import { IndicatorData } from '../types';

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netProfit: number;
  maxDrawdown: number;
  trades: Trade[];
}

export interface Trade {
  type: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  profit: number;
  duration: number;
}

export function runBacktest(data: IndicatorData[]): BacktestResult {
  if (data.length < 50) {
    return { totalTrades: 0, winRate: 0, profitFactor: 0, netProfit: 0, maxDrawdown: 0, trades: [] };
  }

  const trades: Trade[] = [];
  let currentTrade: Partial<Trade> | null = null;

  for (let i = 20; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];

    // Signal Logic (Consensus Strategy)
    // Buy Signal: SuperTrend Up + MACD Crossover + RSI < 60
    const buySignal = 
      current.superTrend?.direction === 'up' && 
      current.macd && current.macd.macd > current.macd.signal &&
      prev.macd && prev.macd.macd <= prev.macd.signal &&
      current.rsi && current.rsi < 60;

    // Sell Signal: SuperTrend Down + MACD Crossunder + RSI > 40
    const sellSignal = 
      current.superTrend?.direction === 'down' &&
      current.macd && current.macd.macd < current.macd.signal &&
      prev.macd && prev.macd.macd >= prev.macd.signal &&
      current.rsi && current.rsi > 40;

    if (!currentTrade) {
      if (buySignal) {
        currentTrade = {
          type: 'long',
          entryPrice: current.close,
          entryTime: current.time
        };
      } else if (sellSignal) {
        currentTrade = {
          type: 'short',
          entryPrice: current.close,
          entryTime: current.time
        };
      }
    } else {
      // Exit Logic
      const exitLong = currentTrade.type === 'long' && (sellSignal || (current.rsi && current.rsi > 75));
      const exitShort = currentTrade.type === 'short' && (buySignal || (current.rsi && current.rsi < 25));

      if (exitLong || exitShort) {
        const profit = currentTrade.type === 'long' 
          ? (current.close - currentTrade.entryPrice!) / currentTrade.entryPrice!
          : (currentTrade.entryPrice! - current.close) / currentTrade.entryPrice!;
        
        trades.push({
          ...(currentTrade as Trade),
          exitPrice: current.close,
          exitTime: current.time,
          profit: profit * 100, // percentage
          duration: i - data.findIndex(d => d.time === currentTrade!.entryTime)
        });
        currentTrade = null;
      }
    }
  }

  const netProfit = trades.reduce((acc, t) => acc + t.profit, 0);
  const winners = trades.filter(t => t.profit > 0);
  const losers = trades.filter(t => t.profit <= 0);
  
  const winRate = trades.length > 0 ? (winners.length / trades.length) * 100 : 0;
  
  const grossProfit = winners.reduce((acc, t) => acc + t.profit, 0);
  const grossLoss = Math.abs(losers.reduce((acc, t) => acc + t.profit, 0));
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

  // Simple Max Drawdown calculation based on cumulative profit
  let maxDD = 0;
  let peak = 0;
  let cumulative = 0;
  trades.forEach(t => {
    cumulative += t.profit;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDD) maxDD = dd;
  });

  return {
    totalTrades: trades.length,
    winRate,
    profitFactor,
    netProfit,
    maxDrawdown: maxDD,
    trades
  };
}
