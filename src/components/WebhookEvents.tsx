import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';

const STATUS_COLORS: Record<string, string> = {
  verified: '#16a34a',
  signature_mismatch: '#dc2626',
  no_secret: '#ca8a04',
};

const PROC_COLORS: Record<string, string> = {
  processed: '#16a34a',
  received: '#ca8a04',
  ignored: '#6b7280',
};

export default function WebhookEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listWebhookEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="result-header" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Webhook Events Log</h2>
        <button onClick={load} className="btn btn-secondary btn-sm" disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>
      <p className="section-desc">
        All events received at <code>POST /api/webhooks</code>. Each row shows the signature
        verification result and processing outcome. Only requests with a valid{' '}
        <code>myfatoorah-signature</code> header are accepted.
      </p>

      {events.length === 0 && !loading && (
        <div className="alert alert-warn">
          No webhook events received yet. Register <code>BACKEND_URL/api/webhooks</code> in your
          MyFatoorah portal under <strong>Integration Settings → Webhook Settings</strong>.
        </div>
      )}

      {events.map((e) => (
        <div key={e._id} className="result-box" style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="status-badge" style={{ background: STATUS_COLORS[e.signatureStatus] || '#6b7280' }}>
              sig: {e.signatureStatus}
            </span>
            <span className="status-badge" style={{ background: PROC_COLORS[e.processingStatus] || '#6b7280' }}>
              {e.processingStatus}
            </span>
            <code style={{ fontSize: 13, fontWeight: 700 }}>{e.eventName}</code>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Code {e.eventCode}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto' }}>
              {new Date(e.createdAt).toLocaleString()}
            </span>
          </div>
          {e.eventReference && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              ref: <code>{e.eventReference}</code>
            </div>
          )}
          <button
            className="btn-icon"
            style={{ marginTop: 8, fontSize: 12 }}
            onClick={() => setExpanded(expanded === e._id ? null : e._id)}
          >
            {expanded === e._id ? '▲ Hide payload' : '▼ Show payload'}
          </button>
          {expanded === e._id && (
            <pre className="json-block" style={{ marginTop: 8 }}>
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
