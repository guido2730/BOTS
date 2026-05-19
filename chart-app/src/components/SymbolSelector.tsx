import { CRYPTO_PAIRS, INTERVALS } from '../data/binance';

interface Props {
  symbol: string;
  interval: string;
  onSymbol: (s: string) => void;
  onInterval: (i: string) => void;
}

const selectStyle: React.CSSProperties = {
  background: '#2d2d44', color: '#fff', border: '1px solid #444',
  borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
};

export default function SymbolSelector({ symbol, interval, onSymbol, onInterval }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 12px', background: '#0d0d1a', borderBottom: '1px solid #2d2d44',
    }}>
      <span style={{ color: '#6c5ce7', fontWeight: 700, fontSize: 18 }}>📈 ChartPro</span>
      <select style={selectStyle} value={symbol} onChange={e => onSymbol(e.target.value)}>
        {CRYPTO_PAIRS.map(p => <option key={p}>{p}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 4 }}>
        {INTERVALS.map(iv => (
          <button
            key={iv}
            onClick={() => onInterval(iv)}
            style={{
              padding: '3px 8px', borderRadius: 4, border: 'none',
              cursor: 'pointer', fontSize: 12,
              background: interval === iv ? '#6c5ce7' : '#2d2d44',
              color: '#fff',
            }}
          >{iv}</button>
        ))}
      </div>
    </div>
  );
}
