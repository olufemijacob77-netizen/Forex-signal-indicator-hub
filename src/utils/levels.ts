import { PricePoint } from '../types';

export interface SRLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  isMajor: boolean;
}

/**
 * Detect Key Support and Resistance levels
 * Logic: 
 * 1. Find local pivots (highs and lows) with multiple windows for granularity
 * 2. Group them where prices are close using range-aware thresholding
 * 3. Classify based on location relative to current price
 * 4. Tag major levels based on cluster density
 */
export const detectLevels = (data: PricePoint[]): SRLevel[] => {
  if (data.length < 20) return [];

  const highs: number[] = [];
  const lows: number[] = [];
  const lastPrice = data[data.length - 1].close;

  // 1. Find local pivots with windows of 3, 5, and 10 to catch different level significances
  const windows = [3, 5, 10];
  
  for (const win of windows) {
    for (let i = win; i < data.length - win; i++) {
      const current = data[i];
      
      // Local High
      let isHigh = true;
      for (let j = 1; j <= win; j++) {
        if (data[i - j].high > current.high || data[i + j].high > current.high) {
          isHigh = false;
          break;
        }
      }
      if (isHigh) highs.push(current.high);

      // Local Low
      let isLow = true;
      for (let j = 1; j <= win; j++) {
        if (data[i - j].low < current.low || data[i + j].low < current.low) {
          isLow = false;
          break;
        }
      }
      if (isLow) lows.push(current.low);
    }
  }

  // 2. Cluster pivots
  const allPrices = data.map(d => d.close);
  const range = Math.max(...allPrices) - Math.min(...allPrices);
  const threshold = range * 0.015; // Tightened to 1.5% for better precision

  const groupLevels = (prices: number[]): SRLevel[] => {
    const sorted = [...prices].sort((a, b) => a - b);
    const groups: number[][] = [];
    
    if (sorted.length === 0) return [];
    
    let currentGroup = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        // Dynamic threshold adjustment: closer clusters reinforce level
      if (sorted[i] - sorted[i - 1] < threshold) {
        currentGroup.push(sorted[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
      }
    }
    groups.push(currentGroup);

    return groups
      .filter(g => g.length >= 2) // Must be hit at least twice
      .map(g => {
        const price = g.reduce((sum, val) => sum + val, 0) / g.length;
        return {
          price,
          type: price > lastPrice ? 'resistance' : 'support' as const,
          strength: g.length,
          isMajor: g.length >= 4 // Hit many times across different timeframe windows
        };
      });
  };

  const resistance = groupLevels(highs);
  const support = groupLevels(lows);

  // Combine and deduplicate very close levels
  const allLevels = [...resistance, ...support].sort((a, b) => a.price - b.price);
  const filtered: SRLevel[] = [];
  
  if (allLevels.length > 0) {
    let current = allLevels[0];
    for (let i = 1; i < allLevels.length; i++) {
      if (Math.abs(allLevels[i].price - current.price) < threshold) {
        // Merge them
        if (allLevels[i].strength > current.strength) {
          current = {
            ...allLevels[i],
            strength: current.strength + allLevels[i].strength,
            isMajor: current.isMajor || allLevels[i].isMajor
          };
        }
      } else {
        filtered.push(current);
        current = allLevels[i];
      }
    }
    filtered.push(current);
  }

  return filtered
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10); // Return top 10 most "felt" levels
};
