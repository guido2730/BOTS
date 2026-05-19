export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BASE = 'https://api.binance.com/api/v3';

export async function fetchCandles(
  symbol: string,
  interval: string,
  limit = 500
): Promise<Candle[]> {
  const url = `${BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const data: unknown[][] = await res.json();
  return data.map((k) => ({
    time: Number(k[0]) / 1000,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

export function subscribeTicker(
  symbol: string,
  interval: string,
  onCandle: (c: Candle) => void
): () => void {
  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`
  );
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const k = msg.k;
    if (k.x) {
      onCandle({
        time: k.t / 1000,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      });
    }
  };
  return () => ws.close();
}

export const CRYPTO_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',
  'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT',
  'LINKUSDT', 'DOTUSDT',
];

export const INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
