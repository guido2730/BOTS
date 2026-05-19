import { useState, useEffect, useCallback } from 'react';
import SymbolSelector from './components/SymbolSelector';
import IndicatorToggle, { IndicatorKey } from './components/IndicatorToggle';
import Chart from './components/Chart';
import { fetchCandles, subscribeTicker, Candle } from './data/binance';
import './App.css';

const DEFAULT_ACTIVE: Record<IndicatorKey, boolean> = {
  ema: true,
  bollinger: false,
  volume: true,
  rsi: true,
  macd: false,
  stochastic: false,
  cipherB: false,
};

export default function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [active, setActive] = useState<Record<IndicatorKey, boolean>>(DEFAULT_ACTIVE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchCandles(symbol, interval, 500).then(data => {
      setCandles(data);
      setLoading(false);
    });

    const unsub = subscribeTicker(symbol, interval, (newCandle) => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        if (last && last.time === newCandle.time) {
          return [...prev.slice(0, -1), newCandle];
        }
        return [...prev, newCandle];
      });
    });

    return unsub;
  }, [symbol, interval]);

  const handleToggle = useCallback((key: IndicatorKey) => {
    setActive(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <SymbolSelector
        symbol={symbol}
        interval={interval}
        onSymbol={setSymbol}
        onInterval={setInterval}
      />
      <IndicatorToggle active={active} onToggle={handleToggle} />
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6c5ce7', fontSize: 18 }}>
            Cargando {symbol}...
          </div>
        ) : (
          <Chart candles={candles} active={active} />
        )}
      </div>
    </div>
  );
}
