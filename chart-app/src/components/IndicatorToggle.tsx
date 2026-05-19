export type IndicatorKey = 'ema' | 'bollinger' | 'volume' | 'rsi' | 'macd' | 'stochastic' | 'cipherB';

interface ToggleConfig {
  key: IndicatorKey;
  label: string;
  color: string;
}

const INDICATORS: ToggleConfig[] = [
  { key: 'ema',        label: 'EMA',        color: '#f5a623' },
  { key: 'bollinger',  label: 'Bollinger',  color: '#7ed6df' },
  { key: 'volume',     label: 'Volumen',    color: '#a29bfe' },
  { key: 'rsi',        label: 'RSI',        color: '#00b894' },
  { key: 'macd',       label: 'MACD',       color: '#fd79a8' },
  { key: 'stochastic', label: 'Estocástico',color: '#fdcb6e' },
  { key: 'cipherB',    label: 'Cipher B',   color: '#6c5ce7' },
];

interface Props {
  active: Record<IndicatorKey, boolean>;
  onToggle: (key: IndicatorKey) => void;
}

export default function IndicatorToggle({ active, onToggle }: Props) {
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      padding: '8px 12px', background: '#1a1a2e', borderBottom: '1px solid #2d2d44',
    }}>
      {INDICATORS.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onToggle(key)}
          style={{
            padding: '4px 12px', borderRadius: 20, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: active[key] ? color : '#2d2d44',
            color: active[key] ? '#0d0d1a' : '#aaa',
            transition: 'all 0.2s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
