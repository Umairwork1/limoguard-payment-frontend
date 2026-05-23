import { useState, useEffect } from 'react';
import { api } from '../api/api';
import type { CurrencyIso } from '../types/payment';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];

interface Props {
  prefillTokenId?: string;
}

export default function DirectCharge({ prefillTokenId }: Props) {
  const [token,        setToken]        = useState(prefillTokenId || '');
  const [invoiceValue, setInvoiceValue] = useState(10);
  const [currency,     setCurrency]     = useState<CurrencyIso>('KWD');
  const [result,       setResult]       = useState<unknown>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (prefillTokenId) setToken(prefillTokenId);
  }, [prefillTokenId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.paymentCharge({
        token       : token.trim(),
        invoiceValue: Number(invoiceValue),
        currency,
      });
      setResult(res);
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
      <h2 className="section-title">③ Charge Token</h2>
      <p className="section-desc">
        Calls <code>POST /api/payment/charge</code> — charges a saved card token directly
        without any redirect. Use the token from <strong>Step 2 → Customer Cards</strong>.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Card Token</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token from Step 2 → Customer Cards"
            required
          />
          {prefillTokenId && token === prefillTokenId && (
            <span className="hint">Auto-filled from Customer Cards</span>
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
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyIso)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
            {(result as { Data?: { InvoiceId?: string } })?.Data?.InvoiceId && (
              <div className="kv">
                <span className="kv-label">Invoice ID</span>
                <span className="kv-val">{(result as { Data: { InvoiceId: string } }).Data.InvoiceId}</span>
              </div>
            )}
            {(result as { Data?: { InvoiceStatus?: string } })?.Data?.InvoiceStatus && (
              <div className="kv">
                <span className="kv-label">Status</span>
                <span className="kv-val">{(result as { Data: { InvoiceStatus: string } }).Data.InvoiceStatus}</span>
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
