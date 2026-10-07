import React, { useMemo } from 'react';
import { IndicatorData } from '../types';
import { formatPrice } from '../utils/formatters';
import { motion } from 'motion/react';
import { Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarketDepthProps {
  data: IndicatorData[];
}

export const MarketDepth: React.FC<MarketDepthProps> = ({ data }) => {
  const depthData = useMemo(() => {
    if (data.length === 0) return null;
    const current = data[data.length - 1];
    const price = current.close;
    const atr = current.atr || (price * 0.01);
    
    // Simulate depth levels
    const bids = [];
    const asks = [];
    const steps = 15;
    const stepSize = atr / 5;

    for (let i = 1; i <= steps; i++) {
        // Asks (Sell Orders) - higher prices
        const askPrice = price + (i * stepSize);
        // Add some "walls" (larger volume spikes)
        const askVol = (Math.random() * 5000) + (i % 5 === 0 ? 10000 : 0);
        asks.push({ price: askPrice, volume: askVol });

        // Bids (Buy Orders) - lower prices
        const bidPrice = price - (i * stepSize);
        const bidVol = (Math.random() * 5000) + (i % 4 === 0 ? 12000 : 0);
        bids.push({ price: bidPrice, volume: bidVol });
    }

    const totalBidVol = bids.reduce((sum, b) => sum + b.volume, 0);
    const totalAskVol = asks.reduce((sum, a) => sum + a.volume, 0);
    const bias = totalBidVol > totalAskVol ? 'Bullish' : 'Bearish';
    const imbalance = Math.abs((totalBidVol - totalAskVol) / (totalBidVol + totalAskVol) * 100);

    return {
      asks: asks.reverse(), // Top down: highest ask at top
      bids,
      price,
      totalBidVol,
      totalAskVol,
      bias,
      imbalance
    };
  }, [data]);

  if (!depthData) return null;

  const maxVol = Math.max(
    ...depthData.asks.map(a => a.volume),
    ...depthData.bids.map(b => b.volume)
  );

  return (
    <div className="bg-quant-surface border border-quant-border rounded-lg overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="bg-quant-bg/50 px-4 py-3 border-b border-quant-border flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <Layers className="w-4 h-4 text-quant-blue" />
          Liquiditiy Depth (L2 SIM)
        </h3>
        <div className={cn(
          "px-2 py-0.5 rounded text-[8px] font-black uppercase border",
          depthData.bias === 'Bullish' ? "bg-quant-green/10 text-quant-green border-quant-green/30" : "bg-quant-red/10 text-quant-red border-quant-red/30"
        )}>
          {depthData.bias} Bias ({depthData.imbalance.toFixed(1)}%)
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-[10px] p-2 space-y-1 select-none">
        {/* Asks (Sells) */}
        <div className="space-y-[1px]">
          {depthData.asks.map((ask, i) => (
            <div key={`ask-${i}`} className="relative group h-5 flex items-center px-2">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-quant-red/10 transition-all duration-500" 
                style={{ width: `${(ask.volume / maxVol) * 100}%` }}
              />
              <span className="relative z-10 text-quant-red font-bold w-20">
                {formatPrice(ask.price)}
              </span>
              <span className="relative z-10 text-quant-muted/60 ml-auto">
                {ask.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>

        {/* Current Price Divider */}
        <div className="py-3 px-4 bg-quant-bg/80 border-y border-quant-border/50 my-2 flex items-center justify-between sticky top-0 bottom-0 z-20 backdrop-blur-sm shadow-lg">
           <div className="flex items-center gap-2">
              <span className="text-lg font-black text-quant-text tracking-tighter">
                {formatPrice(depthData.price)}
              </span>
              {depthData.bias === 'Bullish' ? (
                <TrendingUp className="w-4 h-4 text-quant-green" />
              ) : (
                <TrendingDown className="w-4 h-4 text-quant-red" />
              )}
           </div>
           <div className="text-[8px] font-black uppercase text-quant-muted text-right">
              Mark Price<br/>
              Spread: 0.01%
           </div>
        </div>

        {/* Bids (Buys) */}
        <div className="space-y-[1px]">
          {depthData.bids.map((bid, i) => (
            <div key={`bid-${i}`} className="relative group h-5 flex items-center px-2">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-quant-green/10 transition-all duration-500" 
                style={{ width: `${(bid.volume / maxVol) * 100}%` }}
              />
              <span className="relative z-10 text-quant-green font-bold w-20">
                {formatPrice(bid.price)}
              </span>
              <span className="relative z-10 text-quant-muted/60 ml-auto">
                {bid.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 bg-quant-bg/50 border-t border-quant-border mt-auto h-24">
         <div className="flex justify-between items-end mb-2">
            <span className="text-[8px] text-quant-muted uppercase font-black">Volume Imbalance Monitor</span>
            <span className="text-[10px] font-black text-quant-text">{depthData.imbalance.toFixed(1)}%</span>
         </div>
         <div className="h-1.5 bg-quant-bg border border-quant-border rounded-full flex overflow-hidden">
            <motion.div 
               initial={{ width: '50%' }}
               animate={{ width: `${(depthData.totalBidVol / (depthData.totalBidVol + depthData.totalAskVol)) * 100}%` }}
               className="h-full bg-quant-green shadow-[0_0_8px_rgba(34,197,94,0.3)] transition-all"
            />
            <motion.div 
               initial={{ width: '50%' }}
               animate={{ width: `${(depthData.totalAskVol / (depthData.totalBidVol + depthData.totalAskVol)) * 100}%` }}
               className="h-full bg-quant-red shadow-[0_0_8px_rgba(239,68,68,0.3)] transition-all"
            />
         </div>
         <div className="flex justify-between mt-1 text-[7px] font-black uppercase text-quant-muted">
            <span>Bids: {(depthData.totalBidVol / 1000).toFixed(0)}k</span>
            <span>Asks: {(depthData.totalAskVol / 1000).toFixed(0)}k</span>
         </div>
      </div>
    </div>
  );
};
