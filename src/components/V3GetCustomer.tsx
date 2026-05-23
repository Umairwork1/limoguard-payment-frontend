import { useState } from 'react';
import { api } from '../api/api';
import type { V3Card } from '../types/payment';

interface Props {
  prefillReference?: string;
  onTokenSelect: (token: string) => void;
}

export default function V3GetCustomer({ prefillReference, onTokenSelect }: Props) {
  const [reference, setReference] = useState(prefillReference || '');
  const [cards, setCards] = useState<V3Card[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setCards([]);
    try {
      const res = await api.v3GetCustomerTokens(reference.trim());
      setResult(res);
      setCards(res?.Data?.Cards || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div>
      <h2 className="section-title">Step 2 — Get Customer Tokens</h2>
      <p className="section-desc">
        Calls <code>GET /v3/customers/:reference</code> to retrieve all saved card tokens for a
        customer. Use the same <code>customerReference</code> from Step 1.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Customer Reference</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="#CUST-001"
            required
          />
          {prefillReference && <span className="hint">Auto-filled from Step 1</span>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Fetching…' : 'Get Tokens'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <h3>Saved Cards for <code>{result?.Data?.Reference || reference}</code></h3>

          {cards.length === 0 ? (
            <div className="alert alert-warn">
              No saved cards yet. Complete the embedded payment in Step 1 first.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Number</th>
                  <th>3DS Verified</th>
                  <th>Type</th>
                  <th>Token</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.Token}>
                    <td>{card.Brand}</td>
                    <td><code>{card.Number}</code></td>
                    <td>
                      <span style={{ color: card.Is3DSVerified ? '#16a34a' : '#dc2626' }}>
                        {card.Is3DSVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td>{card.TokenType}</td>
                    <td>
                      <code style={{ fontSize: 11 }}>
                        {card.Token.length > 20 ? card.Token.slice(0, 20) + '…' : card.Token}
                      </code>
                      <button className="btn-icon" onClick={() => copy(card.Token)} title="Copy token">
                        {copied === card.Token ? '✓' : '⎘'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onTokenSelect(card.Token)}
                      >
                        Charge →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <details style={{ marginTop: 12 }}>
            <summary>Full Response</summary>
            <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
