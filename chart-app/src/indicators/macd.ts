import { calcEMA } from './ema';

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function calcMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): MACDResult {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);

  const macdLine: (number | null)[] = emaFast.map((f, i) => {
    const s = emaSlow[i];
    return f !== null && s !== null ? f - s : null;
  });

  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalRaw = calcEMA(macdValues, signal);
  const signalLine: (number | null)[] = [];
  let filled = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null);
    } else {
      signalLine.push(signalRaw[filled] ?? null);
      filled++;
    }
  }

  const histogram = macdLine.map((m, i) => {
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });

  return { macd: macdLine, signal: signalLine, histogram };
}
