import { useState } from 'react';
import { api } from '../api/api';
import type { CurrencyIso, Language, RecurringType } from '../types/payment';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];
const RECURRING_TYPES: RecurringType[] = ['Custom', 'Daily', 'Weekly', 'Monthly'];

interface Props {
  selectedMethodId?: number;
  onCreated: () => void;
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const DEFAULT_CALLBACK = `${BACKEND}/api/recurring/callback`;
const DEFAULT_ERROR = `${BACKEND}/api/recurring/error`;

export default function CreateRecurring({ selectedMethodId, onCreated }: Props) {
  const [form, setForm] = useState({
    paymentMethodId: selectedMethodId ?? 2,
    invoiceValue: 10,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerMobile: '96512345678',
    displayCurrencyIso: 'KWD' as CurrencyIso,
    language: 'en' as Language,
    callBackUrl: DEFAULT_CALLBACK,
    errorUrl: DEFAULT_ERROR,
    customerReference: '',
    recurringType: 'Monthly' as RecurringType,
    intervalDays: 30,
    iteration: 12,
    retryCount: 3,
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
      const res = await api.executePayment({
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
        recurringModel: {
          recurringType: form.recurringType,
          intervalDays: form.recurringType === 'Custom' ? Number(form.intervalDays) : undefined,
          iteration: Number(form.iteration),
          retryCount: Number(form.retryCount),
        },
      });
      setResult(res);
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Step 2 — Create Recurring Payment</h2>
      <p className="section-desc">
        Calls <code>POST /v2/ExecutePayment</code> with a <code>RecurringModel</code>. The
        customer completes the first payment via the returned InvoiceURL, which activates the
        recurring schedule.
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
          <h4>Recurring Model</h4>
          <div className="form-grid">
            <div className="form-row">
              <label>Recurring Type</label>
              <select
                value={form.recurringType}
                onChange={(e) => set('recurringType', e.target.value)}
              >
                {RECURRING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {form.recurringType === 'Custom' && (
              <div className="form-row">
                <label>Interval Days (1–180)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={form.intervalDays}
                  onChange={(e) => set('intervalDays', e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-row">
              <label>Iterations (0 = unlimited)</label>
              <input
                type="number"
                min={0}
                value={form.iteration}
                onChange={(e) => set('iteration', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label>Retry Count on Failure (0–5)</label>
              <input
                type="number"
                min={0}
                max={5}
                value={form.retryCount}
                onChange={(e) => set('retryCount', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="subsection">
          <h4>Callbacks</h4>
          <div className="form-grid">
            <div className="form-row">
              <label>Success Callback URL</label>
              <input
                type="text"
                value={form.callBackUrl}
                onChange={(e) => set('callBackUrl', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>Error Callback URL</label>
              <input
                type="text"
                value={form.errorUrl}
                onChange={(e) => set('errorUrl', e.target.value)}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create Recurring Payment'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <h3>Recurring Created</h3>
          {result?.Data?.InvoiceURL && (
            <div className="invoice-url">
              <strong>Complete Payment:</strong>{' '}
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
            {result?.Data?.RecurringId && (
              <div className="kv">
                <span className="kv-label">Recurring ID</span>
                <span className="kv-val badge">{result.Data.RecurringId}</span>
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
