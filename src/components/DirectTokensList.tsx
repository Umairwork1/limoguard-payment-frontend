import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import type { DirectToken } from '../types/payment';

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  pending: '#ca8a04',
  inactive: '#dc2626',
};

interface Props {
  onSelectToken: (tokenId: string) => void;
  refreshTrigger: number;
}

export default function DirectTokensList({ onSelectToken, refreshTrigger }: Props) {
  const [tokens, setTokens] = useState<DirectToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listDirectTokens();
      setTokens(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore sidebar errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  const copy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Saved Tokens</span>
        <button onClick={load} className="btn-icon" title="Refresh" disabled={loading}>
          ↻
        </button>
      </div>
      {loading && <div className="sidebar-loading">Loading…</div>}
      {tokens.length === 0 && !loading && (
        <div className="sidebar-empty">No tokens yet. Register a card to see it here.</div>
      )}
      {tokens.map((t) => (
        <div key={t._id} className="sidebar-item">
          <div className="sidebar-item-top">
            <span
              className="sidebar-status"
              style={{ background: STATUS_COLORS[t.status] || '#6b7280' }}
            >
              {t.status}
            </span>
          </div>
          <div className="sidebar-customer">{t.customerName}</div>
          <div className="sidebar-amount">{t.currencyIso}</div>
          <div className="sidebar-id-row">
            <code className="sidebar-id" title={t.tokenId ?? t._id}>
              {((t.tokenId ?? t._id) || '').length > 12
                ? (t.tokenId ?? t._id).slice(0, 12) + '…'
                : (t.tokenId ?? t._id)}
            </code>
            <button className="btn-icon" onClick={() => copy(t.tokenId ?? t._id)} title="Copy token ID">
              {copied === (t.tokenId ?? t._id) ? '✓' : '⎘'}
            </button>
            <button
              className="btn-icon"
              onClick={() => onSelectToken(t.tokenId ?? t._id)}
              title="Use this token"
            >
              →
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
