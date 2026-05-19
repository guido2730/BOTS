export interface StochasticResult {
  k: (number | null)[];
  d: (number | null)[];
}

export function calcStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod = 14,
  dPeriod = 3
): StochasticResult {
  const kRaw: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) { kRaw.push(null); continue; }
    const slice_h = highs.slice(i - kPeriod + 1, i + 1);
    const slice_l = lows.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...slice_h);
    const ll = Math.min(...slice_l);
    kRaw.push(hh === ll ? 0 : ((closes[i] - ll) / (hh - ll)) * 100);
  }

  const d: (number | null)[] = [];
  for (let i = 0; i < kRaw.length; i++) {
    if (i < kPeriod - 1 + dPeriod - 1) { d.push(null); continue; }
    const slice = kRaw.slice(i - dPeriod + 1, i + 1).filter((v): v is number => v !== null);
    d.push(slice.length === dPeriod ? slice.reduce((a, b) => a + b, 0) / dPeriod : null);
  }

  return { k: kRaw, d };
}
