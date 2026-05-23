import { useState, useEffect } from 'react';
import { api } from '../api/api';

interface Props {
  prefillToken?: string;
}

export default function V3Charge({ prefillToken }: Props) {
  const [token, setToken] = useState(prefillToken || '');
  const [amount, setAmount] = useState(10);
  const [customerReference, setCustomerReference] = useState('');
  const [language, setLanguage] = useState<'EN' | 'AR'>('EN');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefillToken) setToken(prefillToken);
  }, [prefillToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.v3ChargeToken({
        token: token.trim(),
        amount: Number(amount),
        customerReference: customerReference || undefined,
        language,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const txn = result?.Data?.TransactionDetails;

  return (
    <div>
      <h2 className="section-title">Step 3 — Charge Saved Token</h2>
      <p className="section-desc">
        Calls <code>POST /v3/payments</code> with the saved token. The payment is processed
        server-side — no redirect required. Requires <strong>FastPay</strong> or{' '}
        <strong>Bypass3DS</strong> to be enabled on the account.
      </p>

      <div className="alert alert-warn" style={{ marginBottom: 20 }}>
        <strong>Account features required:</strong> FastPay (auto-skips OTP for 3DS-verified cards)
        or Bypass3DS + BypassCvv must be enabled by your MyFatoorah account manager.
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Token</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="TKN-0fb06aac-634d-418a-bf78-953202b67b53"
            required
          />
          {prefillToken && token === prefillToken && (
            <span className="hint">Auto-filled from Step 2</span>
          )}
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label>Amount</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-row">
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value as 'EN' | 'AR')}>
              <option value="EN">English</option>
              <option value="AR">Arabic</option>
            </select>
          </div>
          <div className="form-row">
            <label>Customer Reference (optional)</label>
            <input
              type="text"
              value={customerReference}
              onChange={(e) => setCustomerReference(e.target.value)}
              placeholder="#CUST-001"
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
          <div className="result-header">
            <h3>Payment Result</h3>
            {txn?.Transaction?.Status && (
              <span
                className="status-badge"
                style={{ background: txn.Transaction.Status === 'SUCCESS' ? '#16a34a' : '#dc2626' }}
              >
                {txn.Transaction.Status}
              </span>
            )}
          </div>

          <div className="kv-grid">
            {result?.Data?.InvoiceId && (
              <div className="kv">
                <span className="kv-label">Invoice ID</span>
                <span className="kv-val">{result.Data.InvoiceId}</span>
              </div>
            )}
            {txn?.Invoice?.Status && (
              <div className="kv">
                <span className="kv-label">Invoice Status</span>
                <span className="kv-val">{txn.Invoice.Status}</span>
              </div>
            )}
            {txn?.Transaction?.PaymentMethod && (
              <div className="kv">
                <span className="kv-label">Method</span>
                <span className="kv-val">{txn.Transaction.PaymentMethod}</span>
              </div>
            )}
            {txn?.Amount?.ValueInBaseCurrency && (
              <div className="kv">
                <span className="kv-label">Amount</span>
                <span className="kv-val">
                  {txn.Amount.ValueInBaseCurrency} {txn.Amount.BaseCurrency}
                </span>
              </div>
            )}
            {txn?.Card?.Number && (
              <div className="kv">
                <span className="kv-label">Card</span>
                <span className="kv-val">{txn.Card.Number}</span>
              </div>
            )}
            {result?.Data?.PaymentCompleted !== undefined && (
              <div className="kv">
                <span className="kv-label">Completed</span>
                <span className="kv-val">{result.Data.PaymentCompleted ? 'Yes' : 'No'}</span>
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
