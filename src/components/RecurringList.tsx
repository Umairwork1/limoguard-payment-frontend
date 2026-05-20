import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import type { RecurringRecord } from '../types/payment';

const STATUS_COLORS: Record<string, string> = {
  Active: '#16a34a',
  Draft: '#ca8a04',
  Cancelled: '#dc2626',
  Completed: '#2563eb',
};

interface Props {
  onSelectId: (id: string) => void;
  refreshTrigger: number;
}

export default function RecurringList({ onSelectId, refreshTrigger }: Props) {
  const [records, setRecords] = useState<RecurringRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listRecurrings();
      setRecords(data);
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
        <span>Saved Recurrings</span>
        <button onClick={load} className="btn-icon" title="Refresh" disabled={loading}>
          ↻
        </button>
      </div>
      {loading && <div className="sidebar-loading">Loading…</div>}
      {records.length === 0 && !loading && (
        <div className="sidebar-empty">No records yet. Create one to see it here.</div>
      )}
      {records.map((r) => (
        <div key={r._id} className="sidebar-item">
          <div className="sidebar-item-top">
            <span
              className="sidebar-status"
              style={{ background: STATUS_COLORS[r.status] || '#6b7280' }}
            >
              {r.status}
            </span>
            <span className="sidebar-type">{r.recurringType}</span>
          </div>
          <div className="sidebar-customer">{r.customerName}</div>
          <div className="sidebar-amount">
            {r.amount} {r.currencyIso}
          </div>
          <div className="sidebar-id-row">
            <code className="sidebar-id" title={r.recurringId}>
              {r.recurringId.length > 12 ? r.recurringId.slice(0, 12) + '…' : r.recurringId}
            </code>
            <button className="btn-icon" onClick={() => copy(r.recurringId)} title="Copy ID">
              {copied === r.recurringId ? '✓' : '⎘'}
            </button>
            <button
              className="btn-icon"
              onClick={() => onSelectId(r.recurringId)}
              title="Use this ID"
            >
              →
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
