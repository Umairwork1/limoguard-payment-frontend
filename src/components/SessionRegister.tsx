import { useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import type { CurrencyIso, MfPaymentCallback } from '../types/payment';

// ── MyFatoorah JS SDK ──────────────────────────────────────────────────────────
// URL   : https://demo.myfatoorah.com/js/v1/myfatoorah.js
// Global: myFatoorah  (capital F — set asynchronously after script onload)
// ─────────────────────────────────────────────────────────────────────────────
declare global {
  interface Window {
    myfatoorah: {
      init(config: {
        sessionId    : string;
        containerId  : string;
        encryptionKey: string;
        countryCode  : string;
        callback     : (res: MfPaymentCallback) => void;
      }): void;
      submit(): void;
    };
  }
}

const CONTAINER_ID = 'mf-card-element';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];


// ── Helpers ───────────────────────────────────────────────────────────────────

// SDK script is loaded statically in index.html.
// Poll until window.myfatoorah is set (it initialises asynchronously after parse).
function waitForSdk(ms = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.myfatoorah) { resolve(); return; }
    const t0 = Date.now();
    const id = setInterval(() => {
      if (window.myfatoorah)         { clearInterval(id); resolve(); }
      else if (Date.now() - t0 > ms) { clearInterval(id); reject(new Error('SDK timeout — check SDK URL')); }
    }, 50);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading-session' | 'card' | 'processing' | 'verifying' | 'success' | 'error';

interface FormState {
  invoiceValue       : number;
  customerName       : string;
  customerEmail      : string;
  mobileCountryCode  : string;
  mobileNumber       : string;
  customerReference  : string;
  currency           : CurrencyIso;
  language           : 'EN' | 'AR';
  paymentMode        : 'COMPLETE_PAYMENT' | 'COLLECT_DETAILS';
}

interface SessionData {
  sessionId     : string;
  encryptionKey : string;
  countryCode   : string;
  reference     : string;
}

interface Props { onRegistered: () => void; }

export default function SessionRegister({ onRegistered }: Props) {
  const [phase,        setPhase]        = useState<Phase>('form');
  const [session,      setSession]      = useState<SessionData | null>(null);
  const [verifyResult, setVerifyResult] = useState<unknown>(null);
  const [error,        setError]        = useState('');
  const [sdkInitDone,  setSdkInitDone]  = useState(false);

  // Stable reference to the SDK instance — avoids closure/window timing issues
  const mfRef = useRef<Window['myfatoorah'] | null>(null);

  // Mount-time check — tells us immediately if the static script loaded
  useEffect(() => {
    console.log('[MF] mount — window.myfatoorah:', window.myfatoorah ?? 'UNDEFINED (script blocked or wrong URL)');
  }, []);

  const [form, setForm] = useState<FormState>({
    invoiceValue     : 1,
    customerName     : 'John Doe',
    customerEmail    : 'john@example.com',
    mobileCountryCode: '965',
    mobileNumber     : '51234567',
    customerReference: `cust-${Date.now()}`,
    currency         : 'KWD',
    language         : 'EN',
    paymentMode      : 'COMPLETE_PAYMENT',
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  // ── Step 1: create session ─────────────────────────────────────────────────
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mfRef.current = null;
    setSdkInitDone(false);
    setPhase('loading-session');

    try {
      const res = await api.createSession({
        invoiceValue     : Number(form.invoiceValue),
        customerName     : form.customerName,
        customerEmail    : form.customerEmail,
        customerMobile   : { countryCode: form.mobileCountryCode, number: form.mobileNumber },
        customerReference: form.customerReference,
        currency         : form.currency,
        language         : form.language,
        paymentMode      : form.paymentMode,
      });

      if (!res?.IsSuccess) throw new Error(res?.Message || 'Session creation failed');

      const sid = res?.Data?.SessionId;
      if (!sid) throw new Error('SessionId missing from response');

      // Prefer reference returned by backend; fall back to what we sent
      const reference = res?.Data?.Customer?.Reference ?? form.customerReference;

      setSession({
        sessionId    : sid,
        encryptionKey: res.Data.EncryptionKey ?? '',
        countryCode  : sid.split('-')[0],   // e.g. "KWT-uuid" → "KWT"
        reference,
      });
      setPhase('card');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('form');
    }
  };

  // ── Step 2: init SDK once card div is in the DOM ───────────────────────────
  useEffect(() => {
    if (phase !== 'card' || !session || mfRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        console.log('[MF] 1. waiting for SDK — window.myfatoorah:', window.myfatoorah);
        await waitForSdk();
        if (cancelled) return;
        console.log('[MF] 2. SDK ready:', window.myfatoorah);

        // Capture instance before init — window.myfatoorah may be cleared later
        mfRef.current = window.myfatoorah;

        console.log('[MF] 3. calling init — sessionId:', session.sessionId);
        console.log('[MF] container div present:', !!document.getElementById(CONTAINER_ID));

        mfRef.current.init({
          sessionId   : session.sessionId,
          countryCode : session.countryCode,
          currencyCode: form.currency,
          containerId : CONTAINER_ID,
          language    : form.language,
          callback    : async (response: MfPaymentCallback) => {
            if (cancelled) return;
            console.log('[MF] callback:', response);

            if (!response.paymentCompleted) {
              setError('Payment was not completed');
              setPhase('error');
              return;
            }

            // ── Step 3: verify with backend ─────────────────────────────────
            setPhase('verifying');
            try {
              const verifyRes = await api.verifyPayment({
                paymentData  : response.paymentData ?? '',
                encryptionKey: session.encryptionKey,
                reference    : session.reference,
              });
              setVerifyResult(verifyRes);
              setPhase('success');
              onRegistered();
            } catch (verifyErr: unknown) {
              setError(verifyErr instanceof Error ? verifyErr.message : String(verifyErr));
              setPhase('error');
            }
          },
        });

        setSdkInitDone(true);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase('form');
      }
   
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session]);

  // ── Step 3: user clicks Pay → SDK encrypts + fires callback ───────────────
  const handlePay = () => {
    if (!mfRef.current) {
      setError('SDK not ready — please wait a moment');
      return;
    }
    setError('');
    setPhase('processing');
    try {
      mfRef.current.submit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('card');
    }
  };

  const handleReset = () => {
    mfRef.current = null;
    setSdkInitDone(false);
    setSession(null);
    setVerifyResult(null);
    setError('');
    setPhase('form');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 className="section-title">Step 1 — Tokenize Card (Embedded SDK)</h2>
      <p className="section-desc">
        <code>POST /payment/session</code> → gets <code>SessionId</code> +{' '}
        <code>EncryptionKey</code> → SDK renders card form → customer pays →{' '}
        <code>paymentData</code> sent to <code>POST /payment/verify</code> to activate token.
      </p>

      {/* ── form ── */}
      {phase === 'form' && (
        <form onSubmit={handleCreateSession} className="form">
          <div className="form-grid">
            <div className="form-row">
              <label>Amount</label>
              <input type="number" step="0.001" min="0.001"
                value={form.invoiceValue}
                onChange={e => set('invoiceValue', Number(e.target.value))} required />
            </div>
            <div className="form-row">
              <label>Currency</label>
              <select value={form.currency}
                onChange={e => set('currency', e.target.value as CurrencyIso)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Customer Name</label>
              <input type="text" value={form.customerName}
                onChange={e => set('customerName', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Customer Email</label>
              <input type="email" value={form.customerEmail}
                onChange={e => set('customerEmail', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Mobile Country Code</label>
              <input type="text" value={form.mobileCountryCode}
                placeholder="965" onChange={e => set('mobileCountryCode', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Mobile Number</label>
              <input type="text" value={form.mobileNumber}
                placeholder="51234567" onChange={e => set('mobileNumber', e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Customer Reference</label>
              <input type="text" value={form.customerReference}
                onChange={e => set('customerReference', e.target.value)} required />
              <span className="hint">
                Unique ID — use this in Step 2 to retrieve the saved token
              </span>
            </div>
            <div className="form-row">
              <label>Language</label>
              <select value={form.language}
                onChange={e => set('language', e.target.value as 'EN' | 'AR')}>
                <option value="EN">English</option>
                <option value="AR">Arabic</option>
              </select>
            </div>
            <div className="form-row" style={{ gridColumn: '1 / -1' }}>
              <label>Payment Mode</label>
              <select value={form.paymentMode}
                onChange={e => set('paymentMode', e.target.value as FormState['paymentMode'])}>
                <option value="COMPLETE_PAYMENT">COMPLETE_PAYMENT — charge + save token</option>
                <option value="COLLECT_DETAILS">COLLECT_DETAILS — save card only, no charge</option>
              </select>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="btn btn-primary">
            Create Session & Load Card Form
          </button>
        </form>
      )}

      {/* ── loading session ── */}
      {phase === 'loading-session' && (
        <div className="result-box" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, display: 'inline-block',
                        animation: 'spin 1s linear infinite', marginBottom: 12 }}>⟳</div>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Creating session…</p>
        </div>
      )}

      {/* ── card form + processing + verifying ── */}
      {(phase === 'card' || phase === 'processing' || phase === 'verifying') && (
        <div>
          {session && (
            <div className="result-box" style={{ marginBottom: 16 }}>
              <div className="kv-grid">
                <div className="kv">
                  <span className="kv-label">Session ID</span>
                  <span className="kv-val"
                    style={{ fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {session.sessionId}
                  </span>
                </div>
                <div className="kv">
                  <span className="kv-label">Currency</span>
                  <span className="kv-val">{form.currency}</span>
                </div>
                <div className="kv">
                  <span className="kv-label">Customer Ref</span>
                  <span className="kv-val" style={{ fontSize: 12 }}>{session.reference}</span>
                </div>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

          {/* SDK renders card inputs into this div — white bg required */}
          <div style={{
            background  : '#ffffff',
            borderRadius: 8,
            padding     : 20,
            marginBottom: 16,
            minHeight   : 200,
            border      : '1px solid var(--border)',
          }}>
            <div id={CONTAINER_ID} />
          </div>

          {/* Status overlays */}
          {(phase === 'processing' || phase === 'verifying') && (
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block',
                             marginRight: 8 }}>⟳</span>
              {phase === 'processing' ? 'Processing payment…' : 'Verifying with backend…'}
            </div>
          )}

          {phase === 'card' && !sdkInitDone && (
            <div className="alert alert-warn" style={{ marginBottom: 12 }}>
              Loading card form…
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={handlePay}
              disabled={phase !== 'card' || !sdkInitDone}
            >
              {sdkInitDone ? 'Pay Now' : 'Loading…'}
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ── success ── */}
      {phase === 'success' && (
        <div>
          <div className="alert alert-success">
            ✓ Card tokenized and verified. Go to <strong>Step 2</strong> and enter{' '}
            <code>{session?.reference}</code> to see the saved token.
          </div>
          <div className="result-box" style={{ marginTop: 16 }}>
            <h3>Verify Response</h3>
            <pre className="json-block">{JSON.stringify(verifyResult, null, 2)}</pre>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={handleReset}>
            ← New Session
          </button>
        </div>
      )}

      {/* ── error ── */}
      {phase === 'error' && (
        <div>
          <div className="alert alert-error">{error || 'Payment failed'}</div>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={handleReset}>
            ← Try Again
          </button>
        </div>
      )}
    </div>
  );
}
