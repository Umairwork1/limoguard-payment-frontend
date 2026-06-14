import { useState } from 'react';
import { api } from '../api/api';
import type { CurrencyIso, Language } from '../types/payment';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const DEFAULT_CALLBACK = `${BACKEND}/api/direct/callback`;
const DEFAULT_ERROR = `${BACKEND}/api/direct/error`;

interface Props {
  selectedMethodId?: number;
  prefillAmount?: number;
  prefillCurrency?: CurrencyIso;
  onSaved: () => void;
}

export default function DirectSaveCard({
  selectedMethodId,
  prefillAmount,
  prefillCurrency,
  onSaved,
}: Props) {
  const [form, setForm] = useState({
    paymentMethodId: selectedMethodId ?? 2,
    invoiceValue: prefillAmount ?? 1,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerMobile: '96512345678',
    cardNumber: '',
    cardExpiryMonth: '',
    cardExpiryYear: '',
    cardCvv: '',
    cardHolderName: '',
    bypass3ds: false,
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

  const handleCardNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    set('cardNumber', formatted);
  };

  const handleExpiry = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      set('cardExpiryMonth', digits.slice(0, 2));
      set('cardExpiryYear', digits.slice(2));
    } else if (digits.length === 2) {
      set('cardExpiryMonth', digits);
      set('cardExpiryYear', '');
    } else {
      set('cardExpiryMonth', digits);
    }
  };

  const expiryDisplay =
    form.cardExpiryMonth + (form.cardExpiryYear ? '/' + form.cardExpiryYear : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.directSaveCard({
        paymentMethodId: Number(form.paymentMethodId),
        invoiceValue: Number(form.invoiceValue),
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerMobile: form.customerMobile,
        cardNumber: form.cardNumber.replace(/\s/g, ''),
        cardExpiryMonth: form.cardExpiryMonth,
        cardExpiryYear: form.cardExpiryYear,
        cardCvv: form.cardCvv,
        cardHolderName: form.cardHolderName,
        bypass3ds: form.bypass3ds,
        displayCurrencyIso: form.displayCurrencyIso,
        language: form.language,
        callBackUrl: form.callBackUrl || undefined,
        errorUrl: form.errorUrl || undefined,
        customerReference: form.customerReference || undefined,
      });
      setResult(res);
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Save Card — Direct Payment (v2)</h2>
      <p className="section-desc">
        Calls <code>POST /api/direct/save-card</code>. Card details are submitted inside{' '}
        <code>ExecutePayment</code> itself (not to a separate URL). If 3DS is required, a{' '}
        <code>redirectUrl</code> is returned — redirect the customer there to verify, then the
        token activates via the callback. If no 3DS, the token activates immediately.
      </p>

      <form onSubmit={handleSubmit} className="form">
        {/* ── Card Details ───────────────────────────────────────────────────── */}
        <div className="subsection">
          <h4>Card Details</h4>
          <div className="form-grid">
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Card Number</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.cardNumber}
                onChange={(e) => handleCardNumber(e.target.value)}
                placeholder="4111 1111 1111 1111"
                maxLength={19}
                required
              />
            </div>
            <div className="form-row">
              <label>Expiry (MM/YY)</label>
              <input
                type="text"
                inputMode="numeric"
                value={expiryDisplay}
                onChange={(e) => handleExpiry(e.target.value)}
                placeholder="05/25"
                maxLength={5}
                required
              />
            </div>
            <div className="form-row">
              <label>CVV</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.cardCvv}
                onChange={(e) => set('cardCvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                required
              />
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Cardholder Name</label>
              <input
                type="text"
                value={form.cardHolderName}
                onChange={(e) => set('cardHolderName', e.target.value.toUpperCase())}
                placeholder="JOHN DOE"
                required
              />
            </div>
          </div>
        </div>

        {/* ── Payment Details ────────────────────────────────────────────────── */}
        <div className="subsection">
          <h4>Payment Details</h4>
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
          </div>
        </div>

        {/* ── Customer Details ───────────────────────────────────────────────── */}
        <div className="subsection">
          <h4>Customer Details</h4>
          <div className="form-grid">
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
              <label>Customer Reference (optional)</label>
              <input
                type="text"
                value={form.customerReference}
                onChange={(e) => set('customerReference', e.target.value)}
                placeholder="Your internal order/customer ID"
              />
            </div>
          </div>
        </div>

        {/* ── 3DS ────────────────────────────────────────────────────────────── */}
        <div className="subsection">
          <h4>3D Secure</h4>
          <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input
              id="bypass3ds"
              type="checkbox"
              checked={form.bypass3ds}
              onChange={(e) => set('bypass3ds', e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="bypass3ds" style={{ marginBottom: 0 }}>
              Bypass 3DS <span className="hint">(merchant assumes fraud liability — requires account manager approval)</span>
            </label>
          </div>
          {!form.bypass3ds && (
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-row">
                <label>3DS Callback URL (backend)</label>
                <input
                  type="text"
                  value={form.callBackUrl}
                  onChange={(e) => set('callBackUrl', e.target.value)}
                />
                <span className="hint">MyFatoorah POSTs here after 3DS completes</span>
              </div>
              <div className="form-row">
                <label>Error URL (backend)</label>
                <input
                  type="text"
                  value={form.errorUrl}
                  onChange={(e) => set('errorUrl', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing…' : 'Save Card'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          {result.bypass3ds ? (
            <div className="alert alert-success">
              Card saved successfully (Bypass3DS). Token will appear in the Tokens list.
            </div>
          ) : result.requires3DS && result.redirectUrl ? (
            <>
              <div className="alert alert-warn">
                3DS verification required. Open the link below to complete authentication — the
                token will be activated automatically via the callback once done.
              </div>
              <div className="invoice-url" style={{ marginTop: 10 }}>
                <strong>3DS Verification URL:</strong>{' '}
                <a href={result.redirectUrl} target="_blank" rel="noreferrer">
                  {result.redirectUrl}
                </a>
              </div>
            </>
          ) : (
            <div className="alert alert-warn">
              Card submitted. Check the Tokens list after a moment to confirm activation.
            </div>
          )}

          <div className="kv-grid" style={{ marginTop: 12 }}>
            {result.invoiceId && (
              <div className="kv">
                <span className="kv-label">Invoice ID</span>
                <span className="kv-val">{result.invoiceId}</span>
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
