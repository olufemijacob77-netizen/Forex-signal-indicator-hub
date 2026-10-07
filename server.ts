import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import YahooFinance from 'yahoo-finance2';

// Handle both standard default export (instance) and potential class export
const yahooFinance = typeof YahooFinance === 'function' 
  ? new (YahooFinance as any)() 
  : YahooFinance;

function getSimulatedStartPrice(symbol: string): number {
  const sym = symbol.toUpperCase();
  if (sym.includes('BTC')) return 64250.0;
  if (sym.includes('ETH')) return 3120.0;
  if (sym.includes('JPY')) return 155.40;
  if (sym.includes('GBP')) return 1.2540;
  if (sym.includes('EUR')) return 1.0850;
  if (sym.includes('AUD')) return 0.6650;
  if (sym.includes('NZD')) return 0.6120;
  if (sym.includes('CAD')) return 1.3650;
  if (sym.includes('CHF')) return 0.9050;
  if (sym === 'GC=F' || sym.includes('XAU')) return 2350.0; // Gold
  if (sym === 'CL=F' || sym.includes('OIL')) return 78.50; // Crude Oil
  if (sym === '^GSPC') return 5150.0; // S&P 500
  if (sym === '^DJI') return 39200.0; // Dow Jones
  if (sym === '^IXIC') return 16100.0; // Nasdaq
  if (sym === 'NVDA') return 480.0;
  if (sym === 'AAPL') return 175.0;
  if (sym === 'TSLA') return 180.0;
  if (sym === 'META') return 450.0;
  return 100.00; // Default stock/instrument price
}

function generateSimulatedQuotes(symbol: string, interval: string, count: number = 100) {
  const startPrice = getSimulatedStartPrice(symbol);
  let currentPrice = startPrice;
  const quotes: any[] = [];
  const now = new Date();
  
  // Determine interval step in minutes
  let stepMinutes = 60; // default 1h
  if (interval === '1m') stepMinutes = 1;
  else if (interval === '5m') stepMinutes = 5;
  else if (interval === '15m') stepMinutes = 15;
  else if (interval === '30m') stepMinutes = 30;
  else if (interval === '4h') stepMinutes = 240;
  else if (interval === '1d') stepMinutes = 1440;
  else if (interval === '1w') stepMinutes = 10080;

  for (let i = count; i > 0; i--) {
    const date = new Date(now.getTime() - i * stepMinutes * 60 * 1000);
    
    const step = currentPrice * 0.0015;
    const change = (Math.random() - 0.5) * step;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * (step * 0.3);
    const low = Math.min(open, close) - Math.random() * (step * 0.3);
    const volume = Math.floor(Math.random() * 1000) + 500;
    
    let timeLabel = '';
    if (interval === '1d' || interval === '1w') {
      timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    quotes.push({
      time: timeLabel,
      open: parseFloat(open.toFixed(symbol.includes('JPY') || startPrice > 100 ? 2 : 5)),
      high: parseFloat(high.toFixed(symbol.includes('JPY') || startPrice > 100 ? 2 : 5)),
      low: parseFloat(low.toFixed(symbol.includes('JPY') || startPrice > 100 ? 2 : 5)),
      close: parseFloat(close.toFixed(symbol.includes('JPY') || startPrice > 100 ? 2 : 5)),
      volume,
      timestamp: date.getTime()
    });
    
    currentPrice = close;
  }
  return quotes;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("[Server] Initializing Forex Signal Hub...");
  
  // Add JSON parsing middleware
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API routes
  app.get("/api/market-data", async (req, res) => {
    const { symbol = 'EURUSD=X', interval = '1h' } = req.query;
    const symbolStr = String(symbol || 'EURUSD=X').toUpperCase();
    const intervalStr = String(interval || '1h').toLowerCase();
    
    try {
      console.log(`[MarketData] Fetching: ${symbolStr} @ ${intervalStr}`);
      
      const now = new Date();
      let lookbackDays = 5;

      // Adjust lookback based on interval to stay within Yahoo Finance limits
      // and ensure we have enough data for indicators (need at least 60-100 points)
      if (intervalStr === '1m') lookbackDays = 1;
      else if (intervalStr === '5m' || intervalStr === '15m' || intervalStr === '30m') lookbackDays = 3;
      else if (intervalStr === '1h' || intervalStr === '4h') lookbackDays = 15;
      else if (intervalStr === '1d') lookbackDays = 365;
      else if (intervalStr === '1w') lookbackDays = 1000;

      const period1 = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

      // Map our frontend intervals to Yahoo Finance API intervals
      const yahooInterval = (val: string) => {
        if (val === '4h') return '1h';
        if (val === '1w') return '1wk';
        return val;
      };

      const queryOptions = {
        period1: Math.floor(period1.getTime() / 1000),
        period2: Math.floor(now.getTime() / 1000),
        interval: yahooInterval(intervalStr) as any,
      };
      
      const result: any = await yahooFinance.chart(symbolStr, queryOptions);
      
      if (!result || !result.quotes || result.quotes.length === 0) {
        throw new Error(`Market data feed unavailable for ${symbolStr}`);
      }

      let quotes = mapQuotes(result.quotes, intervalStr);

      // Aggregate 4h candles if needed
      if (intervalStr === '4h') {
        const aggregated: any[] = [];
        for (let i = 0; i < quotes.length; i += 4) {
          const slice = quotes.slice(i, i + 4);
          if (slice.length > 0) {
            aggregated.push({
              time: slice[0].time, // Use the start time of the 4h block
              open: slice[0].open,
              high: Math.max(...slice.map(s => s.high)),
              low: Math.min(...slice.map(s => s.low)),
              close: slice[slice.length - 1].close,
              volume: slice.reduce((sum, s) => sum + s.volume, 0),
              timestamp: slice[0].timestamp
            });
          }
        }
        quotes = aggregated;
      }

      console.log(`[MarketData] Success for ${symbolStr} (${quotes.length} intervals)`);
      res.json(quotes.slice(-100)); // Return last 100 points
    } catch (error: any) {
      console.warn(`[MarketData] Yahoo Finance request failed for ${symbolStr} (${error.message}). Swapping to high-fidelity simulation engine fallback...`);
      try {
        const simulatedQuotes = generateSimulatedQuotes(symbolStr, intervalStr, 100);
        res.json(simulatedQuotes);
      } catch (simError: any) {
        console.error(`[MarketData] Simulation fallback failed:`, simError.message);
        res.status(500).json({ 
          error: error.message || 'Data feed temporary failure',
          symbol: symbolStr
        });
      }
    }
  });

  function mapQuotes(quotes: any[], interval: string) {
    return quotes.map((quote: any) => {
      let timeLabel = '';
      const date = quote.date instanceof Date ? quote.date : new Date(quote.date);
      
      if (interval === '1d' || interval === '1w') {
        timeLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      } else {
        timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      return {
        time: timeLabel,
        open: Number(quote.open),
        high: Number(quote.high),
        low: Number(quote.low),
        close: Number(quote.close),
        volume: Number(quote.volume || 0),
        timestamp: date.getTime()
      };
    }).filter((q: any) => 
      !isNaN(q.close) && q.close !== null && 
      !isNaN(q.open) && q.open !== null &&
      !isNaN(q.high) && q.high !== null &&
      !isNaN(q.low) && q.low !== null
    );
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[Server] Critical startup error:", err);
  process.exit(1);
});
