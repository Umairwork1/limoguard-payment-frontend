import { useState } from 'react';
import { api } from '../api/api';

interface MfCard {
  Token: string;
  Number: string;
  Brand: string;
  Is3DSVerified: boolean;
  TokenType: string;
}

interface Props {
  onChargeToken: (tokenId: string) => void;
}

export default function CustomerCards({ onChargeToken }: Props) {
  const [customerRef, setCustomerRef] = useState('');
  const [cards, setCards] = useState<MfCard[]>([]);
  const [resolvedRef, setResolvedRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCards([]);
    setResolvedRef('');
    try {
      const res = await api.getCustomerCards(customerRef.trim());
      const fetchedCards: MfCard[] = res?.Data?.Cards || [];
      setCards(fetchedCards);
      setResolvedRef(res?.Data?.Reference || customerRef.trim());
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Step 2 — Retrieve Saved Cards</h2>
      <p className="section-desc">
        Calls <code>GET /api/direct/customers/:ref/cards</code> → MyFatoorah{' '}
        <code>GET /v3/customers</code>. Returns every tokenized card stored under a customer
        reference. The <code>Is3DSVerified</code> flag determines FastPay eligibility — only
        3DS-verified cards can be charged silently without an OTP redirect.
      </p>

      <form onSubmit={handleFetch} className="form">
        <div className="form-row">
          <label>Customer Reference</label>
          <input
            type="text"
            value={customerRef}
            onChange={(e) => setCustomerRef(e.target.value)}
            placeholder="Same reference used when the card was tokenized"
            required
          />
          <span className="hint">
            This must match the <code>customerReference</code> sent in Step 1 (Session)
          </span>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Fetching…' : 'Get Saved Cards'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {resolvedRef && cards.length === 0 && !loading && (
        <div className="alert alert-warn">
          No saved cards found for reference <strong>{resolvedRef}</strong>. Complete Step 1
          first or check that <code>SaveToken: true</code> was set on the session.
        </div>
      )}

      {cards.length > 0 && (
        <div className="result-box">
          <div className="result-header">
            <h3>Saved Cards</h3>
            <span className="badge">{resolvedRef}</span>
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
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.Token}>
                  <td>
                    <strong>{card.Brand}</strong>
                  </td>
                  <td>
                    <code>{card.Number}</code>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        background: card.Is3DSVerified ? 'var(--success)' : 'var(--warn)',
                      }}
                    >
                      {card.Is3DSVerified ? '3DS Verified ✓' : 'Not 3DS Verified'}
                    </span>
                  </td>
                  <td>
                    <code
                      style={{ fontSize: 11, wordBreak: 'break-all', display: 'inline-block', maxWidth: 240 }}
                      title={card.Token}
                    >
                      {card.Token}
                    </code>
                  </td>
                  <td>
                    <code>{card.TokenType}</code>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => onChargeToken(card.Token)}
                      disabled={!card.Is3DSVerified}
                      title={
                        card.Is3DSVerified
                          ? 'Charge this card'
                          : 'Card not 3DS-verified — FastPay unavailable'
                      }
                    >
                      Charge →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="alert alert-warn" style={{ marginTop: 14 }}>
            <strong>Is3DSVerified = true</strong> — FastPay eligible. The charge completes
            immediately without any OTP / 3DS redirect (requires FastPay or Bypass3DS enabled on
            your account).{' '}
            <strong>Is3DSVerified = false</strong> — card must go through 3DS on first
            recurring charge.
          </div>
        </div>
      )}
    </div>
  );
}
