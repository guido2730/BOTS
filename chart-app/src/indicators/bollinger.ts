export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function calcBollinger(closes: number[], period = 20, mult = 2): BollingerResult {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null); middle.push(null); lower.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - sma) ** 2, 0) / period;
    const stddev = Math.sqrt(variance);
    upper.push(sma + mult * stddev);
    middle.push(sma);
    lower.push(sma - mult * stddev);
  }
  return { upper, middle, lower };
}
