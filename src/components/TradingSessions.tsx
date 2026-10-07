import React, { useState, useEffect } from 'react';
import { Clock, Globe, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarketSession {
  name: string;
  start: number; // UTC Hour
  end: number;   // UTC Hour
  color: string;
}

const SESSIONS: MarketSession[] = [
  { name: 'Sydney', start: 22, end: 7, color: 'bg-blue-400' },
  { name: 'Tokyo', start: 0, end: 9, color: 'bg-quant-orange' },
  { name: 'London', start: 8, end: 17, color: 'bg-quant-blue' },
  { name: 'New York', start: 13, end: 22, color: 'bg-quant-green' },
];

export const TradingSessions: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getSessionStatus = (session: MarketSession) => {
    const utcHour = now.getUTCHours();
    const utcMin = now.getUTCMinutes();
    const utcSec = now.getUTCSeconds();
    
    const currentTotalSec = (utcHour * 3600) + (utcMin * 60) + utcSec;
    const startSec = session.start * 3600;
    const endSec = session.end * 3600;

    let isActive = false;
    let timeLeftSec = 0;
    let label = '';

    if (session.start < session.end) {
      isActive = utcHour >= session.start && utcHour < session.end;
    } else {
      // Overlays midnight (e.g., Sydney/Tokyo)
      isActive = utcHour >= session.start || utcHour < session.end;
    }

    if (isActive) {
      label = 'Closes in';
      // Calculate time until end
      let targetEndSec = endSec;
      if (utcHour >= session.start && session.start > session.end) {
          targetEndSec += 24 * 3600;
      }
      timeLeftSec = targetEndSec - currentTotalSec;
    } else {
      label = 'Opens in';
      // Calculate time until start
      let targetStartSec = startSec;
      if (utcHour >= session.end && targetStartSec <= utcHour) {
          targetStartSec += 24 * 3600;
      } else if (utcHour < session.start && session.start > session.end && utcHour >= session.end) {
          // already passed end, but before start
      }
      
      timeLeftSec = targetStartSec - currentTotalSec;
      if (timeLeftSec < 0) timeLeftSec += 24 * 3600;
    }

    const h = Math.floor(timeLeftSec / 3600);
    const m = Math.floor((timeLeftSec % 3600) / 60);
    const s = timeLeftSec % 60;

    return {
      isActive,
      countdown: `${h}h ${m}m ${s}s`,
      label
    };
  };

  return (
    <div className="space-y-3 p-4 bg-quant-surface/30 border border-quant-border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
           <Globe className="w-3.5 h-3.5 text-quant-muted" />
           <h3 className="text-[10px] font-black uppercase tracking-widest text-quant-text">World Markets</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-quant-bg px-2 py-0.5 rounded border border-quant-border">
           <Clock className="w-2.5 h-2.5 text-quant-blue" />
           <span className="text-[9px] font-mono font-bold text-quant-text">
             {now.getUTCHours().toString().padStart(2, '0')}:
             {now.getUTCMinutes().toString().padStart(2, '0')} UTC
           </span>
        </div>
      </div>

      <div className="space-y-2">
        {SESSIONS.map((session) => {
          const { isActive, countdown, label } = getSessionStatus(session);
          return (
            <div key={session.name} className="group relative">
               <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                     <div className={cn(
                       "w-1.5 h-1.5 rounded-full",
                       isActive ? session.color : "bg-quant-bg border border-quant-border"
                     )} />
                     <span className={cn(
                       "text-[10px] font-black uppercase tracking-tighter transition-colors",
                       isActive ? "text-quant-text" : "text-quant-muted"
                     )}>
                       {session.name}
                     </span>
                  </div>
                  <div className="text-right">
                     <span className="text-[7px] font-black text-quant-muted uppercase block leading-none mb-0.5">{label}</span>
                     <span className="text-[9px] font-mono font-bold text-quant-text tabular-nums">{countdown}</span>
                  </div>
               </div>
               
               <div className="h-1 bg-quant-bg rounded-full overflow-hidden border border-quant-border/10">
                  {isActive && (
                    <div className={cn("h-full animate-pulse opacity-50", session.color)} style={{ width: '100%' }} />
                  )}
               </div>

               {isActive && (
                 <Zap className={cn("absolute -left-5 top-1/2 -translate-y-1/2 w-3 h-3 animate-bounce", session.color.replace('bg-', 'text-'))} />
               )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-quant-border/20">
         <p className="text-[7px] text-quant-muted uppercase font-medium leading-tight">
            High volatility usually occurs during <span className="text-quant-blue font-bold">London/NY</span> overlap (13:00 - 17:00 UTC).
         </p>
      </div>
    </div>
  );
};
