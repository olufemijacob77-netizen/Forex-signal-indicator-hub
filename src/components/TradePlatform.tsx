import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  History, 
  ShieldCheck, 
  Check, 
  Activity, 
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  Percent,
  Zap,
  Play,
  Download
} from 'lucide-react';
import { TradingViewChart } from './TradingViewChart';
import { formatPrice } from '../utils/formatters';
import { Position, TradeHistory } from '../types';

interface TradePlatformProps {
  activeSymbol: string;
  pairs: { label: string; symbol: string; category?: string }[];
  lastPrice: number | null;
  timeframe: string;
  onSymbolChange: (symbol: string) => void;
  theme?: 'dark' | 'light' | 'system';
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  positions: Position[];
  setPositions: React.Dispatch<React.SetStateAction<Position[]>>;
  history: TradeHistory[];
  setHistory: React.Dispatch<React.SetStateAction<TradeHistory[]>>;
}

export const TradePlatform: React.FC<TradePlatformProps> = ({
  activeSymbol,
  pairs,
  lastPrice,
  timeframe,
  onSymbolChange,
  theme,
  balance,
  setBalance,
  positions,
  setPositions,
  history,
  setHistory
}) => {

  // Active pair label
  const activeLabel = useMemo(() => {
    return pairs.find(p => p.symbol === activeSymbol)?.label || activeSymbol;
  }, [activeSymbol, pairs]);

  // Order state
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [executionType, setExecutionType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [qty, setQty] = useState<string>('0.10');
  const [leverage, setLeverage] = useState<number>(10);
  const [useSL, setUseSL] = useState<boolean>(false);
  const [useTP, setUseTP] = useState<boolean>(false);
  const [slPrice, setSlPrice] = useState<string>('');
  const [tpPrice, setTpPrice] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'history'>('positions');
  const [orderNotification, setOrderNotification] = useState<string | null>(null);

  const handleExport = (format: 'csv' | 'json') => {
    const dataToExport = activeSubTab === 'positions' ? positions : history;
    if (dataToExport.length === 0) return;

    if (format === 'json') {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quant_terminal_${activeSubTab}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = Object.keys(dataToExport[0]);
      const csvRows = dataToExport.map(obj => 
        headers.map(header => {
          const val = (obj as any)[header];
          if (val === undefined || val === null) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      );
      const csvString = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quant_terminal_${activeSubTab}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('sim_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('sim_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('sim_history', JSON.stringify(history));
  }, [history]);

  // Set default limit price or TP/SL suggestions when symbol or lastPrice changes
  useEffect(() => {
    if (lastPrice !== null) {
      if (!limitPrice || executionType === 'MARKET') {
        setLimitPrice(lastPrice.toString());
      }
      
      const pipValue = activeSymbol.endsWith('=X') ? 0.001 : lastPrice * 0.01;
      
      if (!slPrice) {
        const defaultSL = orderType === 'BUY' 
          ? lastPrice - (pipValue * 50) 
          : lastPrice + (pipValue * 50);
        setSlPrice(defaultSL.toFixed(activeSymbol.endsWith('=X') ? 4 : 2));
      }
      if (!tpPrice) {
        const defaultTP = orderType === 'BUY' 
          ? lastPrice + (pipValue * 100) 
          : lastPrice - (pipValue * 100);
        setTpPrice(defaultTP.toFixed(activeSymbol.endsWith('=X') ? 4 : 2));
      }
    }
  }, [lastPrice, activeSymbol, orderType]);

  // Get multiplier for calculating real lot sizes
  const getMultiplier = (symbol: string): number => {
    if (symbol.endsWith('=X')) return 100000; // Forex standard contracts
    if (symbol === 'GC=F') return 100;         // Gold contract
    if (symbol === 'SI=F') return 5000;        // Silver contract
    if (symbol === 'CL=F') return 1000;        // Crude oil
    return 1;                                  // Stocks / Crypto (units)
  };

  // Live Position Price / P&L calculation & SL / TP automated hit verification
  useEffect(() => {
    if (lastPrice === null || positions.length === 0) return;

    let historyUpdated = false;
    const newHistory: TradeHistory[] = [];
    const updatedPositions = positions.map(pos => {
      if (pos.symbol !== activeSymbol) return pos;

      const multiplier = getMultiplier(pos.symbol);
      const entry = pos.entryPrice;
      const current = lastPrice;
      
      // Calculate real floating PnL
      let itemPnl = 0;
      if (pos.type === 'BUY') {
        itemPnl = (current - entry) * pos.qty * multiplier;
      } else {
        itemPnl = (entry - current) * pos.qty * multiplier;
      }

      // Check SL / TP
      let triggered: 'TP' | 'SL' | null = null;
      if (pos.stopLoss) {
        if (pos.type === 'BUY' && current <= pos.stopLoss) triggered = 'SL';
        if (pos.type === 'SELL' && current >= pos.stopLoss) triggered = 'SL';
      }
      if (pos.takeProfit) {
        if (pos.type === 'BUY' && current >= pos.takeProfit) triggered = 'TP';
        if (pos.type === 'SELL' && current <= pos.takeProfit) triggered = 'TP';
      }

      if (triggered) {
        historyUpdated = true;
        const closedTrade: TradeHistory = {
          id: pos.id,
          symbol: pos.symbol,
          label: pos.label,
          type: pos.type,
          entryPrice: pos.entryPrice,
          exitPrice: current,
          qty: pos.qty,
          pnl: itemPnl,
          exitReason: triggered,
          timestamp: new Date().toISOString()
        };
        newHistory.push(closedTrade);
        return null; // Closed
      }

      return {
        ...pos,
        currentPrice: current,
        pnl: itemPnl
      };
    }).filter(p => p !== null) as Position[];

    if (historyUpdated) {
      // Return cash back to balance
      let pnlSum = 0;
      let marginRefund = 0;
      
      newHistory.forEach(h => {
        pnlSum += h.pnl;
        const matchingPosition = positions.find(po => po.id === h.id);
        if (matchingPosition) {
          marginRefund += matchingPosition.margin;
        }
      });
      
      setBalance(prev => prev + pnlSum);
      setHistory(prev => [ ...newHistory, ...prev ]);
      setPositions(updatedPositions);
      triggerNotification(`Automated SL/TP filled! Closed ${newHistory.length} trades. Net PnL: $${pnlSum.toFixed(2)}`);
    } else {
      // Just update rolling prices
      const hasChanges = positions.some(p => p.symbol === activeSymbol && (p.currentPrice !== lastPrice));
      if (hasChanges) {
        setPositions(updatedPositions);
      }
    }
  }, [lastPrice, activeSymbol, positions]);

  // Trigger brief alert
  const triggerNotification = (msg: string) => {
    setOrderNotification(msg);
    setTimeout(() => {
      setOrderNotification(null);
    }, 6000);
  };

  // Calculations for Margin and equity
  const unrealizedPnL = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.pnl, 0);
  }, [positions]);

  const totalMarginUsed = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.margin, 0);
  }, [positions]);

  const equity = useMemo(() => {
    return balance + unrealizedPnL;
  }, [balance, unrealizedPnL]);

  const freeMargin = useMemo(() => {
    return equity - totalMarginUsed;
  }, [equity, totalMarginUsed]);

  const marginLevel = useMemo(() => {
    if (totalMarginUsed === 0) return 10000;
    return (equity / totalMarginUsed) * 100;
  }, [equity, totalMarginUsed]);

  // Execute Order
  const handlePlaceOrder = () => {
    if (lastPrice === null) return;
    
    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      triggerNotification('ERROR: Invalid transaction volume (Lot quantity)');
      return;
    }

    const price = executionType === 'MARKET' ? lastPrice : parseFloat(limitPrice);
    if (isNaN(price) || price <= 0) {
      triggerNotification('ERROR: Invalid execution price');
      return;
    }

    // Standard contracts
    const multiplier = getMultiplier(activeSymbol);
    const orderNotionalValue = price * parsedQty * multiplier;
    
    // Margin Requirement
    const marginNeeded = orderNotionalValue / leverage;

    if (marginNeeded > freeMargin) {
      triggerNotification(`ERROR: Insufficient Free Margin. Needed: $${marginNeeded.toFixed(2)}, Available: $${freeMargin.toFixed(2)}`);
      return;
    }

    // Set SL/TP
    const sl = useSL ? parseFloat(slPrice) : undefined;
    const tp = useTP ? parseFloat(tpPrice) : undefined;

    // Create Position
    const newPos: Position = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: activeSymbol,
      label: activeLabel,
      type: orderType,
      entryPrice: price,
      currentPrice: lastPrice,
      qty: parsedQty,
      leverage,
      stopLoss: isNaN(sl as any) ? undefined : sl,
      takeProfit: isNaN(tp as any) ? undefined : tp,
      margin: marginNeeded,
      pnl: 0,
      timestamp: new Date().toISOString()
    };

    setPositions(prev => [newPos, ...prev]);
    triggerNotification(`SUCCESS: Open ${orderType} limit order filled. Entry: ${formatPrice(price)}`);
  };

  // Close Specific Position
  const handleClosePosition = (id: string) => {
    const target = positions.find(p => p.id === id);
    if (!target) return;

    // Refund margin & finalize balance
    setBalance(prev => prev + target.pnl);
    
    // Create trade log
    const closed: TradeHistory = {
      id: target.id,
      symbol: target.symbol,
      label: target.label,
      type: target.type,
      entryPrice: target.entryPrice,
      exitPrice: target.currentPrice,
      qty: target.qty,
      pnl: target.pnl,
      exitReason: 'MANUAL',
      timestamp: new Date().toISOString()
    };

    setHistory(prev => [closed, ...prev]);
    setPositions(prev => prev.filter(p => p.id !== id));
    triggerNotification(`SUCCESS: Position closed. Realized PnL: $${target.pnl.toFixed(2)}`);
  };

  // Reset demo account
  const handleResetAccount = () => {
    if (confirm('Are you sure you want to completely reload the paper balance to $100,000 and delete positions?')) {
      setBalance(100000);
      setPositions([]);
      setHistory([]);
      triggerNotification('SUCCESS: Live trading account reset.');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Account Balance Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="bg-quant-surface border border-quant-border p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-quant-muted mb-1">
            <Wallet className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Balance</span>
          </div>
          <div>
            <span className="text-lg font-black font-mono text-quant-text">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="block text-[8px] text-quant-muted uppercase font-semibold">Demo Funds</span>
          </div>
        </div>

        <div className="bg-quant-surface border border-quant-border p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-quant-muted mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Equity</span>
          </div>
          <div>
            <span className="text-lg font-black font-mono text-quant-text">${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="block text-[8px] text-quant-muted uppercase font-semibold">Balance + Float P&L</span>
          </div>
        </div>

        <div className="bg-quant-surface border border-quant-border p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-quant-muted mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Floating P&L</span>
          </div>
          <div>
            <span className={`text-lg font-black font-mono ${unrealizedPnL >= 0 ? 'text-quant-green' : 'text-quant-red'}`}>
              {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="block text-[8px] text-quant-muted uppercase font-semibold">Unrealized profit</span>
          </div>
        </div>

        <div className="bg-quant-surface border border-quant-border p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-quant-muted mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Free Margin</span>
          </div>
          <div>
            <span className="text-lg font-black font-mono text-quant-text">${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="block text-[8px] text-quant-muted uppercase font-semibold">Usage available</span>
          </div>
        </div>

        <div className="bg-quant-surface border border-quant-border p-3.5 rounded-lg col-span-2 md:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-quant-muted mb-1">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Margin Lvl</span>
            </div>
            <button 
              onClick={handleResetAccount}
              className="text-[8px] text-quant-red hover:underline font-bold uppercase"
            >
              Reset
            </button>
          </div>
          <div>
            <span className={`text-lg font-black font-mono ${marginLevel > 150 ? 'text-quant-green' : 'text-quant-red'}`}>
              {marginLevel === 10000 ? '∞' : `${marginLevel.toFixed(1)}%`}
            </span>
            <span className="block text-[8px] text-quant-muted uppercase font-semibold">Call lvl 100%</span>
          </div>
        </div>
      </div>

      {/* Popups Alert Info */}
      <AnimatePresence>
        {orderNotification && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`p-3 rounded-lg text-xs font-mono border font-semibold ${
              orderNotification.startsWith('SUCCESS') 
                ? 'bg-quant-green/10 border-quant-green/30 text-quant-green' 
                : orderNotification.startsWith('ERROR') 
                  ? 'bg-quant-red/10 border-quant-red/30 text-quant-red'
                  : 'bg-quant-blue/10 border-quant-blue/30 text-quant-blue'
            }`}
          >
            {orderNotification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trading Platform Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real-time terminal chart */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-quant-surface border border-quant-border rounded-lg p-2.5">
            <div className="flex justify-between items-center mb-2 px-1">
               <span className="text-[10px] text-quant-muted uppercase font-black tracking-widest flex items-center gap-1.5">
                  <Play className="w-3 h-3 text-quant-green" />
                  Live TradingView Feed: {activeLabel} ({timeframe})
               </span>
               <div className="flex items-center gap-2">
                 <select 
                   value={activeSymbol}
                   onChange={(e) => onSymbolChange(e.target.value)}
                   className="bg-quant-bg border border-quant-border text-[9px] font-mono text-quant-green px-2 py-0.5 rounded outline-none cursor-pointer"
                 >
                   {Object.entries(
                     pairs.reduce((acc, pair) => {
                       const cat = pair.category || 'Other';
                       if (!acc[cat]) acc[cat] = [];
                       acc[cat].push(pair);
                       return acc;
                     }, {} as Record<string, typeof pairs>)
                   ).map(([category, items]) => (
                     <optgroup key={category} label={category} className="bg-quant-bg text-quant-muted text-[8px] font-sans font-bold uppercase tracking-wider">
                       {(items as any).map((p: any) => (
                         <option key={p.symbol} value={p.symbol} className="bg-quant-surface text-quant-text font-mono text-[9px] normal-case">
                           {p.label}
                         </option>
                       ))}
                     </optgroup>
                   ))}
                 </select>
               </div>
            </div>
            <TradingViewChart symbol={activeSymbol} timeframe={timeframe} theme={theme} />
          </div>
        </div>

        {/* Order execution panel */}
        <div className="lg:col-span-4 lg:sticky lg:top-14 h-fit">
          <div className="bg-quant-surface border border-quant-border rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-quant-border flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest">Trade execution</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrderType('BUY')}
                  className={`px-3 py-1 rounded text-[10px] font-black tracking-wider transition-all uppercase ${
                    orderType === 'BUY' 
                      ? 'bg-quant-green text-black shadow-lg shadow-quant-green/20' 
                      : 'bg-quant-bg text-quant-muted hover:text-quant-text'
                  }`}
                >
                  Buy / Long
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('SELL')}
                  className={`px-3 py-1 rounded text-[10px] font-black tracking-wider transition-all uppercase ${
                    orderType === 'SELL' 
                      ? 'bg-quant-red text-white shadow-lg shadow-quant-red/20' 
                      : 'bg-quant-bg text-quant-muted hover:text-quant-text'
                  }`}
                >
                  Sell / Short
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Type selector */}
              <div className="flex border border-quant-border p-0.5 rounded-lg bg-quant-bg">
                <button
                  type="button"
                  onClick={() => setExecutionType('MARKET')}
                  className={`flex-1 text-center py-1.5 text-[9px] font-bold uppercase rounded ${
                    executionType === 'MARKET' ? 'bg-quant-surface text-quant-text' : 'text-quant-muted hover:text-quant-text'
                  }`}
                >
                  Market Execution
                </button>
                <button
                  type="button"
                  onClick={() => setExecutionType('LIMIT')}
                  className={`flex-1 text-center py-1.5 text-[9px] font-bold uppercase rounded ${
                    executionType === 'LIMIT' ? 'bg-quant-surface text-quant-text' : 'text-quant-muted hover:text-quant-text'
                  }`}
                >
                  Limit Order
                </button>
              </div>

              {/* Quantity Lot Size */}
              <div>
                <label className="flex justify-between text-[9px] text-quant-muted uppercase font-black mb-1.5">
                  <span>Volume (Lot size / Qty)</span>
                  <span className="text-quant-text font-mono">
                    {activeSymbol.endsWith('=X') 
                      ? `${(parseFloat(qty) * 100000).toLocaleString()} UNITS` 
                      : `${parseFloat(qty)} CONTRACTS`}
                  </span>
                </label>
                <div className="flex border border-quant-border rounded bg-quant-bg h-9 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQty(prev => Math.max(0.01, parseFloat(prev) - 0.1).toFixed(2))}
                    className="px-3 border-r border-quant-border text-quant-muted hover:text-quant-green hover:bg-quant-surface transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="flex-1 text-center bg-transparent outline-none font-mono text-sm font-black text-quant-text"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(prev => (parseFloat(prev) + 0.1).toFixed(2))}
                    className="px-3 border-l border-quant-border text-quant-muted hover:text-quant-green hover:bg-quant-surface transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {['0.01', '0.10', '0.50', '1.00', '5.00'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQty(amt)}
                      className={`flex-1 text-center py-0.5 text-[8px] font-mono rounded bg-quant-border/30 hover:bg-quant-border text-quant-muted hover:text-quant-text ${
                        qty === amt ? 'text-quant-green border border-quant-green/30 bg-quant-green/5' : ''
                      }`}
                    >
                      {amt === '1.00' ? '1 Lot' : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Limit input */}
              {executionType === 'LIMIT' && (
                <div>
                  <label className="block text-[9px] text-quant-muted uppercase font-black mb-1.5">Trigger Price</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-quant-bg border border-quant-border rounded h-9 px-3 outline-none font-mono text-xs font-bold text-quant-text focus:border-quant-green/40"
                    placeholder="0.0000"
                  />
                </div>
              )}

              {/* Leverage Slider */}
              <div>
                <div className="flex justify-between text-[9px] text-quant-muted uppercase font-black mb-1.5">
                  <span>Leverage multiplier</span>
                  <span className="text-quant-text font-mono font-black">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="5"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value) || 1)}
                  className="w-full accent-quant-green h-1 bg-quant-bg rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[7px] text-quant-muted uppercase">
                  <span>1x (Classic)</span>
                  <span>50x (Standard)</span>
                  <span>100x (Pro Max)</span>
                </div>
              </div>

              {/* Stop Loss & Take Profit */}
              <div className="space-y-3 pt-2 border-t border-quant-border/40">
                {/* Take Profit Toggle & Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-quant-muted uppercase font-black">Take Profit (TP)</span>
                    <input
                      type="checkbox"
                      checked={useTP}
                      onChange={(e) => setUseTP(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-quant-bg border-quant-border accent-quant-green"
                    />
                  </div>
                  {useTP && (
                    <input
                      type="number"
                      step="0.0001"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value)}
                      className="w-full bg-quant-bg border border-quant-border rounded h-8 px-3 outline-none font-mono text-xs text-quant-green font-semibold"
                      placeholder="TP Destination Price"
                    />
                  )}
                </div>

                {/* Stop Loss Toggle & Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-quant-muted uppercase font-black text-quant-red">Stop Loss (SL)</span>
                    <input
                      type="checkbox"
                      checked={useSL}
                      onChange={(e) => setUseSL(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-quant-bg border-quant-border accent-quant-red"
                    />
                  </div>
                  {useSL && (
                    <input
                      type="number"
                      step="0.0001"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                      className="w-full bg-quant-bg border border-quant-border rounded h-8 px-3 outline-none font-mono text-xs text-quant-red font-semibold"
                      placeholder="SL Exit Price"
                    />
                  )}
                </div>
              </div>

              {/* Place Trade Trigger Button */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                className={`w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest text-black transition-all transform active:scale-[0.98] ${
                  orderType === 'BUY' 
                    ? 'bg-quant-green hover:bg-quant-green/90 shadow-lg shadow-quant-green/15' 
                    : 'bg-quant-red hover:bg-quant-red/90 text-white shadow-lg shadow-quant-red/15'
                }`}
              >
                Place {orderType === 'BUY' ? 'Long / BUY' : 'Short / SELL'} Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Positions and Trades terminal window */}
      <div className="bg-quant-surface border border-quant-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-quant-border flex items-center justify-between bg-quant-bg/30">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveSubTab('positions')}
              className={`text-[9.5px] font-black uppercase tracking-widest pb-1.5 relative transition-colors ${
                activeSubTab === 'positions' ? 'text-quant-green' : 'text-quant-muted hover:text-quant-text'
              }`}
            >
              Open Positions ({positions.length})
              {activeSubTab === 'positions' && (
                <motion.div layoutId="subtab_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-quant-green" />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`text-[9.5px] font-black uppercase tracking-widest pb-1.5 relative transition-colors ${
                activeSubTab === 'history' ? 'text-quant-green' : 'text-quant-muted hover:text-quant-text'
              }`}
            >
              Order Log / History ({history.length})
              {activeSubTab === 'history' && (
                <motion.div layoutId="subtab_underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-quant-green" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[8px] text-quant-muted font-mono uppercase hidden xs:inline">
               MARGIN SECURITY: {totalMarginUsed > 0 ? `$${totalMarginUsed.toFixed(2)} REQUIRED` : '0.00 EXPOSURE'}
            </span>
            <div className="flex items-center gap-1.5 border-l border-quant-border/40 pl-2.5">
              <span className="text-[7.5px] font-mono font-bold text-quant-muted uppercase tracking-wider">Export {activeSubTab}:</span>
              <button
                onClick={() => handleExport('csv')}
                disabled={activeSubTab === 'positions' ? positions.length === 0 : history.length === 0}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[7.5px] font-mono font-extrabold uppercase border border-quant-green/20 text-quant-green bg-quant-green/5 hover:bg-quant-green hover:text-black disabled:opacity-30 disabled:pointer-events-none rounded transition-all cursor-pointer"
                title="Export to Excel / CSV format"
              >
                <Download className="w-2.5 h-2.5" />
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={activeSubTab === 'positions' ? positions.length === 0 : history.length === 0}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[7.5px] font-mono font-extrabold uppercase border border-quant-border text-quant-text bg-quant-surface hover:bg-quant-text/10 disabled:opacity-30 disabled:pointer-events-none rounded transition-all cursor-pointer"
                title="Export to developers JSON format"
              >
                <Download className="w-2.5 h-2.5" />
                JSON
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-x-auto min-h-[120px]">
          {activeSubTab === 'positions' ? (
            positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <span className="text-[10px] uppercase font-bold text-quant-muted tracking-wide">No Open Trading Positions</span>
                <span className="text-[9px] text-quant-muted max-w-sm">Use the execution board on the right to open mock long or short leverage positions for any pair.</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-sans min-w-[650px]">
                <thead>
                  <tr className="border-b border-quant-border/35 text-[8.5px] uppercase font-black text-quant-muted tracking-widest">
                    <th className="py-2">Symbol</th>
                    <th className="py-2">Direction</th>
                    <th className="py-2 text-right">Volume</th>
                    <th className="py-2 text-right">Entry Price</th>
                    <th className="py-2 text-right">Mark Price</th>
                    <th className="py-2 text-right text-quant-red">Stop Loss</th>
                    <th className="py-2 text-right text-quant-green">Take Profit</th>
                    <th className="py-2 text-right">Margin</th>
                    <th className="py-2 text-right">PnL (USD)</th>
                    <th className="py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-quant-border/10">
                  {positions.map((pos) => (
                    <tr key={pos.id} className="text-[10.5px] font-medium font-mono text-quant-text hover:bg-quant-text/5 transition-colors">
                      <td className="py-3 font-semibold text-quant-text">{pos.label}</td>
                      <td className="py-3">
                        <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-black tracking-wider ${
                          pos.type === 'BUY' ? 'bg-quant-green/20 text-quant-green border border-quant-green/10' : 'bg-quant-red/20 text-quant-red border border-quant-red/10'
                        }`}>
                          {pos.type}
                        </span>
                      </td>
                      <td className="py-3 text-right font-black">{pos.qty.toFixed(2)} Lots</td>
                      <td className="py-3 text-right">{formatPrice(pos.entryPrice)}</td>
                      <td className="py-3 text-right animate-pulse">{formatPrice(pos.currentPrice)}</td>
                      <td className="py-3 text-right text-quant-red">{pos.stopLoss ? formatPrice(pos.stopLoss) : '---'}</td>
                      <td className="py-3 text-right text-quant-green">{pos.takeProfit ? formatPrice(pos.takeProfit) : '---'}</td>
                      <td className="py-3 text-right">${pos.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`py-3 text-right font-black ${pos.pnl >= 0 ? 'text-quant-green' : 'text-quant-red'}`}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="px-2.5 py-1 rounded bg-quant-red/10 hover:bg-quant-red hover:text-white border border-quant-red/20 text-quant-red text-[8px] font-black uppercase tracking-wider transition-all"
                        >
                          CLOSE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-1">
                <span className="text-[10px] uppercase font-bold text-quant-muted tracking-wide">No Historic Transactions</span>
                <span className="text-[9px] text-quant-muted">Completed contracts will be archived and presented here for auditing.</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-sans min-w-[650px]">
                <thead>
                  <tr className="border-b border-quant-border/35 text-[8.5px] uppercase font-black text-quant-muted tracking-widest">
                    <th className="py-2">Symbol</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 text-right">Volume</th>
                    <th className="py-2 text-right">Entry Price</th>
                    <th className="py-2 text-right">Exit Price</th>
                    <th className="py-2 text-right">PnL (USD)</th>
                    <th className="py-2 text-center">Trigger reason</th>
                    <th className="py-2 text-right">Closed at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-quant-border/10">
                  {history.map((h, index) => (
                    <tr key={h.id || index} className="text-[10.5px] font-medium font-mono text-quant-text hover:bg-quant-bg transition-colors">
                      <td className="py-3 font-semibold text-quant-text">{h.label}</td>
                      <td className="py-3">
                        <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-black tracking-wider ${
                          h.type === 'BUY' ? 'bg-quant-green/20 text-quant-green' : 'bg-quant-red/20 text-quant-red'
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold">{h.qty.toFixed(2)} Lots</td>
                      <td className="py-3 text-right">{formatPrice(h.entryPrice)}</td>
                      <td className="py-3 text-right">{formatPrice(h.exitPrice)}</td>
                      <td className={`py-3 text-right font-black ${h.pnl >= 0 ? 'text-quant-green' : 'text-quant-red'}`}>
                        {h.pnl >= 0 ? '+' : ''}${h.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          h.exitReason === 'TP' ? 'bg-quant-green/10 text-quant-green' :
                          h.exitReason === 'SL' ? 'bg-quant-red/10 text-quant-red' : 'bg-quant-muted/10 text-quant-muted'
                        }`}>
                          {h.exitReason}
                        </span>
                      </td>
                      <td className="py-3 text-right text-quant-muted text-[9.5px]">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
};
