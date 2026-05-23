import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import type { V3Session } from '../types/payment';

interface Props {
  onSelectReference: (reference: string) => void;
  refreshTrigger: number;
}

export default function V3SessionsList({ onSelectReference, refreshTrigger }: Props) {
  const [sessions, setSessions] = useState<V3Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.v3ListSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  const copy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(ref);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>V3 Sessions</span>
        <button onClick={load} className="btn-icon" title="Refresh" disabled={loading}>↻</button>
      </div>
      {loading && <div className="sidebar-loading">Loading…</div>}
      {sessions.length === 0 && !loading && (
        <div className="sidebar-empty">No sessions yet.</div>
      )}
      {sessions.map((s) => (
        <div key={s._id} className="sidebar-item">
          <div className="sidebar-item-top">
            <span
              className="sidebar-status"
              style={{ background: s.status === 'Paid' ? '#16a34a' : '#ca8a04' }}
            >
              {s.status}
            </span>
            <span className="sidebar-type">{s.currency}</span>
          </div>
          <div className="sidebar-customer">{s.customerReference}</div>
          <div className="sidebar-amount">{s.amount} {s.currency}</div>
          <div className="sidebar-id-row">
            <code className="sidebar-id" title={s.customerReference}>
              {s.customerReference.length > 12 ? s.customerReference.slice(0, 12) + '…' : s.customerReference}
            </code>
            <button className="btn-icon" onClick={() => copy(s.customerReference)} title="Copy reference">
              {copied === s.customerReference ? '✓' : '⎘'}
            </button>
            <button className="btn-icon" onClick={() => onSelectReference(s.customerReference)} title="Use reference">
              →
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
