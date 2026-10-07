import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2, Sliders, Eye, EyeOff, Sun, Moon, Monitor, Bell } from 'lucide-react';
import { IndicatorSettings } from '../types';
import { cn } from '../App';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: IndicatorSettings;
  onChange: (settings: IndicatorSettings) => void;
  theme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
  pushNotificationsEnabled?: boolean;
  onTogglePushNotifications?: (enabled: boolean) => void;
  notificationPermission?: 'default' | 'granted' | 'denied' | 'unsupported';
  onRequestPermission?: () => Promise<boolean>;
  onSendTestNotification?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  theme,
  onThemeChange,
  pushNotificationsEnabled = false,
  onTogglePushNotifications,
  notificationPermission = 'unsupported',
  onRequestPermission,
  onSendTestNotification
}) => {
  const updateSetting = (indicator: keyof IndicatorSettings, field: string, value: any) => {
    onChange({
      ...settings,
      [indicator]: {
        ...settings[indicator],
        [field]: value
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-quant-surface border-l border-quant-border shadow-2xl z-[101] flex flex-col"
          >
            <div className="p-4 border-b border-quant-border flex items-center justify-between bg-quant-surface/50">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-quant-blue" />
                <h2 className="text-xs font-black uppercase tracking-widest text-quant-text">Indicator Config</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-quant-text/5 rounded-full transition-colors text-quant-muted hover:text-quant-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {/* Application Style & Theme */}
              {theme && onThemeChange && (
                <section className="space-y-3 pb-4 border-b border-quant-border/40">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-3 h-3 text-quant-green" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Application Theme</span>
                  </div>
                  <div className="flex bg-quant-bg border border-quant-border p-0.5 rounded-lg">
                    {([
                      { mode: 'light', label: 'Light', icon: Sun },
                      { mode: 'dark', label: 'Dark', icon: Moon },
                      { mode: 'system', label: 'System', icon: Monitor }
                    ] as const).map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onThemeChange(mode)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold uppercase rounded transition-all cursor-pointer",
                          theme === mode 
                            ? "bg-quant-surface text-quant-green font-extrabold border border-quant-border/30 shadow-sm" 
                            : "text-quant-muted hover:text-quant-text"
                        )}
                      >
                        <Icon className="w-3" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[8px] text-quant-muted italic">
                    {theme === 'system' 
                      ? "Matching your device's active color scheme dynamic preferences." 
                      : `Palette preference locked to ${theme} workspace theme.`}
                  </p>
                </section>
              )}

              {/* Push Notifications Configuration */}
              <section className="space-y-3 pb-4 border-b border-quant-border/40">
                <div className="flex items-center gap-2">
                  <Bell className="w-3 h-3 text-quant-green" />
                  <span className="text-[10px] font-bold uppercase text-quant-text">Desktop Push Notifications</span>
                </div>
                
                {notificationPermission === 'unsupported' ? (
                  <div className="bg-quant-bg border border-quant-border p-3 rounded-lg text-center space-y-2">
                    <p className="text-[10px] text-quant-text font-semibold">Browser Notifications Restricted</p>
                    <p className="text-[8px] text-quant-muted leading-relaxed">
                      Your current browser sandbox, local origin, or iframe container does not support standard Desktop Notifications. 
                      Try opening the application in a new web tab.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-quant-bg border border-quant-border p-2.5 rounded-lg">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold uppercase text-quant-text">Enable Desktop Push</span>
                        <p className="text-[8px] text-quant-muted">Receive popups when browser is minimized</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (onTogglePushNotifications) {
                            if (!pushNotificationsEnabled && onRequestPermission) {
                              const granted = await onRequestPermission();
                              if (granted) {
                                onTogglePushNotifications(true);
                              }
                            } else {
                              onTogglePushNotifications(!pushNotificationsEnabled);
                            }
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          pushNotificationsEnabled ? "bg-quant-green" : "bg-quant-border"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                            pushNotificationsEnabled ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Permission status indicator and request control */}
                    <div className="flex items-center justify-between text-[8px] px-1">
                      <div className="flex items-center gap-1.5 font-bold uppercase">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          notificationPermission === 'granted' ? "bg-quant-green animate-pulse" :
                          notificationPermission === 'denied' ? "bg-red-500" : "bg-yellow-500"
                        )} />
                        <span className="text-quant-muted">
                          Permission: {notificationPermission}
                        </span>
                      </div>
                      
                      {notificationPermission === 'default' && onRequestPermission && (
                        <button
                          type="button"
                          onClick={() => onRequestPermission()}
                          className="text-quant-green hover:underline font-extrabold uppercase bg-quant-green/5 hover:bg-quant-green/10 border border-quant-green/30 px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          Request Access
                        </button>
                      )}
                    </div>

                    {notificationPermission === 'denied' && (
                      <div className="text-[8px] text-red-400 bg-red-950/20 border border-red-900/30 p-2 rounded leading-relaxed space-y-1">
                        <p className="font-bold">⚠️ Permissions Blocked.</p>
                        <p>Please check your browser's site settings to unlock notifications, or open the preview in a new browser tab.</p>
                      </div>
                    )}

                    {notificationPermission === 'granted' && onSendTestNotification && (
                      <div className="pt-1 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={onSendTestNotification}
                          className={cn(
                            "w-full py-1.5 text-[9px] font-black uppercase tracking-wider font-mono border rounded-lg transition-all cursor-pointer shadow-sm",
                            pushNotificationsEnabled
                              ? "text-quant-green hover:text-white bg-quant-green/10 hover:bg-quant-green border-quant-green/30 hover:border-transparent hover:shadow-quant-green/20"
                              : "text-quant-muted bg-quant-border/10 border-quant-border/30 cursor-not-allowed"
                          )}
                          disabled={!pushNotificationsEnabled}
                        >
                          Send Test Notification 🚀
                        </button>
                        <p className="text-[7.5px] text-quant-muted text-center italic">
                          Test works even with minimized browser or inactive tabs.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>
              {/* Moving Average (MA) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-green" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Moving Average (SMA)</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('ma', 'enabled', !settings.ma.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.ma.enabled ? "text-quant-green bg-quant-green/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.ma.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">Lookback Period</label>
                    <input
                      type="number"
                      value={settings.ma.period}
                      onChange={(e) => updateSetting('ma', 'period', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-2 py-1.5 text-[10px] font-mono text-quant-green focus:border-quant-green/50 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* EMA */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-blue" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Exponential MA (EMA)</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('ema', 'enabled', !settings.ema.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.ema.enabled ? "text-quant-blue bg-quant-blue/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.ema.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">Smoothing Period</label>
                    <input
                      type="number"
                      value={settings.ema.period}
                      onChange={(e) => updateSetting('ema', 'period', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-2 py-1.5 text-[10px] font-mono text-quant-blue focus:border-quant-blue/50 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* RSI */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-orange" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Relative Strength Index</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('rsi', 'enabled', !settings.rsi.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.rsi.enabled ? "text-quant-orange bg-quant-orange/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.rsi.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">RSI Period</label>
                    <input
                      type="number"
                      value={settings.rsi.period}
                      onChange={(e) => updateSetting('rsi', 'period', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-2 py-1.5 text-[10px] font-mono text-quant-orange focus:border-quant-orange/50 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* MACD */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-red" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">MACD Oscillator</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('macd', 'enabled', !settings.macd.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.macd.enabled ? "text-quant-red bg-quant-red/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.macd.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">Fast</label>
                    <input
                      type="number"
                      value={settings.macd.fast}
                      onChange={(e) => updateSetting('macd', 'fast', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-1.5 py-1 text-[10px] font-mono text-quant-red focus:border-quant-red/50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">Slow</label>
                    <input
                      type="number"
                      value={settings.macd.slow}
                      onChange={(e) => updateSetting('macd', 'slow', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-1.5 py-1 text-[10px] font-mono text-quant-red focus:border-quant-red/50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">Signal</label>
                    <input
                      type="number"
                      value={settings.macd.signal}
                      onChange={(e) => updateSetting('macd', 'signal', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-1.5 py-1 text-[10px] font-mono text-quant-red focus:border-quant-red/50 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Bollinger Bands */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-blue" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Bollinger Bands</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('bb', 'enabled', !settings.bb.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.bb.enabled ? "text-quant-blue bg-quant-blue/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.bb.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">Period</label>
                    <input
                      type="number"
                      value={settings.bb.period}
                      onChange={(e) => updateSetting('bb', 'period', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-2 py-1.5 text-[10px] font-mono text-quant-blue focus:border-quant-blue/50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">Std Dev</label>
                    <input
                      type="number"
                      step={0.1}
                      value={settings.bb.stdDev}
                      onChange={(e) => updateSetting('bb', 'stdDev', parseFloat(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-2 py-1.5 text-[10px] font-mono text-quant-blue focus:border-quant-blue/50 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* SuperTrend */}
              <section className="space-y-3 pb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-green" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">SuperTrend</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('superTrend', 'enabled', !settings.superTrend.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.superTrend.enabled ? "text-quant-green bg-quant-green/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.superTrend.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">ATR Period</label>
                    <input
                      type="number"
                      value={settings.superTrend.period}
                      onChange={(e) => updateSetting('superTrend', 'period', parseInt(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-2 py-1.5 text-[10px] font-mono text-quant-green focus:border-quant-green/50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-quant-muted uppercase font-bold">ATR Multiplier</label>
                    <input
                      type="number"
                      step={0.1}
                      value={settings.superTrend.multiplier}
                      onChange={(e) => updateSetting('superTrend', 'multiplier', parseFloat(e.target.value) || 1)}
                      className="w-full bg-quant-bg border border-quant-border rounded px-2 py-1.5 text-[10px] font-mono text-quant-green focus:border-quant-green/50 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Elliott Wave */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-blue" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Elliott Wave Theory</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('elliott', 'enabled', !settings.elliott?.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.elliott?.enabled ? "text-quant-blue bg-quant-blue/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.elliott?.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[8px] text-quant-muted italic">Dynamic wave counting based on significant price extrema.</p>
              </section>

              {/* Fibonacci */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-green" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Fibonacci Levels</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('fib', 'enabled', !settings.fib?.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.fib?.enabled ? "text-quant-green bg-quant-green/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.fib?.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[8px] text-quant-muted italic">Standard Fibonacci retracement levels from visible range.</p>
              </section>

              {/* Support & Resistance */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-orange" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Support & Resistance</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('sr', 'enabled', !settings.sr?.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.sr?.enabled ? "text-quant-orange bg-quant-orange/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.sr?.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[8px] text-quant-muted italic">Key institutional pivot points and volume clusters.</p>
              </section>

              {/* Candlestick Patterns */}
              <section className="space-y-3 pb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-quant-red" />
                    <span className="text-[10px] font-bold uppercase text-quant-text">Pattern Scanning</span>
                  </div>
                  <button 
                    onClick={() => updateSetting('patterns', 'enabled', !settings.patterns?.enabled)}
                    className={cn(
                      "p-1 rounded transition-colors",
                      settings.patterns?.enabled ? "text-quant-red bg-quant-red/10" : "text-quant-muted bg-quant-border/30"
                    )}
                  >
                    {settings.patterns?.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[8px] text-quant-muted italic">Real-time detection of high-probability candle formations.</p>
              </section>
            </div>

            <div className="p-4 border-t border-quant-border bg-quant-surface/50">
               <button
                onClick={onClose}
                className="w-full py-2 bg-quant-green text-black font-black uppercase text-[10px] tracking-widest rounded shadow-lg shadow-quant-green/20 hover:bg-quant-green/80 transition-all"
               >
                Commit Changes
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
