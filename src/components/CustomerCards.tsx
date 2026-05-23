import { useState } from 'react';
import { api } from '../api/api';
import type { MfCard } from '../types/payment';

interface Props {
  onChargeToken: (tokenId: string) => void;
}

export default function CustomerCards({ onChargeToken }: Props) {
  const [ref,      setRef]      = useState('');
  const [cards,    setCards]    = useState<MfCard[]>([]);
  const [resolved, setResolved] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCards([]);
    setResolved('');
    try {
      const res = await api.getCustomerCards(ref.trim());
      setCards(res?.Data?.Cards ?? []);
      setResolved(res?.Data?.Reference ?? ref.trim());
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as Error)?.message
        ?? 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Step 2 — Retrieve Saved Cards</h2>
      <p className="section-desc">
        Calls <code>GET /direct/customers/:ref/cards</code> → MyFatoorah{' '}
        <code>GET /v3/customers</code>. Returns every tokenized card for a customer reference.{' '}
        <strong>Is3DSVerified = true</strong> means FastPay can charge silently (no OTP).
      </p>

      <form onSubmit={handleFetch} className="form">
        <div className="form-row">
          <label>Customer Reference</label>
          <input
            type="text"
            value={ref}
            onChange={e => setRef(e.target.value)}
            placeholder="Same reference used in Step 1"
            required
          />
          <span className="hint">
            Must match the <code>customerReference</code> sent when the session was created
          </span>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Fetching…' : 'Get Saved Cards'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {resolved && cards.length === 0 && !loading && (
        <div className="alert alert-warn">
          No saved cards for <strong>{resolved}</strong>. Complete Step 1 first and ensure the
          backend verify endpoint has activated the token.
        </div>
      )}

      {cards.length > 0 && (
        <div className="result-box">
          <div className="result-header">
            <h3>Saved Cards</h3>
            <span className="badge">{resolved}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {cards.length} card{cards.length !== 1 ? 's' : ''}
            </span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Masked Number</th>
                <th>3DS Status</th>
                <th>Token</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(card => (
                <tr key={card.Token}>
                  <td><strong>{card.Brand}</strong></td>
                  <td><code>{card.Number}</code></td>
                  <td>
                    <span className="status-badge" style={{
                      background: card.Is3DSVerified ? 'var(--success)' : 'var(--warn)',
                    }}>
                      {card.Is3DSVerified ? '3DS Verified ✓' : 'Not 3DS'}
                    </span>
                  </td>
                  <td>
                    <code
                      style={{ fontSize: 11, wordBreak: 'break-all',
                               display: 'inline-block', maxWidth: 200 }}
                      title={card.Token}
                    >
                      {card.Token}
                    </code>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => onChargeToken(card.Token)}
                      title={card.Is3DSVerified ? 'Go to Step 3 to charge' : '3DS not verified'}
                    >
                      Charge →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="alert alert-warn" style={{ marginTop: 14 }}>
            <strong>Is3DSVerified = true</strong> — FastPay eligible: charge processes silently
            without OTP (requires Tokenization + FastPay/Bypass3DS + BypassCvv on your account).{' '}
            <strong>Is3DSVerified = false</strong> — 3DS required on first recurring charge.
          </div>
        </div>
      )}
    </div>
  );
}
