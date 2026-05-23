import { useState } from 'react';
import { api } from '../api/api';
import type { CurrencyIso, Language } from '../types/payment';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];

const DEFAULT_CALLBACK = 'https://b3de-39-34-173-238.ngrok-free.app/api/direct/callback';
const DEFAULT_ERROR = 'https://b3de-39-34-173-238.ngrok-free.app/api/direct/error';
const FRONTEND_SUCCESS = 'http://localhost:5173//payment-success.html';
const FRONTEND_ERROR   = 'http://localhost:5173/payment-error.html';

interface Props {
  selectedMethodId?: number;
  prefillAmount?: number;
  prefillCurrency?: CurrencyIso;
  onRegistered: () => void;
}

export default function DirectRegister({
  selectedMethodId,
  prefillAmount,
  prefillCurrency,
  onRegistered,
}: Props) {
  const [form, setForm] = useState({
    paymentMethodId: selectedMethodId ?? 2,
    invoiceValue: prefillAmount ?? 10,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerMobile: '96512345678',
    displayCurrencyIso: (prefillCurrency ?? 'KWD') as CurrencyIso,
    language: 'en' as Language,
    callBackUrl: DEFAULT_CALLBACK,
    errorUrl: DEFAULT_ERROR,
    customerReference: '',
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.directRegister({
        paymentMethodId: Number(form.paymentMethodId),
        invoiceValue: Number(form.invoiceValue),
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerMobile: form.customerMobile,
        displayCurrencyIso: form.displayCurrencyIso,
        language: form.language,
        callBackUrl: form.callBackUrl,
        errorUrl: form.errorUrl,
        customerReference: form.customerReference || undefined,
      });
      setResult(res);
      onRegistered();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Step 2 — Register Card (First Payment)</h2>
      <p className="section-desc">
        Calls <code>POST /api/direct/register</code>. The customer completes the payment via the
        returned InvoiceURL, which saves the card as a reusable token via the callback.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-grid">
          <div className="form-row">
            <label>Payment Method ID</label>
            <input
              type="number"
              value={form.paymentMethodId}
              onChange={(e) => set('paymentMethodId', e.target.value)}
              required
            />
            {selectedMethodId && (
              <span className="hint">Auto-filled from Step 1 (ID {selectedMethodId})</span>
            )}
          </div>
          <div className="form-row">
            <label>Invoice Value</label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={form.invoiceValue}
              onChange={(e) => set('invoiceValue', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label>Customer Name</label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => set('customerName', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label>Customer Email</label>
            <input
              type="email"
              value={form.customerEmail}
              onChange={(e) => set('customerEmail', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label>Customer Mobile</label>
            <input
              type="text"
              value={form.customerMobile}
              onChange={(e) => set('customerMobile', e.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <label>Currency</label>
            <select
              value={form.displayCurrencyIso}
              onChange={(e) => set('displayCurrencyIso', e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Language</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div className="form-row">
            <label>Customer Reference (optional)</label>
            <input
              type="text"
              value={form.customerReference}
              onChange={(e) => set('customerReference', e.target.value)}
              placeholder="Your internal order/customer ID"
            />
          </div>
        </div>

        <div className="subsection">
          <h4>Callbacks</h4>
          <p className="section-desc" style={{ marginBottom: 12 }}>
            MyFatoorah redirects the user's browser to these URLs. Your backend must respond with a
            <code> 302 redirect</code> to the frontend pages below — not JSON.
          </p>
          <div className="form-grid">
            <div className="form-row">
              <label>Success Callback URL (backend)</label>
              <input
                type="text"
                value={form.callBackUrl}
                onChange={(e) => set('callBackUrl', e.target.value)}
              />
              <span className="hint">Backend should redirect → {FRONTEND_SUCCESS}</span>
            </div>
            <div className="form-row">
              <label>Error Callback URL (backend)</label>
              <input
                type="text"
                value={form.errorUrl}
                onChange={(e) => set('errorUrl', e.target.value)}
              />
              <span className="hint">Backend should redirect → {FRONTEND_ERROR}</span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Registering…' : 'Register Card'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <h3>Registration Initiated</h3>
          {result?.Data?.InvoiceURL && (
            <div className="invoice-url">
              <strong>Complete Payment to Save Card:</strong>{' '}
              <a href={result.Data.InvoiceURL} target="_blank" rel="noreferrer">
                {result.Data.InvoiceURL}
              </a>
            </div>
          )}
          <div className="kv-grid">
            {result?.Data?.InvoiceId && (
              <div className="kv">
                <span className="kv-label">Invoice ID</span>
                <span className="kv-val">{result.Data.InvoiceId}</span>
              </div>
            )}
          </div>
          <div className="alert alert-warn" style={{ marginTop: 12 }}>
            After the customer completes payment, the card token will be activated via the callback
            and appear in the Tokens list.
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
