import { useState, useEffect } from 'react';
import { api } from '../api/api';
import type { CurrencyIso } from '../types/payment';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];

interface Props {
  prefillTokenId?: string;
}

export default function DirectCharge({ prefillTokenId }: Props) {
  const [tokenId, setTokenId] = useState(prefillTokenId || '');
  const [invoiceValue, setInvoiceValue] = useState(10);
  const [currencyIso, setCurrencyIso] = useState<CurrencyIso>('KWD');
  const [cardCvv, setCardCvv] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefillTokenId) setTokenId(prefillTokenId);
  }, [prefillTokenId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.chargeDirectToken(tokenId.trim(), {
        invoiceValue: Number(invoiceValue),
        currencyIso,
        ...(cardCvv.trim() && { cardCvv: cardCvv.trim() }),
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Charge Saved Token</h2>
      <p className="section-desc">
        Calls <code>POST /api/direct/tokens/:tokenId/charge</code> to charge a saved card directly
        without any redirect — the payment is processed server-side using the stored token.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Token ID</label>
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="e.g. abc123"
            required
          />
          {prefillTokenId && tokenId === prefillTokenId && (
            <span className="hint">Auto-filled from Tokens sidebar</span>
          )}
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Invoice Value</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={invoiceValue}
              onChange={(e) => setInvoiceValue(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-row">
            <label>Currency</label>
            <select
              value={currencyIso}
              onChange={(e) => setCurrencyIso(e.target.value as CurrencyIso)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>CVV (optional — required for 3DS tokens)</label>
            <input
              type="text"
              inputMode="numeric"
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Charging…' : 'Charge Token'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <div className="alert alert-success">Token charged successfully.</div>
          <div className="kv-grid">
            {result?.Data?.InvoiceId && (
              <div className="kv">
                <span className="kv-label">Invoice ID</span>
                <span className="kv-val">{result.Data.InvoiceId}</span>
              </div>
            )}
            {result?.Data?.InvoiceStatus && (
              <div className="kv">
                <span className="kv-label">Status</span>
                <span className="kv-val">{result.Data.InvoiceStatus}</span>
              </div>
            )}
          </div>
          <details>
            <summary>Full Response</summary>
            <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
