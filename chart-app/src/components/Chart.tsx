import { useEffect, useRef } from 'react';
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickSeries, LineSeries, HistogramSeries, AreaSeries,
  ColorType,
} from 'lightweight-charts';
import { Candle } from '../data/binance';
import { calcEMA } from '../indicators/ema';
import { calcRSI } from '../indicators/rsi';
import { calcMACD } from '../indicators/macd';
import { calcBollinger } from '../indicators/bollinger';
import { calcStochastic } from '../indicators/stochastic';
import { calcCipherB } from '../indicators/cipherB';
import type { IndicatorKey } from './IndicatorToggle';

interface Props {
  candles: Candle[];
  active: Record<IndicatorKey, boolean>;
}

const CHART_BG = '#0d0d1a';
const GRID = '#1a1a2e';

function toTime(t: number) { return t as unknown as import('lightweight-charts').Time; }

export default function Chart({ candles, active }: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  const stochRef = useRef<HTMLDivElement>(null);
  const cipherRef = useRef<HTMLDivElement>(null);
  const charts = useRef<IChartApi[]>([]);

  useEffect(() => {
    charts.current.forEach(c => c.remove());
    charts.current = [];
    if (!mainRef.current || candles.length < 30) return;

    const commonOpts = {
      layout: { background: { type: ColorType.Solid, color: CHART_BG }, textColor: '#aaa' },
      grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
      crosshair: { mode: 1 },
      timeScale: { borderColor: '#2d2d44', timeVisible: true },
      rightPriceScale: { borderColor: '#2d2d44' },
    };

    // ── Main chart ──────────────────────────────────────────────
    const main = createChart(mainRef.current, { ...commonOpts, height: 420 });
    charts.current.push(main);

    const candleSeries = main.addSeries(CandlestickSeries, {
      upColor: '#00b894', downColor: '#d63031',
      borderUpColor: '#00b894', borderDownColor: '#d63031',
      wickUpColor: '#00b894', wickDownColor: '#d63031',
    });
    candleSeries.setData(candles.map(c => ({ time: toTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));

    const closes = candles.map(c => c.close);
    const times = candles.map(c => c.time);

    // EMA 9, 21, 50
    if (active.ema) {
      const colors = ['#f5a623', '#e17055', '#74b9ff'];
      [9, 21, 50].forEach((p, idx) => {
        const vals = calcEMA(closes, p);
        const emaSeries = main.addSeries(LineSeries, { color: colors[idx], lineWidth: 1 });
        emaSeries.setData(
          vals.map((v, i) => v !== null ? { time: toTime(times[i]), value: v } : null).filter(Boolean) as { time: import('lightweight-charts').Time; value: number }[]
        );
      });
    }

    // Bollinger Bands
    if (active.bollinger) {
      const bb = calcBollinger(closes);
      const opts = { color: '#7ed6df', lineWidth: 1 as const, lineStyle: 2 };
      const upper = main.addSeries(LineSeries, opts);
      const middle = main.addSeries(LineSeries, { ...opts, lineStyle: 0 });
      const lower = main.addSeries(LineSeries, opts);
      const toSeries = (arr: (number | null)[]) =>
        arr.map((v, i) => v !== null ? { time: toTime(times[i]), value: v } : null).filter(Boolean) as { time: import('lightweight-charts').Time; value: number }[];
      upper.setData(toSeries(bb.upper));
      middle.setData(toSeries(bb.middle));
      lower.setData(toSeries(bb.lower));
    }

    // Volume (sub-panel inline)
    if (active.volume) {
      const volSeries = main.addSeries(HistogramSeries, {
        color: '#a29bfe', priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      main.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volSeries.setData(candles.map(c => ({
        time: toTime(c.time),
        value: c.volume,
        color: c.close >= c.open ? '#00b89466' : '#d6303166',
      })));
    }

    main.timeScale().fitContent();

    // ── RSI ─────────────────────────────────────────────────────
    if (active.rsi && rsiRef.current) {
      const rsiChart = createChart(rsiRef.current, { ...commonOpts, height: 130 });
      charts.current.push(rsiChart);
      const rsiVals = calcRSI(closes);
      const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#00b894', lineWidth: 2 });
      rsiSeries.setData(
        rsiVals.map((v, i) => v !== null ? { time: toTime(times[i]), value: v } : null).filter(Boolean) as { time: import('lightweight-charts').Time; value: number }[]
      );
      // Overbought/oversold lines
      [30, 50, 70].forEach(lvl => {
        const s = rsiChart.addSeries(LineSeries, { color: '#ffffff33', lineWidth: 1, lineStyle: 2 });
        s.setData(times.map(t => ({ time: toTime(t), value: lvl })));
      });
      rsiChart.timeScale().fitContent();
    }

    // ── MACD ────────────────────────────────────────────────────
    if (active.macd && macdRef.current) {
      const macdChart = createChart(macdRef.current, { ...commonOpts, height: 130 });
      charts.current.push(macdChart);
      const { macd, signal, histogram } = calcMACD(closes);
      const toS = (arr: (number | null)[]) =>
        arr.map((v, i) => v !== null ? { time: toTime(times[i]), value: v } : null).filter(Boolean) as { time: import('lightweight-charts').Time; value: number }[];

      const histSeries = macdChart.addSeries(HistogramSeries, { color: '#fd79a8' });
      histSeries.setData(
        histogram.map((v, i) => v !== null ? { time: toTime(times[i]), value: v, color: v >= 0 ? '#00b894aa' : '#d63031aa' } : null).filter(Boolean) as { time: import('lightweight-charts').Time; value: number; color: string }[]
      );
      const macdSeries = macdChart.addSeries(LineSeries, { color: '#fd79a8', lineWidth: 1 });
      macdSeries.setData(toS(macd));
      const signalSeries = macdChart.addSeries(LineSeries, { color: '#fdcb6e', lineWidth: 1 });
      signalSeries.setData(toS(signal));
      macdChart.timeScale().fitContent();
    }

    // ── Stochastic ───────────────────────────────────────────────
    if (active.stochastic && stochRef.current) {
      const stochChart = createChart(stochRef.current, { ...commonOpts, height: 130 });
      charts.current.push(stochChart);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const { k, d } = calcStochastic(highs, lows, closes);
      const toS = (arr: (number | null)[]) =>
        arr.map((v, i) => v !== null ? { time: toTime(times[i]), value: v } : null).filter(Boolean) as { time: import('lightweight-charts').Time; value: number }[];
      const kSeries = stochChart.addSeries(LineSeries, { color: '#fdcb6e', lineWidth: 2 });
      kSeries.setData(toS(k));
      const dSeries = stochChart.addSeries(LineSeries, { color: '#e17055', lineWidth: 1 });
      dSeries.setData(toS(d));
      [20, 80].forEach(lvl => {
        const s = stochChart.addSeries(LineSeries, { color: '#ffffff33', lineWidth: 1, lineStyle: 2 });
        s.setData(times.map(t => ({ time: toTime(t), value: lvl })));
      });
      stochChart.timeScale().fitContent();
    }

    // ── Cipher B ─────────────────────────────────────────────────
    if (active.cipherB && cipherRef.current) {
      const cipherChart = createChart(cipherRef.current, { ...commonOpts, height: 150 });
      charts.current.push(cipherChart);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const vols = candles.map(c => c.volume);
      const { wt1, wt2, buyDots, sellDots } = calcCipherB(highs, lows, closes, vols);

      const wt1Series = cipherChart.addSeries(LineSeries, { color: '#6c5ce7', lineWidth: 2 });
      wt1Series.setData(wt1.map((v, i) => ({ time: toTime(times[i]), value: v })));

      const wt2Series = cipherChart.addSeries(LineSeries, { color: '#fd79a8', lineWidth: 1 });
      wt2Series.setData(wt2.map((v, i) => ({ time: toTime(times[i]), value: v })));

      // Zero line
      const zero = cipherChart.addSeries(LineSeries, { color: '#ffffff22', lineWidth: 1, lineStyle: 2 });
      zero.setData(times.map(t => ({ time: toTime(t), value: 0 })));

      // OB/OS levels
      [-53, 53].forEach(lvl => {
        const s = cipherChart.addSeries(LineSeries, { color: '#ffffff33', lineWidth: 1, lineStyle: 3 });
        s.setData(times.map(t => ({ time: toTime(t), value: lvl })));
      });

      // Buy dots (green triangles via markers)
      const buyMarkers = buyDots
        .map((b, i) => b ? { time: toTime(times[i]), position: 'belowBar' as const, color: '#00b894', shape: 'arrowUp' as const, text: 'B' } : null)
        .filter(Boolean);
      const sellMarkers = sellDots
        .map((s, i) => s ? { time: toTime(times[i]), position: 'aboveBar' as const, color: '#d63031', shape: 'arrowDown' as const, text: 'S' } : null)
        .filter(Boolean);
      wt1Series.setMarkers([...buyMarkers, ...sellMarkers].sort((a, b) => (a!.time as number) - (b!.time as number)) as never);

      cipherChart.timeScale().fitContent();
    }

    // Sync all timescales
    const allCharts = charts.current;
    allCharts.forEach((src, si) => {
      src.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range === null) return;
        allCharts.forEach((dst, di) => { if (di !== si) dst.timeScale().setVisibleLogicalRange(range); });
      });
    });

    return () => { charts.current.forEach(c => c.remove()); charts.current = []; };
  }, [candles, active]);

  const panelStyle: React.CSSProperties = { width: '100%' };
  const labelStyle: React.CSSProperties = {
    color: '#888', fontSize: 11, padding: '2px 8px',
    background: '#1a1a2e', borderTop: '1px solid #2d2d44',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div ref={mainRef} style={panelStyle} />
      {active.rsi && <><div style={labelStyle}>RSI (14)</div><div ref={rsiRef} style={panelStyle} /></>}
      {active.macd && <><div style={labelStyle}>MACD (12,26,9)</div><div ref={macdRef} style={panelStyle} /></>}
      {active.stochastic && <><div style={labelStyle}>Estocástico (14,3)</div><div ref={stochRef} style={panelStyle} /></>}
      {active.cipherB && <><div style={labelStyle}>Cipher B — WaveTrend</div><div ref={cipherRef} style={panelStyle} /></>}
    </div>
  );
}
