/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  History, 
  Settings2,
  RefreshCw,
  LayoutDashboard,
  Menu,
  X,
  Bell,
  AlertTriangle,
  Sun,
  Moon,
  Zap,
  CandlestickChart,
  BarChart4,
  Activity
} from 'lucide-react';
import { generateMockData } from './utils/mockData';
import { 
  calculateMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands,
  calculateSuperTrend,
  calculateATR,
  calculateElliottWaves
} from './utils/indicators';
import { IndicatorData, IndicatorType, PricePoint, Alert, Timeframe, FibonacciSettings, IndicatorSettings, Position, TradeHistory } from './types';
import { IndicatorChart, SubIndicatorChart } from './components/IndicatorChart';
import { IndicatorDetails } from './components/IndicatorDetails';
import { TradingViewChart } from './components/TradingViewChart';
import { MarketAnalysis } from './components/MarketAnalysis';
import { Sidebar } from './components/Sidebar';
import { TradePlatform } from './components/TradePlatform';
import { AlertsManager } from './components/AlertsManager';
import { MarketDepth } from './components/MarketDepth';
import { MultiTimeframeStatus } from './components/MultiTimeframeStatus';
import { PatternScanner } from './components/PatternScanner';
import { FibonacciConfig } from './components/FibonacciConfig';
import { SettingsPanel } from './components/SettingsPanel';
import { getAllPatterns, CandlestickPattern } from './utils/patterns';
import { detectLevels, SRLevel } from './utils/levels';
import { formatPrice } from './utils/formatters';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>('ALL');
  const [activeMainTab, setActiveMainTab] = useState<'indicators' | 'trading'>('indicators');
  const [chartMode, setChartMode] = useState<'indicators' | 'tradingview'>('indicators');
  const [chartStyle, setChartStyle] = useState<'candlestick' | 'bar' | 'line'>('candlestick');
  const [activeSymbol, setActiveSymbol] = useState('EURUSD=X');
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('4h');
  const [baseData, setBaseData] = useState<PricePoint[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<{id: string, message: string, symbol: string}[]>([]);
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = parseInt(localStorage.getItem('fontSize') || '100');
      return isNaN(saved) ? 100 : saved;
    }
    return 100;
  });
  const [fibSettings, setFibSettings] = useState<FibonacciSettings>({
    showLabels: true,
    levels: [
      { value: 0, label: '0%', enabled: true },
      { value: 23.6, label: '23.6%', enabled: true },
      { value: 38.2, label: '38.2%', enabled: true },
      { value: 50, label: '50%', enabled: true },
      { value: 61.8, label: '61.8%', enabled: true },
      { value: 78.6, label: '78.6%', enabled: true },
      { value: 100, label: '100%', enabled: true },
    ],
    timeZones: {
      enabled: false,
      startIndex: 0
    }
  });
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(() => {
    const defaults: IndicatorSettings = {
      ma: { period: 20, enabled: true },
      ema: { period: 50, enabled: true },
      rsi: { period: 14, enabled: true },
      macd: { fast: 12, slow: 26, signal: 9, enabled: true },
      bb: { period: 20, stdDev: 2, enabled: true },
      superTrend: { period: 10, multiplier: 3, enabled: true },
      elliott: { enabled: true },
      fib: { enabled: true },
      sr: { enabled: true },
      patterns: { enabled: true },
      depth: { enabled: true }
    };

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('indicatorSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...defaults, ...parsed };
        } catch (e) {
          console.error('Failed to parse indicatorSettings', e);
        }
      }
    }
    return defaults;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Lifted Simulated Wallet & Brokerage Engine State
  const [balance, setBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sim_balance');
      return saved ? (parseFloat(saved) || 100000) : 100000;
    }
    return 100000;
  });

  const [positions, setPositions] = useState<Position[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sim_positions');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [history, setHistory] = useState<TradeHistory[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sim_history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Sync live paper trade states to storage
  useEffect(() => {
    localStorage.setItem('sim_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('sim_positions', JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem('sim_history', JSON.stringify(history));
  }, [history]);

  const [dismissedNotificationBanner, setDismissedNotificationBanner] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dismissedNotificationBanner') === 'true';
    }
    return false;
  });

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pushNotificationsEnabled') === 'true';
    }
    return false;
  });

  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as 'default' | 'granted' | 'denied';
    }
    return 'unsupported';
  });

  // Refresh permission dynamically when settings/window achieves focus
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const handleFocus = () => {
      setNotificationPermission(Notification.permission as 'default' | 'granted' | 'denied');
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Save the state choice
  useEffect(() => {
    localStorage.setItem('pushNotificationsEnabled', String(pushNotificationsEnabled));
  }, [pushNotificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('dismissedNotificationBanner', String(dismissedNotificationBanner));
  }, [dismissedNotificationBanner]);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission as 'default' | 'granted' | 'denied');
      return permission === 'granted';
    } catch (err) {
      console.warn("Unable to request permission directly via Promise (iframe restriction):", err);
      // Fallback for callback-based engines or general access errors
      try {
        const callbackPermission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission(resolve);
        });
        setNotificationPermission(callbackPermission as 'default' | 'granted' | 'denied');
        return callbackPermission === 'granted';
      } catch (innerErr) {
        console.error("Desktop push notifications are blocked:", innerErr);
      }
      return false;
    }
  };

  const sendTestNotification = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted' && pushNotificationsEnabled) {
      try {
        new Notification("🔔 Quant Terminal - Push Success", {
          body: "Push notification alert services active! You will receive live pattern triggers in the background.",
          icon: "https://cdn-icons-png.flaticon.com/512/179/179386.png",
          tag: "quant-terminal-test"
        });
      } catch (err) {
        console.error("Test notification creation failed:", err);
      }
    }
  };
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'system';
    }
    return 'system';
  });

  const isCurrentlyDark = useMemo(() => {
    if (theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return true;
    }
    return theme === 'dark';
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const updateThemeClass = () => {
      let resolved: 'dark' | 'light' = 'dark';
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        resolved = theme;
      }
      
      if (resolved === 'light') {
        root.classList.add('light');
      } else {
        root.classList.remove('light');
      }
    };

    updateThemeClass();
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        updateThemeClass();
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    // Base font size is usually 16px. 
    // We'll scale it based on the percentage.
    root.style.fontSize = `${(fontSize / 100) * 16}px`;
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('indicatorSettings', JSON.stringify(indicatorSettings));
  }, [indicatorSettings]);

  const PAIRS = [
    // Forex Majors
    { label: 'EUR/USD', symbol: 'EURUSD=X', category: 'Forex Majors' },
    { label: 'GBP/USD', symbol: 'GBPUSD=X', category: 'Forex Majors' },
    { label: 'USD/JPY', symbol: 'USDJPY=X', category: 'Forex Majors' },
    { label: 'USD/CHF', symbol: 'USDCHF=X', category: 'Forex Majors' },
    { label: 'AUD/USD', symbol: 'AUDUSD=X', category: 'Forex Majors' },
    { label: 'USD/CAD', symbol: 'USDCAD=X', category: 'Forex Majors' },
    { label: 'NZD/USD', symbol: 'NZDUSD=X', category: 'Forex Majors' },
    // Forex Minors
    { label: 'EUR/GBP', symbol: 'EURGBP=X', category: 'Forex Minors' },
    { label: 'EUR/JPY', symbol: 'EURJPY=X', category: 'Forex Minors' },
    { label: 'GBP/JPY', symbol: 'GBPJPY=X', category: 'Forex Minors' },
    { label: 'CHF/JPY', symbol: 'CHFJPY=X', category: 'Forex Minors' },
    { label: 'EUR/AUD', symbol: 'EURAUD=X', category: 'Forex Minors' },
    { label: 'EUR/CAD', symbol: 'EURCAD=X', category: 'Forex Minors' },
    { label: 'EUR/CHF', symbol: 'EURCHF=X', category: 'Forex Minors' },
    { label: 'GBP/CHF', symbol: 'GBPCHF=X', category: 'Forex Minors' },
    { label: 'AUD/JPY', symbol: 'AUDJPY=X', category: 'Forex Minors' },
    { label: 'CAD/JPY', symbol: 'CADJPY=X', category: 'Forex Minors' },
    { label: 'AUD/CAD', symbol: 'AUDCAD=X', category: 'Forex Minors' },
    { label: 'AUD/NZD', symbol: 'AUDNZD=X', category: 'Forex Minors' },
    { label: 'NZD/JPY', symbol: 'NZDJPY=X', category: 'Forex Minors' },
    { label: 'GBP/AUD', symbol: 'GBPAUD=X', category: 'Forex Minors' },
    { label: 'GBP/CAD', symbol: 'GBPCAD=X', category: 'Forex Minors' },
    { label: 'GBP/NZD', symbol: 'GBPNZD=X', category: 'Forex Minors' },
    { label: 'EUR/NZD', symbol: 'EURNZD=X', category: 'Forex Minors' },
    { label: 'NZD/CAD', symbol: 'NZDCAD=X', category: 'Forex Minors' },
    { label: 'NZD/CHF', symbol: 'NZDCHF=X', category: 'Forex Minors' },
    { label: 'AUD/CHF', symbol: 'AUDCHF=X', category: 'Forex Minors' },
    { label: 'CAD/CHF', symbol: 'CADCHF=X', category: 'Forex Minors' },
    // Commodities
    { label: 'Gold (XAU)', symbol: 'GC=F', category: 'Commodities' },
    { label: 'Crude Oil', symbol: 'CL=F', category: 'Commodities' },
    { label: 'Silver', symbol: 'SI=F', category: 'Commodities' },
    // Crypto
    { label: 'Bitcoin (BTC)', symbol: 'BTC-USD', category: 'Crypto' },
    { label: 'Ethereum (ETH)', symbol: 'ETH-USD', category: 'Crypto' },
    { label: 'Solana (SOL)', symbol: 'SOL-USD', category: 'Crypto' },
    { label: 'Cardano (ADA)', symbol: 'ADA-USD', category: 'Crypto' },
    // Indices
    { label: 'S&P 500', symbol: '^GSPC', category: 'Indices' },
    { label: 'Nasdaq 100', symbol: '^NDX', category: 'Indices' },
    { label: 'Dow Jones', symbol: '^DJI', category: 'Indices' },
    { label: 'Nikkei 225', symbol: '^N225', category: 'Indices' },
    { label: 'DAX Performance', symbol: '^GDAXI', category: 'Indices' },
    { label: 'FTSE 100', symbol: '^FTSE', category: 'Indices' },
    // OTC
    { label: 'Tencent (OTC)', symbol: 'TCEHY', category: 'Stocks/OTC' },
    { label: 'Nestle (OTC)', symbol: 'NSRGY', category: 'Stocks/OTC' },
    { label: 'Nintendo (OTC)', symbol: 'NTDOY', category: 'Stocks/OTC' },
    { label: 'Hyundai (OTC)', symbol: 'HYMTF', category: 'Stocks/OTC' },
    { label: 'Samsung (OTC)', symbol: 'SSNLF', category: 'Stocks/OTC' },
    { label: 'LVMH (OTC)', symbol: 'LVMHF', category: 'Stocks/OTC' },
    { label: 'Alibaba (BABA)', symbol: 'BABA', category: 'Stocks/OTC' },
    { label: 'Meta (META)', symbol: 'META', category: 'Stocks/OTC' },
    { label: 'Apple (AAPL)', symbol: 'AAPL', category: 'Stocks/OTC' },
    { label: 'Nvidia (NVDA)', symbol: 'NVDA', category: 'Stocks/OTC' },
    { label: 'Tesla (TSLA)', symbol: 'TSLA', category: 'Stocks/OTC' },
  ];

  const handleExecuteTradeFromSignal = (params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    const leverage = 10;
    const qty = 0.50; // default trade contract sizing for AI signal execution

    // Determine correct contract multiplier based on asset class
    let multiplier = 1;
    if (params.symbol.endsWith('=X')) multiplier = 100000;
    else if (params.symbol === 'GC=F') multiplier = 100;
    else if (params.symbol === 'SI=F') multiplier = 5000;
    else if (params.symbol === 'CL=F') multiplier = 1000;

    const notional = params.entryPrice * qty * multiplier;
    const marginNeeded = notional / leverage;

    // Margin coverage verification
    const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalMarginUsed = positions.reduce((sum, pos) => sum + pos.margin, 0);
    const equity = balance + unrealizedPnL;
    const freeMargin = equity - totalMarginUsed;

    if (marginNeeded > freeMargin) {
      alert(`⚠️ SIGNAL ROUTER HALTED: Insufficient Free Margin! Necessary: $${marginNeeded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Available: $${freeMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }

    const pairLabel = PAIRS.find(p => p.symbol === params.symbol)?.label || params.symbol;

    // Create a Position with correct parameters
    const newPosition: Position = {
      id: Math.random().toString(36).substring(2, 11),
      symbol: params.symbol,
      label: pairLabel,
      type: params.type,
      entryPrice: params.entryPrice,
      currentPrice: params.entryPrice,
      qty,
      leverage,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      margin: marginNeeded,
      pnl: 0,
      timestamp: new Date().toISOString()
    };

    setPositions(prev => [newPosition, ...prev]);

    // Navigate to live visual ledger tab
    setActiveMainTab('trading');

    // Trigger confirmation signals
    if (Notification.permission === 'granted' && pushNotificationsEnabled) {
      try {
        new Notification("⚡ Algorithmic Consensus Position Filled", {
          body: `Routed simulated ${params.type} order for ${pairLabel} at ${formatPrice(params.entryPrice)}. Live S/L: ${params.stopLoss ? formatPrice(params.stopLoss) : 'None'} and T/P: ${params.takeProfit ? formatPrice(params.takeProfit) : 'None'}.`,
          icon: "https://cdn-icons-png.flaticon.com/512/179/179386.png",
          tag: `trade-exec-${newPosition.id}`
        });
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const fetchMarketData = async (symbol: string, interval: string = '1h') => {
    setIsRefreshing(true);
    setError(null);
    try {
      console.log(`[MarketData] Syncing ${symbol} [${interval}]...`);
      
      // Verification fetch to check server status
      const healthCheck = await fetch('/api/health').catch(() => null);
      if (!healthCheck || !healthCheck.ok) {
        console.warn("[MarketData] Server health check failed, service might be initializing.");
      }

      const response = await fetch(`/api/market-data?symbol=${symbol}&interval=${interval}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${response.status}: Failed to synchronize feed`);
      }
      const data = await response.json();
      setBaseData(data);
      if (data.length > 0) {
        const currentPrice = data[data.length - 1].close;
        const currentPatterns = getAllPatterns(data);
        const lastFewPatterns = currentPatterns.filter(p => p.index >= data.length - 2); // Check last 2 candles

        const triggeredAlerts = alerts.filter(alert => {
          if (alert.symbol !== symbol || alert.isTriggered || !alert.isActive) return false;

          if (alert.condition === 'above' && alert.level !== undefined) {
            return currentPrice >= alert.level;
          }
          if (alert.condition === 'below' && alert.level !== undefined) {
            return currentPrice <= alert.level;
          }
          if (alert.condition === 'pattern') {
            return lastFewPatterns.some(p => {
              const typeMatch = alert.patternType === 'any' || p.type === alert.patternType;
              const nameMatch = alert.patternName === 'any' || p.name === alert.patternName;
              return typeMatch && nameMatch;
            });
          }
          return false;
        });

        if (triggeredAlerts.length > 0) {
          setAlerts(prev => prev.map(a => 
            triggeredAlerts.some(ta => ta.id === a.id) 
              ? { ...a, isTriggered: true, triggeredAt: new Date().toISOString() } 
              : a
          ));

          triggeredAlerts.forEach(alert => {
            const pairLabel = PAIRS.find(p => p.symbol === alert.symbol)?.label || alert.symbol;
            let message = '';
            
            if (alert.condition === 'pattern') {
              const matchingPattern = lastFewPatterns.find(p => {
                 const typeMatch = alert.patternType === 'any' || p.type === alert.patternType;
                 const nameMatch = alert.patternName === 'any' || p.name === alert.patternName;
                 return typeMatch && nameMatch;
              });
              message = `${pairLabel}: ${matchingPattern?.name} (${matchingPattern?.type}) detected!`;
            } else {
              message = `${pairLabel} crossed ${alert.level?.toFixed(5)} (${alert.condition === 'above' ? 'Above' : 'Below'})`;
            }

            const notification = {
              id: Math.random().toString(36).substr(2, 9),
              message,
              symbol: alert.symbol
            };
            setNotifications(prev => [...prev, notification]);

            if (pushNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`🔔 Alert: ${pairLabel}`, {
                  body: message,
                  icon: "https://cdn-icons-png.flaticon.com/512/179/179386.png",
                  tag: alert.id
                });
              } catch (err) {
                console.error("Desktop notification trigger failed:", err);
              }
            }
            
            // Auto-remove notification after 8 seconds for pattern signals
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 8000);
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        setError('Connection lost or server initializing. Using offline simulated data.');
      } else {
        setError(err.message);
      }
      if (baseData.length === 0) {
        setBaseData(generateMockData(60));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData(activeSymbol, activeTimeframe);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMarketData(activeSymbol, activeTimeframe);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeSymbol, activeTimeframe, alerts]);

  // Real-time tick simulation for active charts
  useEffect(() => {
    if (baseData.length === 0) return;
    
    const tickInterval = setInterval(() => {
      setBaseData(prev => {
        if (prev.length === 0) return prev;
        const newData = [...prev];
        const lastIdx = newData.length - 1;
        const lastCandle = { ...newData[lastIdx] };
        
        // Random price movement (approx 0.01%)
        const maxMove = lastCandle.close * 0.0001; 
        const move = (Math.random() - 0.5) * maxMove;
        
        lastCandle.close += move;
        if (lastCandle.close > lastCandle.high) lastCandle.high = lastCandle.close;
        if (lastCandle.close < lastCandle.low) lastCandle.low = lastCandle.close;
        
        newData[lastIdx] = lastCandle;
        return newData;
      });
    }, 1500); // Tick every 1.5s

    return () => clearInterval(tickInterval);
  }, [baseData.length]); // Only re-bind if the entire dataset changes length

  const processedData = useMemo(() => {
    if (baseData.length === 0) return [];
    
    const ma = calculateMA(baseData, indicatorSettings.ma.period);
    const ema = calculateEMA(baseData, indicatorSettings.ema.period);
    const rsi = calculateRSI(baseData, indicatorSettings.rsi.period);
    const macd = calculateMACD(
      baseData, 
      indicatorSettings.macd.fast, 
      indicatorSettings.macd.slow, 
      indicatorSettings.macd.signal
    );
    const bBands = calculateBollingerBands(
      baseData, 
      indicatorSettings.bb.period, 
      indicatorSettings.bb.stdDev
    );
    const superTrend = calculateSuperTrend(
      baseData, 
      indicatorSettings.superTrend.period, 
      indicatorSettings.superTrend.multiplier
    );
    const atr = calculateATR(baseData, 14); // Standard 14-period ATR
    const elliottWaves = calculateElliottWaves(baseData);

    return baseData.map((d, i) => ({
      ...d,
      ma: ma[i],
      ema: ema[i],
      rsi: rsi[i],
      macd: macd[i],
      bBands: bBands[i],
      superTrend: superTrend[i],
      atr: atr[i],
      elliottWaves: i === baseData.length - 1 ? elliottWaves : undefined
    }));
  }, [baseData, indicatorSettings]);

  const activePatterns = useMemo(() => {
    return getAllPatterns(baseData);
  }, [baseData]);

  const activeLevels = useMemo(() => {
    return detectLevels(baseData);
  }, [baseData]);

  const lastPrice = useMemo(() => {
    if (baseData.length === 0) return null;
    return baseData[baseData.length - 1].close;
  }, [baseData]);

  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastPrice !== null) {
      if (prevPriceRef.current !== null && prevPriceRef.current !== lastPrice) {
        if (lastPrice > prevPriceRef.current) {
          setPriceFlash('up');
        } else if (lastPrice < prevPriceRef.current) {
          setPriceFlash('down');
        }
        const timer = setTimeout(() => setPriceFlash(null), 600);
        prevPriceRef.current = lastPrice;
        return () => clearTimeout(timer);
      }
      prevPriceRef.current = lastPrice;
    }
  }, [lastPrice]);

  const handleSelectIndicator = (type: IndicatorType) => {
    setActiveIndicator(type);
    setIsSidebarOpen(false);
  };

  const handleAddAlert = (newAlert: Omit<Alert, 'id' | 'isTriggered' | 'isActive'>) => {
    const alert: Alert = {
      ...newAlert,
      id: Math.random().toString(36).substr(2, 9),
      isTriggered: false,
      isActive: true
    };
    setAlerts(prev => [...prev, alert]);
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="h-screen w-full bg-quant-bg text-quant-text font-sans flex flex-col overflow-hidden relative">
      {/* Notifications Overlay */}
      <div className="fixed top-14 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="bg-quant-surface border-l-4 border-quant-green border border-quant-border p-3 rounded shadow-2xl flex items-start gap-3 min-w-[240px]"
            >
              <div className="bg-quant-green/10 p-1.5 rounded">
                <Bell className="w-4 h-4 text-quant-green" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-quant-text uppercase tracking-wider mb-0.5">Price Alert Triggered</p>
                <p className="text-[11px] text-quant-muted leading-tight">{n.message}</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="text-quant-muted hover:text-quant-text"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-quant-border flex items-center justify-between px-4 bg-quant-surface shrink-0 z-50">
        <div className="flex items-center space-x-4 md:space-x-8">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1 text-gray-400 hover:text-quant-green transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-quant-green rounded sm:w-6 sm:h-6 flex items-center justify-center shadow-lg shadow-quant-green/20">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-black" />
            </div>
            <span className="font-black text-[10px] sm:text-xs tracking-widest text-quant-green bg-quant-green/10 px-1.5 sm:px-2 py-1 rounded">SIGNAL.HUB</span>
          </div>

          {/* Mobile Main Tab Switcher */}
          <div className="md:hidden flex bg-quant-bg/60 border border-quant-border/30 rounded p-0.5">
            <button
              onClick={() => setActiveMainTab('indicators')}
              className={cn(
                "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                activeMainTab === 'indicators' ? "bg-quant-green text-black" : "text-quant-muted"
              )}
            >
              Charts
            </button>
            <button
              onClick={() => setActiveMainTab('trading')}
              className={cn(
                "text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5",
                activeMainTab === 'trading' ? "bg-quant-green text-black" : "text-quant-muted"
              )}
            >
              Trade
            </button>
          </div>

          <nav className="hidden md:flex space-x-6 text-[10px] font-bold uppercase tracking-wider text-quant-muted">
            <button 
              onClick={() => setActiveMainTab('indicators')}
              className={cn(
                "h-12 flex items-center px-1 cursor-pointer transition-colors border-b-2 font-black",
                activeMainTab === 'indicators' ? "text-quant-green border-quant-green" : "border-transparent hover:text-quant-text"
              )}
            >
              Indicators & Charts
            </button>
            <button 
              onClick={() => setActiveMainTab('trading')}
              className={cn(
                "h-12 flex items-center px-1 cursor-pointer transition-colors border-b-2 font-black flex items-center gap-1",
                activeMainTab === 'trading' ? "text-quant-green border-quant-green animate-pulse" : "border-transparent hover:text-quant-text"
              )}
            >
              <Zap className="w-3 h-3 text-quant-green animate-pulse" />
              TradeView Platform
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-6">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-[9px] text-quant-muted uppercase font-bold hidden sm:inline">Active Pair:</span>
            <select 
              value={activeSymbol}
              onChange={(e) => setActiveSymbol(e.target.value)}
              className="bg-quant-bg border border-quant-border text-[10px] font-mono text-quant-green px-2 py-1 rounded outline-none focus:border-quant-green/50 cursor-pointer"
            >
              {Object.entries(
                PAIRS.reduce((acc, pair) => {
                  const cat = pair.category || 'Other';
                  if (!acc[cat]) {
                    acc[cat] = [];
                  }
                  acc[cat].push(pair);
                  return acc;
                }, {} as Record<string, typeof PAIRS>)
              ).map(([category, items]) => (
                <optgroup key={category} label={category} className="bg-quant-bg text-quant-muted text-[8px] font-sans font-bold uppercase tracking-wider">
                  {items.map(p => (
                    <option key={p.symbol} value={p.symbol} className="bg-quant-surface text-quant-text font-mono text-[10px] normal-case">
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button 
            onClick={() => fetchMarketData(activeSymbol)}
            className={cn(
              "text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-quant-muted hover:text-quant-green flex items-center gap-2 transition-colors",
              isRefreshing && "opacity-50"
            )}
          >
            <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            <span className="hidden xs:inline">Sync Loop</span>
          </button>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-gray-500 hover:text-quant-blue transition-colors rounded-full hover:bg-quant-blue/10"
            title="Indicator Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          
          <button 
            onClick={() => setTheme(isCurrentlyDark ? 'light' : 'dark')}
            className="p-1.5 text-gray-500 hover:text-quant-blue transition-colors rounded-full hover:bg-quant-blue/10"
            title={isCurrentlyDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isCurrentlyDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1 border border-quant-border rounded-full px-1 py-0.5">
            <button 
              onClick={() => setFontSize(prev => Math.max(70, prev - 5))}
              className="px-1.5 text-[8px] font-bold text-quant-muted hover:text-quant-text transition-colors"
              title="Decrease Font Size"
            >
              A-
            </button>
            <div className="w-[1px] h-2 bg-quant-border" />
            <button 
              onClick={() => setFontSize(prev => Math.min(150, prev + 5))}
              className="px-1.5 text-[8px] font-bold text-quant-muted hover:text-quant-text transition-colors"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          <div className="h-4 w-[1px] bg-quant-border" />
          <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-mono">
            <div className="flex flex-col text-right">
              <span className="text-quant-muted hidden xs:inline uppercase">{PAIRS.find(p => p.symbol === activeSymbol)?.label}</span>
              <span className={cn(
                "leading-none font-bold transition-all duration-300",
                priceFlash === 'up' ? "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" : 
                priceFlash === 'down' ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : 
                "text-quant-green"
              )}>
                {lastPrice !== null && !isNaN(lastPrice) ? formatPrice(lastPrice) : "---"}
              </span>
            </div>
            <div className="h-6 sm:h-8 w-[1px] bg-quant-border" />
            <span className="text-quant-muted uppercase hidden sm:inline">NYC SESSION</span>
            <span className="text-quant-green font-bold animate-pulse sm:hidden">●</span>
          </div>
        </div>
      </header>

      {/* Push Notification Permission Top Prompt Banner */}
      {notificationPermission === 'default' && !dismissedNotificationBanner && (
        <div className="bg-quant-green text-black px-4 py-2 text-[9px] sm:text-[10px] font-mono font-black flex flex-col xs:flex-row items-center justify-between shrink-0 gap-2 border-b border-quant-green/40 shadow-md z-[45]">
          <div className="flex items-center gap-2 text-center xs:text-left">
            <Bell className="w-3.5 h-3.5 text-black animate-bounce shrink-0" />
            <span className="uppercase tracking-wide">
              Enable Desktop Push Notifications to receive pattern signals in background?
            </span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={async () => {
                const granted = await requestNotificationPermission();
                if (granted) {
                  setPushNotificationsEnabled(true);
                  setTimeout(() => {
                    try {
                      new Notification("🔔 Quant Terminal active", {
                        body: "Live alerts are fully configured and ready! You can now minimize your browser safely.",
                        icon: "https://cdn-icons-png.flaticon.com/512/179/179386.png",
                        tag: "quant-terminal-ready"
                      });
                    } catch (e) {
                      console.warn(e);
                    }
                  }, 400);
                }
              }}
              className="bg-black text-quant-green hover:bg-zinc-900 border border-black/10 px-2.5 py-1 rounded font-black text-[8.5px] uppercase transition-all shadow-sm cursor-pointer"
            >
              Yes, Enable
            </button>
            <button
              onClick={() => {
                setDismissedNotificationBanner(true);
              }}
              className="bg-transparent hover:underline text-black/70 hover:text-black px-1.5 py-1 font-bold uppercase transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div className={cn(
          "absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 w-64 shrink-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <Sidebar 
            activeType={activeIndicator} 
            onSelect={handleSelectIndicator} 
            settings={indicatorSettings}
            onToggleIndicator={(key) => {
              const newSettings = { 
                ...indicatorSettings, 
                [key]: { ...indicatorSettings[key], enabled: !indicatorSettings[key].enabled } 
              };
              setIndicatorSettings(newSettings);
              localStorage.setItem('indicatorSettings', JSON.stringify(newSettings));
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </div>

        {/* Central Area */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto w-full space-y-4 sm:space-y-6">
            {activeMainTab === 'trading' ? (
              <TradePlatform
                activeSymbol={activeSymbol}
                pairs={PAIRS}
                lastPrice={lastPrice}
                timeframe={activeTimeframe}
                onSymbolChange={setActiveSymbol}
                theme={theme}
                balance={balance}
                setBalance={setBalance}
                positions={positions}
                setPositions={setPositions}
                history={history}
                setHistory={setHistory}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">
                  {/* Chart Panel */}
                  <div className="xl:col-span-8 flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-quant-border/50 pb-2">
                       <div className="flex items-center gap-1.5 bg-quant-surface p-1 rounded-lg border border-quant-border/40">
                          <button
                            onClick={() => setChartMode('indicators')}
                            className={cn(
                              "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded transition-all cursor-pointer",
                              chartMode === 'indicators' 
                                ? "bg-quant-green text-black font-black" 
                                : "text-quant-muted hover:text-quant-text"
                            )}
                          >
                            AI Indicators Matrix
                          </button>
                          <button
                            onClick={() => setChartMode('tradingview')}
                            className={cn(
                              "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded transition-all cursor-pointer",
                              chartMode === 'tradingview' 
                                ? "bg-quant-green text-black font-black" 
                                : "text-quant-muted hover:text-quant-text"
                            )}
                          >
                            TradingView Live Monitor
                          </button>
                       </div>
    
                       <div className="flex items-center gap-3">
                          {chartMode === 'indicators' && (
                            <div className="hidden sm:flex items-center bg-quant-surface p-1 rounded-lg border border-quant-border/40 mr-2">
                              <button
                                onClick={() => setChartStyle('candlestick')}
                                className={cn(
                                  "p-1.5 rounded transition-all",
                                  chartStyle === 'candlestick' ? "bg-quant-text text-quant-bg" : "text-quant-muted hover:text-quant-text"
                                )}
                                title="Candlestick Chart"
                              >
                                <CandlestickChart className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setChartStyle('bar')}
                                className={cn(
                                  "p-1.5 rounded transition-all",
                                  chartStyle === 'bar' ? "bg-quant-text text-quant-bg" : "text-quant-muted hover:text-quant-text"
                                )}
                                title="Bar Chart"
                              >
                                <BarChart4 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setChartStyle('line')}
                                className={cn(
                                  "p-1.5 rounded transition-all",
                                  chartStyle === 'line' ? "bg-quant-text text-quant-bg" : "text-quant-muted hover:text-quant-text"
                                )}
                                title="Line Chart"
                              >
                                <Activity className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-quant-muted uppercase font-bold">TF:</span>
                            <select 
                              value={activeTimeframe}
                              onChange={(e) => setActiveTimeframe(e.target.value as Timeframe)}
                              className="bg-quant-bg border border-quant-border text-[9px] font-mono text-quant-green px-2 py-1 rounded outline-none cursor-pointer hover:border-quant-green/60"
                            >
                              <option value="1m">1m</option>
                              <option value="5m">5m</option>
                              <option value="15m">15m</option>
                              <option value="30m">30m</option>
                              <option value="1h">1h</option>
                              <option value="4h">4h</option>
                              <option value="1d">1D</option>
                              <option value="1w">1W</option>
                            </select>
                          </div>
                       </div>
                    </div>
                    
                    <div className="bg-quant-surface border border-quant-border rounded overflow-hidden p-2 sm:p-4 min-h-[450px] flex flex-col justify-center relative">
                      {error && (
                        <div className="absolute top-2 left-2 right-2 bg-red-950/90 border border-red-500/30 text-red-200 text-[9px] font-mono px-3 py-1.5 rounded flex items-center justify-between z-50 backdrop-blur-sm">
                          <span className="font-bold flex items-center gap-1.5 text-[8.5px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            EXTERNAL DATA FEED FEEDBACK: {error} (SIMULATED DATA ACTIVE)
                          </span>
                          <button 
                            onClick={() => fetchMarketData(activeSymbol, activeTimeframe)}
                            className="bg-red-800 hover:bg-red-700 font-extrabold uppercase px-1.5 py-0.5 rounded cursor-pointer transition text-white text-[8px]"
                          >
                            Re-Sync
                          </button>
                        </div>
                      )}
                      {processedData.length > 0 ? (
                        <>
                          {chartMode === 'tradingview' ? (
                            <TradingViewChart symbol={activeSymbol} timeframe={activeTimeframe} theme={theme} />
                          ) : activeIndicator === 'DEPTH' ? (
                            <div className="flex-1 min-h-[500px]">
                              <MarketDepth data={processedData} />
                            </div>
                          ) : (
                            <>
                              <IndicatorChart 
                                data={processedData} 
                                type={activeIndicator} 
                                patterns={activePatterns} 
                                levels={activeLevels}
                                fibSettings={fibSettings}
                                indicatorSettings={indicatorSettings}
                                chartStyle={chartStyle}
                              />
                              <SubIndicatorChart 
                                data={processedData} 
                                type={activeIndicator} 
                                indicatorSettings={indicatorSettings}
                                chartStyle={chartStyle}
                              />
                            </>
                          )}
                          
                          <div className="pt-4">
                            <MarketAnalysis 
                              data={processedData} 
                              patterns={activePatterns} 
                              levels={activeLevels} 
                              activeSymbol={activeSymbol}
                              onExecuteTrade={handleExecuteTradeFromSignal}
                            />
                          </div>
                        </>
                      ) : !error && (
                        <div className="flex flex-col items-center gap-4 py-20">
                           <RefreshCw className="w-6 h-6 text-quant-green animate-spin opacity-50" />
                           <span className="text-[10px] font-mono text-quant-muted tracking-widest uppercase">Initializing Stream...</span>
                        </div>
                      )}
                    </div>
                  </div>
    
                  {/* Insights Column */}
                  <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                      <MultiTimeframeStatus 
                        currentTF={activeTimeframe} 
                        onTFChange={setActiveTimeframe} 
                        data={processedData} 
                      />
                      <div className="bg-quant-surface border border-quant-border rounded p-4 sm:p-5">
                        <h3 className="text-[10px] sm:text-[11px] font-bold text-quant-text uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Zap className="w-3 h-3 text-quant-orange" />
                           Volatility Monitor
                        </h3>
                        <div className="space-y-2">
                           {processedData.length > 0 ? (
                             <>
                               <div className="flex items-center justify-between p-1.5 hover:bg-quant-text/5 rounded transition-colors">
                                  <span className="text-[9px] sm:text-[10px] text-quant-muted">RSI (14)</span>
                                  <span className={cn(
                                    "text-[9px] sm:text-[10px] font-mono font-bold",
                                    (processedData[processedData.length-1].rsi || 0) > 70 ? "text-quant-red" : 
                                    (processedData[processedData.length-1].rsi || 0) < 30 ? "text-quant-green" : "text-quant-muted"
                                  )}>
                                    {formatPrice(processedData[processedData.length-1].rsi ?? NaN)}
                                  </span>
                               </div>
                               <div className="flex items-center justify-between p-1.5 hover:bg-quant-text/5 rounded transition-colors">
                                  <span className="text-[9px] sm:text-[10px] text-quant-muted">BB Width</span>
                                  <span className="text-[9px] sm:text-[10px] font-mono text-quant-blue">
                                    {processedData[processedData.length-1].bBands ? 
                                      formatPrice(processedData[processedData.length-1].bBands!.upper - processedData[processedData.length-1].bBands!.lower) : "---"}
                                  </span>
                               </div>
                             </>
                           ) : (
                             <div className="text-[9px] text-quant-muted italic">Scanning bands...</div>
                           )}
                        </div>
                     </div>
    
                      <div className="bg-quant-surface border border-quant-border rounded p-4 sm:p-5">
                        <h3 className="text-[10px] sm:text-[11px] font-bold text-quant-text uppercase tracking-widest mb-4 flex items-center gap-2">
                           <Settings2 className="w-3 h-3 text-quant-blue" />
                           Key Levels
                        </h3>
                        <div className="space-y-2">
                           {processedData.length > 0 ? (
                             <>
                               <div className="flex items-center justify-between p-1.5 hover:bg-quant-text/5 rounded transition-colors">
                                  <span className="text-[9px] sm:text-[10px] text-quant-muted">MA 20 (SMA)</span>
                                  <span className="text-[9px] sm:text-[10px] font-mono text-quant-green">
                                    {processedData[processedData.length-1].ma ? formatPrice(processedData[processedData.length-1].ma!) : "---"}
                                  </span>
                               </div>
                               <div className="flex items-center justify-between p-1.5 hover:bg-quant-text/5 rounded transition-colors">
                                  <span className="text-[9px] sm:text-[10px] text-quant-muted">EMA 50</span>
                                  <span className="text-[9px] sm:text-[10px] font-mono text-quant-blue">
                                    {processedData[processedData.length-1].ema ? formatPrice(processedData[processedData.length-1].ema!) : "---"}
                                  </span>
                               </div>
                             </>
                           ) : (
                             <div className="text-[9px] text-quant-muted italic">Calculating levels...</div>
                           )}
                        </div>
                     </div>
    
                     <PatternScanner patterns={activePatterns} data={processedData} />
    
                     <AlertsManager 
                        alerts={alerts} 
                        onAddAlert={handleAddAlert}
                        onDeleteAlert={handleDeleteAlert}
                        availablePairs={PAIRS}
                        currentSymbol={activeSymbol}
                     />
                  </div>
                </div>
    
                {(activeIndicator === 'FIB' || activeIndicator === 'ALL') && (
                  <FibonacciConfig settings={fibSettings} onChange={setFibSettings} />
                )}
    
                <div className="pt-4 pb-8 sm:pb-0">
                  <IndicatorDetails type={activeIndicator} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Bottom Status Bar */}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={indicatorSettings}
        onChange={setIndicatorSettings}
        theme={theme}
        onThemeChange={setTheme}
        pushNotificationsEnabled={pushNotificationsEnabled}
        onTogglePushNotifications={setPushNotificationsEnabled}
        notificationPermission={notificationPermission}
        onRequestPermission={requestNotificationPermission}
        onSendTestNotification={sendTestNotification}
      />

      <footer className="h-6 bg-quant-green text-black px-4 flex items-center justify-between font-mono text-[9px] font-bold shrink-0">
        <div className="flex space-x-4 sm:space-x-8">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
            <span className="hidden xs:inline">LATENCY:</span> 14MS
          </div>
          <span className="hidden xs:inline">SESSION: LONDON</span>
          <span className="hidden sm:inline">SIGNALS: 12 TOTAL</span>
        </div>
        <div className="hidden lg:block truncate ml-4 uppercase">
          Feed: Yahoo Finance API (Polling) // {activeSymbol}
        </div>
      </footer>
    </div>
  );
}

