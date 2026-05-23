import { useEffect, useState } from 'react';
import { api } from '../api/api';
import type { CurrencyIso } from '../types/payment';

// ── MyFatoorah JS SDK global type ─────────────────────────────────────────────
declare global {
  interface Window {
    myFatoorah: {
      init(config: MfInitConfig): void;
      submit(): void;
    };
  }
}

interface MfInitConfig {
  sessionId: string;
  countryCode: string;
  cardViewId: string;
  style?: Record<string, unknown>;
  callback?: (response: { SessionId: string; status: string }) => void;
  errorCallback?: (error: unknown) => void;
}
// ─────────────────────────────────────────────────────────────────────────────

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];

// Demo SDK — swap to https://portal.myfatoorah.com/payment/v1/session.js for production
const SDK_SRC = 'https://demo.myfatoorah.com/payment/v1/session.js';
const CARD_VIEW_ID = 'mf-session-card-element';

const BACKEND_CALLBACK = 'https://limoguard-backend.vercel.app/api/direct/callback';
const BACKEND_ERROR    = 'https://limoguard-backend.vercel.app/api/direct/error';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading' | 'card' | 'submitting' | 'done';

interface FormState {
  invoiceValue: number;
  customerName: string;
  customerEmail: string;
  mobileCountryCode: string;
  mobileNumber: string;
  customerReference: string;
  currency: CurrencyIso;
  language: 'EN' | 'AR';
  paymentMode: 'COMPLETE_PAYMENT' | 'COLLECT_DETAILS';
  callBackUrl: string;
  errorUrl: string;
}

interface SessionInfo {
  sessionId: string;
  countryCode: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSdkScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load MyFatoorah SDK from ${src}`));
    document.head.appendChild(s);
  });
}

// The SDK script sets window.myFatoorah after onload in its own async tick.
// Poll until the global is defined or we hit the timeout.
function waitForSdkGlobal(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.myFatoorah) { resolve(); return; }
    const deadline = Date.now() + timeoutMs;
    const id = setInterval(() => {
      if (window.myFatoorah) {
        clearInterval(id);
        resolve();
      } else if (Date.now() >= deadline) {
        clearInterval(id);
        reject(new Error('Timed out waiting for window.myFatoorah — check SDK URL'));
      }
    }, 50);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onRegistered: () => void;
}

export default function SessionRegister({ onRegistered }: Props) {
  const [phase, setPhase] = useState<Phase>('form');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>({
    invoiceValue: 1.0,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    mobileCountryCode: '965',
    mobileNumber: '51234567',
    customerReference: `cust-${Date.now()}`,
    currency: 'KWD',
    language: 'EN',
    paymentMode: 'COMPLETE_PAYMENT',
    callBackUrl: BACKEND_CALLBACK,
    errorUrl: BACKEND_ERROR,
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Step 1: create session ────────────────────────────────────────────────

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPhase('loading');

    try {
      const res = await api.createSession({
        invoiceValue: Number(form.invoiceValue),
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerMobile: {
          countryCode: form.mobileCountryCode,
          number: form.mobileNumber,
        },
        customerReference: form.customerReference,
        currency: form.currency,
        language: form.language,
        paymentMode: form.paymentMode,
        callBackUrl: form.callBackUrl,
        errorUrl: form.errorUrl,
      });

      const sid = res?.Data?.SessionId;
      if (!sid) throw new Error('SessionId missing from backend response');

      const countryCode = res?.Data?.CountryCode || 'KWT';

      // Transition to card phase — useEffect will init the SDK after the
      // card div is committed to the DOM.
      setSessionInfo({ sessionId: sid, countryCode });
      setPhase('card');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('form');
    }
  };

  // ── Step 2: init SDK after card div is in the DOM ─────────────────────────

  useEffect(() => {
    if (phase !== 'card' || !sessionInfo) return;

    let cancelled = false;

    (async () => {
      try {
        await loadSdkScript(SDK_SRC);
        await waitForSdkGlobal();
        if (cancelled) return;

        window.myFatoorah.init({
          sessionId: sessionInfo.sessionId,
          countryCode: sessionInfo.countryCode,
          cardViewId: CARD_VIEW_ID,
          style: {
            hideCardIcons: false,
            direction: form.language === 'AR' ? 'rtl' : 'ltr',
            cardHeight: 200,
            input: {
              color: '#e2e4ef',
              fontSize: '13px',
              fontFamily: 'Inter, system-ui, sans-serif',
              inputHeight: '36px',
              inputMargin: '4px',
              borderColor: '2e3248',
              borderWidth: '1px',
              borderRadius: '6px',
              boxShadow: '',
              placeHolder: {
                holderName: 'Name on Card',
                cardNumber: 'Card Number',
                expiryDate: 'MM / YY',
                securityCode: 'CVV',
              },
            },
            label: {
              display: true,
              color: '#8b90a8',
              fontSize: '11px',
              fontWeight: '600',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            error: {
              borderColor: 'dc2626',
              borderRadius: '6px',
              boxShadow: '',
            },
          },
          // Called if SDK surfaces a result client-side before the server
          // redirect happens (not guaranteed on all SDK versions).
          callback: (response) => {
            console.log('[MF SDK] paymentCallback:', response);
            if (cancelled) return;
            setPhase('done');
            onRegistered();
          },
          errorCallback: (err) => {
            console.error('[MF SDK] errorCallback:', err);
            if (cancelled) return;
            setError(typeof err === 'string' ? err : JSON.stringify(err));
            setPhase('card');
          },
        });
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase('form');
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionInfo]);

  // ── Step 3: submit card form ──────────────────────────────────────────────

  const handlePay = () => {
    setError('');
    setPhase('submitting');
    try {
      window.myFatoorah.submit();
      // After submit, MyFatoorah redirects the browser to callBackUrl (backend),
      // which redirects to the frontend success page. The JS callback above
      // fires if the SDK surfaces a result before the redirect.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('card');
    }
  };

  const handleReset = () => {
    setPhase('form');
    setSessionInfo(null);
    setError('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="section-title">Session — Embedded Card Form</h2>
      <p className="section-desc">
        Calls <code>POST /api/direct/session</code> → gets <code>SessionId</code> +{' '}
        <code>EncryptionKey</code> → renders the MyFatoorah embedded card form via the JS SDK.
        Card data never touches your server. After the customer pays, MyFatoorah redirects to
        your backend callback which activates the token.
      </p>

      {/* ── PHASE: form ── */}
      {phase === 'form' && (
        <form onSubmit={handleCreateSession} className="form">
          <div className="form-grid">
            <div className="form-row">
              <label>Amount</label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={form.invoiceValue}
                onChange={(e) => setField('invoiceValue', Number(e.target.value))}
                required
              />
            </div>
            <div className="form-row">
              <label>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setField('currency', e.target.value as CurrencyIso)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Customer Name</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setField('customerName', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label>Customer Email</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => setField('customerEmail', e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label>Mobile Country Code</label>
              <input
                type="text"
                value={form.mobileCountryCode}
                onChange={(e) => setField('mobileCountryCode', e.target.value)}
                placeholder="965"
                required
              />
            </div>
            <div className="form-row">
              <label>Mobile Number</label>
              <input
                type="text"
                value={form.mobileNumber}
                onChange={(e) => setField('mobileNumber', e.target.value)}
                placeholder="51234567"
                required
              />
            </div>
            <div className="form-row">
              <label>Customer Reference</label>
              <input
                type="text"
                value={form.customerReference}
                onChange={(e) => setField('customerReference', e.target.value)}
                placeholder="Unique ID from your system"
                required
              />
              <span className="hint">Must be unique per customer across all sessions</span>
            </div>
            <div className="form-row">
              <label>Language</label>
              <select
                value={form.language}
                onChange={(e) => setField('language', e.target.value as 'EN' | 'AR')}
              >
                <option value="EN">English</option>
                <option value="AR">Arabic</option>
              </select>
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Payment Mode</label>
              <select
                value={form.paymentMode}
                onChange={(e) =>
                  setField('paymentMode', e.target.value as 'COMPLETE_PAYMENT' | 'COLLECT_DETAILS')
                }
              >
                <option value="COMPLETE_PAYMENT">COMPLETE_PAYMENT — charge now + save token</option>
                <option value="COLLECT_DETAILS">COLLECT_DETAILS — save card only, no charge</option>
              </select>
            </div>
          </div>

          <div className="subsection">
            <h4>Callback URLs</h4>
            <p className="section-desc" style={{ marginBottom: 12 }}>
              MyFatoorah redirects the browser here after payment. Your backend must handle the
              query params and redirect to the frontend success/error page.
            </p>
            <div className="form-grid">
              <div className="form-row">
                <label>Success Callback (backend)</label>
                <input
                  type="text"
                  value={form.callBackUrl}
                  onChange={(e) => setField('callBackUrl', e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Error Callback (backend)</label>
                <input
                  type="text"
                  value={form.errorUrl}
                  onChange={(e) => setField('errorUrl', e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary">
            Get Card Form
          </button>
        </form>
      )}

      {/* ── PHASE: loading ── */}
      {phase === 'loading' && (
        <div
          className="result-box"
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <div style={{ fontSize: 36, marginBottom: 14, animation: 'spin 1s linear infinite', display: 'inline-block' }}>
            ⟳
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Creating session with MyFatoorah…
          </p>
        </div>
      )}

      {/* ── PHASES: card / submitting / done ── */}
      {(phase === 'card' || phase === 'submitting' || phase === 'done') && (
        <div>
          {/* Session info badge */}
          {sessionInfo && (
            <div className="result-box" style={{ marginBottom: 16 }}>
              <div className="kv-grid">
                <div className="kv">
                  <span className="kv-label">Session ID</span>
                  <span
                    className="kv-val"
                    style={{ fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}
                  >
                    {sessionInfo.sessionId}
                  </span>
                </div>
                <div className="kv">
                  <span className="kv-label">Country Code</span>
                  <span className="kv-val">{sessionInfo.countryCode}</span>
                </div>
                <div className="kv">
                  <span className="kv-label">Mode</span>
                  <span className="kv-val" style={{ fontSize: 12 }}>{form.paymentMode}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Card form container — must stay mounted while SDK holds the iframe */}
          <div
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 20,
              marginBottom: 16,
              minHeight: 220,
              position: 'relative',
            }}
          >
            {/* Submitting overlay */}
            {phase === 'submitting' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15,17,23,0.75)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  gap: 10,
                  fontSize: 14,
                  color: 'var(--text-muted)',
                }}
              >
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                  ⟳
                </span>
                Processing payment…
              </div>
            )}

            {/* Success overlay */}
            {phase === 'done' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(22,163,74,0.15)',
                  border: '1px solid rgba(22,163,74,0.3)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  gap: 10,
                  fontSize: 14,
                  color: '#86efac',
                  fontWeight: 600,
                }}
              >
                ✓ Payment submitted — redirecting to success page…
              </div>
            )}

            {/* MyFatoorah SDK renders its iframe into this div */}
            <div id={CARD_VIEW_ID} />
          </div>

          {/* Action buttons — only shown in card phase */}
          {phase === 'card' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handlePay}>
                Pay Now
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                ← Back
              </button>
            </div>
          )}

          {phase === 'done' && (
            <div className="alert alert-success" style={{ marginTop: 8 }}>
              Card registered. The token will appear in the Tokens list once the backend callback
              activates it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
