// VuManChu Cipher B - open source formula (Pine Script port)
// Combina: WaveTrend Oscillator + MFI + RSI + Stoch RSI

function ema(src: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [src[0]];
  for (let i = 1; i < src.length; i++) {
    out.push(src[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function hlc3(h: number[], l: number[], c: number[]): number[] {
  return h.map((_, i) => (h[i] + l[i] + c[i]) / 3);
}

export interface CipherBResult {
  wt1: number[];
  wt2: number[];
  mfi: number[];
  rsi: number[];
  // buy/sell dots
  buyDots: boolean[];
  sellDots: boolean[];
}

export function calcCipherB(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  wtChannelLen = 9,
  wtAvgLen = 12,
  wtMaLen = 3,
  mfiPeriod = 60,
  rsiPeriod = 14
): CipherBResult {
  const n = closes.length;
  const ap = hlc3(highs, lows, closes);

  // WaveTrend
  const esa = ema(ap, wtChannelLen);
  const d = ema(ap.map((v, i) => Math.abs(v - esa[i])), wtChannelLen);
  const ci = ap.map((v, i) => d[i] !== 0 ? (v - esa[i]) / (0.015 * d[i]) : 0);
  const tci = ema(ci, wtAvgLen);
  const wt1 = tci;
  const wt2 = ema(wt1, wtMaLen);

  // MFI (Money Flow Index) color
  const mfi: number[] = new Array(mfiPeriod - 1).fill(0);
  for (let i = mfiPeriod - 1; i < n; i++) {
    const slice_h = highs.slice(i - mfiPeriod + 1, i + 1);
    const slice_l = lows.slice(i - mfiPeriod + 1, i + 1);
    const slice_v = volumes.slice(i - mfiPeriod + 1, i + 1);
    const slice_c = closes.slice(i - mfiPeriod + 1, i + 1);
    let posFlow = 0, negFlow = 0;
    for (let j = 1; j < mfiPeriod; j++) {
      const tp = (slice_h[j] + slice_l[j] + slice_c[j]) / 3;
      const prevTp = (slice_h[j - 1] + slice_l[j - 1] + slice_c[j - 1]) / 3;
      const mfVal = tp * slice_v[j];
      if (tp > prevTp) posFlow += mfVal;
      else negFlow += mfVal;
    }
    const mfr = negFlow === 0 ? 100 : posFlow / negFlow;
    mfi.push(100 - 100 / (1 + mfr));
  }

  // RSI
  const rsi: number[] = new Array(rsiPeriod).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= rsiPeriod; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff);
  }
  avgGain /= rsiPeriod; avgLoss /= rsiPeriod;
  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = rsiPeriod + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (rsiPeriod - 1) + Math.max(diff, 0)) / rsiPeriod;
    avgLoss = (avgLoss * (rsiPeriod - 1) + Math.max(-diff, 0)) / rsiPeriod;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  // Buy/Sell dots: WT crossover
  const buyDots = wt1.map((_, i) => {
    if (i === 0) return false;
    return wt1[i - 1] < wt2[i - 1] && wt1[i] >= wt2[i] && wt1[i] < -53;
  });
  const sellDots = wt1.map((_, i) => {
    if (i === 0) return false;
    return wt1[i - 1] > wt2[i - 1] && wt1[i] <= wt2[i] && wt1[i] > 53;
  });

  return { wt1, wt2, mfi, rsi, buyDots, sellDots };
}
