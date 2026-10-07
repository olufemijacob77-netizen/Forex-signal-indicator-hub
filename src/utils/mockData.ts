import { PricePoint } from '../types';
import { subMinutes, format } from 'date-fns';

export function generateMockData(count: number = 100): PricePoint[] {
  let currentPrice = 1.0850;
  const data: PricePoint[] = [];
  const now = new Date();

  for (let i = count; i > 0; i--) {
    const change = (Math.random() - 0.5) * 0.002;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 0.0005;
    const low = Math.min(open, close) - Math.random() * 0.0005;
    
    data.push({
      time: format(subMinutes(now, i * 5), 'HH:mm'),
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.floor(Math.random() * 1000) + 500
    });
    
    currentPrice = close;
  }
  
  return data;
}
