import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewChartProps {
  symbol: string;
  timeframe: string;
  theme?: 'dark' | 'light' | 'system';
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol, timeframe, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTVLoaded, setIsTVLoaded] = useState(false);
  const [containerId] = useState(() => `tradingview_${Math.floor(Math.random() * 1000000)}`);

  const getTVSymbol = (s: string) => {
    const clean = s.replace('=X', '').toUpperCase();
    
    // Forex
    if (s.endsWith('=X')) {
      return `FX:${clean}`;
    }
    
    // Commodities
    if (s === 'GC=F') return 'TVC:GOLD';
    if (s === 'CL=F') return 'TVC:USOIL';
    if (s === 'SI=F') return 'TVC:SILVER';
    
    // Crypto
    if (s === 'BTC-USD') return 'BINANCE:BTCUSD';
    if (s === 'ETH-USD') return 'BINANCE:ETHUSD';
    if (s === 'SOL-USD') return 'BINANCE:SOLUSD';
    if (s === 'ADA-USD') return 'BINANCE:ADAUSD';
    
    // Indices
    if (s === '^GSPC') return 'SP:SPX';
    if (s === '^NDX') return 'NASDAQ:IXIC';
    if (s === '^DJI') return 'DJ:DJI';
    if (s === '^N225') return 'TSE:NI225';
    if (s === '^GDAXI') return 'INDEX:DAX';
    if (s === '^FTSE') return 'INDEX:UKX';
    
    // OTC / Stock
    return `NASDAQ:${clean}`;
  };

  const getTVInterval = (tf: string) => {
    switch (tf) {
      case '1m': return '1';
      case '5m': return '5';
      case '15m': return '15';
      case '30m': return '30';
      case '1h': return '60';
      case '4h': return '240';
      case '1d': return 'D';
      case '1w': return 'W';
      default: return '240';
    }
  };

  const resolvedTheme = (() => {
    if (theme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark';
    }
    if (theme === 'dark' || theme === 'light') return theme;
    
    // Fallback: sniff documentElement class list
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }
    return 'dark';
  })();

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    const tvScriptId = 'tradingview-widget-loading-script';

    const initWidget = () => {
      if (window.TradingView && containerRef.current) {
        setIsTVLoaded(true);
        try {
          new window.TradingView.widget({
            autosize: true,
            symbol: getTVSymbol(symbol),
            interval: getTVInterval(timeframe),
            timezone: "Etc/UTC",
            theme: resolvedTheme,
            style: "1",
            locale: "en",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: containerId,
            studies: [
              "RSI@tv-basicstudies",
              "MASimple@tv-basicstudies"
            ],
            disabled_features: ["use_localstorage_for_settings_events"],
            enabled_features: ["study_templates"]
          });
        } catch (e) {
          console.error("TradingView initialization error:", e);
        }
      }
    };

    // Check if the script already exists on the body
    const existingScript = document.getElementById(tvScriptId) as HTMLScriptElement | null;

    if (!existingScript) {
      script = document.createElement('script');
      script.id = tvScriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        initWidget();
      };
      document.head.appendChild(script);
    } else {
      // Script is present, wait until loaded if it isn't, or init directly
      if (window.TradingView) {
        initWidget();
      } else {
        existingScript.addEventListener('load', initWidget);
      }
    }

    return () => {
      if (existingScript) {
        existingScript.removeEventListener('load', initWidget);
      }
    };
  }, [symbol, timeframe, containerId, resolvedTheme]);

  return (
    <div className="w-full h-[480px] bg-quant-bg rounded-lg border border-quant-border/30 overflow-hidden relative flex flex-col">
      {!isTVLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-quant-bg/95 z-40">
          <RefreshCw className="w-5 h-5 text-quant-green animate-spin opacity-50" />
          <span className="text-[10px] font-mono text-quant-muted tracking-widest uppercase">
            Loading Real-Time Interactive Chart...
          </span>
        </div>
      )}
      <div id={containerId} ref={containerRef} className="w-full flex-1" />
    </div>
  );
};
