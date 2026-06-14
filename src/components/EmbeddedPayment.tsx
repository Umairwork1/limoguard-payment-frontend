import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type { EmbeddedSessionData } from '../types/payment';

// Country code from InitiateSession → portal hostname for the SDK
const PORTAL_BY_COUNTRY: Record<string, string> = {
  KWT: 'portal.myfatoorah.com',
  SAU: 'sa.myfatoorah.com',
  ARE: 'ae.myfatoorah.com',
  QAT: 'qa.myfatoorah.com',
  BHR: 'bh.myfatoorah.com',
  OMN: 'om.myfatoorah.com',
  JOR: 'jo.myfatoorah.com',
  EGY: 'eg.myfatoorah.com',
};

function sdkUrlForCountry(countryCode: string, isTest: boolean): string {
  if (isTest) return 'https://demo.myfatoorah.com/payment/v1/session.js';
  const host = PORTAL_BY_COUNTRY[countryCode] ?? 'portal.myfatoorah.com';
  return `https://${host}/payment/v1/session.js`;
}

const DEFAULT_BACKEND = import.meta.env.VITE_MAIN_BACKEND_URL || 'http://localhost:3001';
const DEFAULT_CB_URL = import.meta.env.VITE_EMBEDDED_CALLBACK_URL || import.meta.env.VITE_BACKEND_URL + '/payments/qpay/webhook' || 'http://localhost:3001/payments/qpay/webhook';
const DEFAULT_ERR_URL = import.meta.env.VITE_EMBEDDED_ERROR_URL || import.meta.env.VITE_BACKEND_URL + '/payments/qpay/webhook' || 'http://localhost:3001/payments/qpay/webhook';

export default function EmbeddedPayment() {
  // ── Config ───────────────────────────────────────────────────────────────────
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [token, setToken] = useState('');

  // ── Step 1: initiate session ─────────────────────────────────────────────────
  const [driverId, setDriverId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [saveToken, setSaveToken] = useState(true);
  const [isTest, setIsTest] = useState(false);

  const [session, setSession] = useState<EmbeddedSessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');

  // ── Step 2: card form ────────────────────────────────────────────────────────
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState('');

  // Resolve/reject for the Promise that wraps mf.submit()
  const cardResolveRef = useRef<(() => void) | null>(null);
  const cardRejectRef = useRef<((e: Error) => void) | null>(null);

  // ── Step 3: execute payment ──────────────────────────────────────────────────
  const [invoiceValue, setInvoiceValue] = useState(1);
  const [callbackUrl, setCallbackUrl] = useState(DEFAULT_CB_URL);
  const [errorUrl, setErrorUrl] = useState(DEFAULT_ERR_URL);

  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [executeResult, setExecuteResult] = useState<any>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getMF = () => (window as any).myfatoorah || (window as any).myFatoorah;

  const makeClient = () =>
    axios.create({
      baseURL: backendUrl,
      headers: { Authorization: `Bearer ${token}` },
    });

  const loadSdk = (sdkUrl: string, onReady: () => void) => {
    setSdkError('');
    const existing = document.getElementById('mf-embedded-sdk');
    if (existing) {
      existing.remove();
      delete (window as any).myfatoorah;
      delete (window as any).myFatoorah;
    }
    const s = document.createElement('script');
    s.id = 'mf-embedded-sdk';
    s.src = sdkUrl;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => setSdkError(`Failed to load SDK from ${sdkUrl} — check network/CORS.`);
    document.head.appendChild(s);
  };

  const initCardForm = (sessionId: string, countryCode: string) => {
    const sdkUrl = sdkUrlForCountry(countryCode, isTest);
    loadSdk(sdkUrl, () => {
      const mf = getMF();
      if (!mf) {
        setSdkError('MyFatoorah SDK object not found after script load.');
        return;
      }
      try {
        // payment/v1/session.js API:
        // - containerId and callback are read from the TOP LEVEL (not nested under 'card')
        // - paymentOptions must be an Array of method names
        const cardCallback = (resp: any) => {
          console.log('[MF embedded callback]', resp);
          const success = resp?.IsSuccess ?? resp?.isSuccess ?? false;
          if (success) {
            cardResolveRef.current?.();
          } else {
            const msg = resp?.Message ?? resp?.message ?? 'Card capture failed';
            cardRejectRef.current?.(new Error(msg));
          }
          cardResolveRef.current = null;
          cardRejectRef.current = null;
        };

        mf.init({
          sessionId,
          countryCode,
          paymentOptions: ['card'],
          containerId: 'mf-embedded-form',
          callback: cardCallback,
          style: { direction: 'ltr' },
        });
        setSdkReady(true);
      } catch (e: any) {
        setSdkError(e?.message || 'SDK init() threw an error');
      }
    });
  };

  // Re-init form when a session is ready
  useEffect(() => {
    if (session?.SessionId) {
      setSdkReady(false);
      initCardForm(session.SessionId, session.CountryCode ?? 'ARE');
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1 handler ───────────────────────────────────────────────────────────

  const handleInitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionLoading(true);
    setSessionError('');
    setSession(null);
    setSdkReady(false);
    setSdkError('');
    setExecuteResult(null);
    setPayError('');

    try {
      const res = await makeClient().post('/embedded-payment/session', {
        driver_id: driverId,
        is_recurring: isRecurring,
        save_token: saveToken,
      });
      // Response: { success: true, data: { session: { SessionId, CountryCode } } }
      const sessionData: EmbeddedSessionData =
        res.data?.data?.session ?? res.data?.session ?? res.data;
      if (!sessionData?.SessionId) throw new Error('No SessionId in response');
      setSession(sessionData);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err.message;
      setSessionError(msg);
    } finally {
      setSessionLoading(false);
    }
  };

  // ── Step 3 handler (submit card + execute payment) ───────────────────────────

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayLoading(true);
    setPayError('');
    setExecuteResult(null);

    try {
      // 1. Capture card via SDK — resolves when callback fires with IsSuccess
      await new Promise<void>((resolve, reject) => {
        const mf = getMF();
        if (!mf) { reject(new Error('MyFatoorah SDK not loaded')); return; }
        cardResolveRef.current = resolve;
        cardRejectRef.current = reject;
        try {
          // payment/v1/session.js uses submitCardPayment(), not submit()
          mf.submitCardPayment();
        } catch (e: any) {
          reject(new Error(e?.message || 'mf.submitCardPayment() threw'));
        }
      });

      // 2. Execute payment on limoguard-backend
      const res = await makeClient().post('/embedded-payment/execute', {
        driver_id: driverId,
        invoice_value: invoiceValue,
        callback_url: callbackUrl,
        error_url: errorUrl,
      });
      // Response: { success: true, data: { result: { InvoiceId, InvoiceURL, ... } } }
      const result = res.data?.data?.result ?? res.data?.result ?? res.data?.data;
      setExecuteResult(result);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err.message;
      setPayError(msg);
    } finally {
      setPayLoading(false);
    }
  };

  const reset = () => {
    setSession(null);
    setSdkReady(false);
    setSdkError('');
    setExecuteResult(null);
    setPayError('');
    setSessionError('');
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="section-title">Embedded Payment</h2>
      <p className="section-desc">
        End-to-end flow using <code>limoguard-backend</code> embedded-payment endpoints.
        Step 1 creates a MyFatoorah session and renders the card form. Step 2 captures the
        card via the SDK, then executes the charge server-side.
      </p>

      {/* ── Auth / backend config ─────────────────────────────────────────────── */}
      <div className="subsection" style={{ marginBottom: 24 }}>
        <h3>Connection</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Backend URL</label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:3001"
            />
            <span className="hint">limoguard-backend base URL (no /api prefix)</span>
          </div>
          <div className="form-row">
            <label>JWT Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGci…"
            />
            <span className="hint">Bearer token from POST /auth/login</span>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isTest}
              onChange={(e) => setIsTest(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>Use test environment SDK (<code>demo.myfatoorah.com</code>)</span>
          </label>
          <span className="hint">Uncheck for UAE production (<code>ae.myfatoorah.com</code>)</span>
        </div>
      </div>

      {/* ── Step 1: Initiate Session ─────────────────────────────────────────── */}
      <div className="subsection" style={{ marginBottom: 24 }}>
        <h3>Step 1 — Initiate Session</h3>
        <p className="section-desc" style={{ marginBottom: 12 }}>
          Calls <code>POST /embedded-payment/session</code>. The backend calls MyFatoorah{' '}
          <code>/v2/InitiateSession</code> and stores the <code>SessionId</code> on the driver record.
          Returns the session so the frontend can render the embedded card form.
        </p>

        <form onSubmit={handleInitSession} className="form">
          <div className="form-grid">
            <div className="form-row">
              <label>Driver ID</label>
              <input
                type="text"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                placeholder="664f1a2b3c4d5e6f7a8b9c0d"
                required
              />
              <span className="hint">MongoDB ObjectId of the driver</span>
            </div>
            <div className="form-row" style={{ justifyContent: 'flex-end', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20 }}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span>Is Recurring</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20 }}>
                <input
                  type="checkbox"
                  checked={saveToken}
                  onChange={(e) => setSaveToken(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span>Save Token</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={sessionLoading || !token || !driverId}
          >
            {sessionLoading ? 'Creating Session…' : 'Init Session'}
          </button>
        </form>

        {sessionError && <div className="alert alert-error">{sessionError}</div>}

        {session && (
          <div className="result-box" style={{ marginTop: 12 }}>
            <div className="result-header">
              <h3>Session Created</h3>
              <span className="status-badge" style={{ background: 'var(--success)' }}>OK</span>
            </div>
            <div className="kv-grid">
              <div className="kv">
                <span className="kv-label">Session ID</span>
                <span className="kv-val badge">{session.SessionId}</span>
              </div>
              <div className="kv">
                <span className="kv-label">Country Code</span>
                <span className="kv-val">{session.CountryCode || '—'}</span>
              </div>
              <div className="kv">
                <span className="kv-label">SDK</span>
                <span className="kv-val" style={{ fontSize: 12 }}>
                  {sdkReady ? '✓ Loaded' : sdkError ? '✗ Error' : 'Loading…'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Step 2: Card Form ────────────────────────────────────────────────── */}
      {session && (
        <div className="subsection" style={{ marginBottom: 24 }}>
          <h3>Step 2 — Enter Card Details</h3>
          <p className="section-desc" style={{ marginBottom: 12 }}>
            MyFatoorah embedded card form rendered via the SDK using the{' '}
            <code>SessionId</code> above. Fill in the card details and click{' '}
            <strong>Pay Now</strong> below to capture and charge.
          </p>

          {sdkError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{sdkError}</div>}

          <div
            id="mf-embedded-form"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              background: 'var(--surface)',
              minHeight: 200,
              marginBottom: 12,
            }}
          >
            {!sdkReady && !sdkError && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading card form…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Execute Payment ──────────────────────────────────────────── */}
      {session && (
        <div className="subsection" style={{ marginBottom: 24 }}>
          <h3>Step 3 — Execute Payment</h3>
          <p className="section-desc" style={{ marginBottom: 12 }}>
            Clicking <strong>Pay Now</strong> first calls <code>mf.submit()</code> to capture
            the card, then calls <code>POST /embedded-payment/execute</code>. The backend
            retrieves the stored <code>SessionId</code> from the driver and calls MyFatoorah{' '}
            <code>/v2/ExecutePayment</code>. A <code>PaymentURL</code> in the response signals
            a 3DS redirect is needed.
          </p>

          <form onSubmit={handlePayNow} className="form">
            <div className="form-grid">
              <div className="form-row">
                <label>Invoice Value (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={invoiceValue}
                  onChange={(e) => setInvoiceValue(Number(e.target.value))}
                  required
                />
              </div>
              <div className="form-row">
                <label>Callback URL</label>
                <input
                  type="text"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  required
                />
                <span className="hint">MyFatoorah redirects here on success</span>
              </div>
              <div className="form-row">
                <label>Error URL</label>
                <input
                  type="text"
                  value={errorUrl}
                  onChange={(e) => setErrorUrl(e.target.value)}
                  required
                />
                <span className="hint">MyFatoorah redirects here on failure</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                className="btn btn-success"
                disabled={payLoading || !sdkReady}
              >
                {payLoading ? 'Processing…' : 'Pay Now'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Reset
              </button>
            </div>
          </form>

          {payError && <div className="alert alert-error">{payError}</div>}
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────────────── */}
      {executeResult && (
        <div className="result-box" style={{ marginTop: 8 }}>
          <div className="result-header">
            <h3>Payment Result</h3>
            <span className="status-badge" style={{ background: 'var(--success)' }}>Executed</span>
          </div>

          {executeResult.PaymentURL && (
            <div className="invoice-url">
              <strong>3DS / Payment URL: </strong>
              <a href={executeResult.PaymentURL} target="_blank" rel="noreferrer">
                {executeResult.PaymentURL}
              </a>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>
                Redirect the user here to complete 3DS verification.
              </small>
            </div>
          )}

          {executeResult.InvoiceURL && !executeResult.PaymentURL && (
            <div className="invoice-url">
              <strong>Invoice URL: </strong>
              <a href={executeResult.InvoiceURL} target="_blank" rel="noreferrer">
                {executeResult.InvoiceURL}
              </a>
            </div>
          )}

          <div className="kv-grid">
            {executeResult.InvoiceId && (
              <div className="kv">
                <span className="kv-label">Invoice ID</span>
                <span className="kv-val badge">{executeResult.InvoiceId}</span>
              </div>
            )}
            {executeResult.InvoiceStatus && (
              <div className="kv">
                <span className="kv-label">Status</span>
                <span className="kv-val">{executeResult.InvoiceStatus}</span>
              </div>
            )}
            {executeResult.InvoiceValue && (
              <div className="kv">
                <span className="kv-label">Amount</span>
                <span className="kv-val">{executeResult.InvoiceValue} {executeResult.CurrencyIso}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {executeResult.PaymentURL && (
              <a
                href={executeResult.PaymentURL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Complete 3DS →
              </a>
            )}
            <button type="button" className="btn btn-secondary" onClick={reset}>
              New Payment
            </button>
          </div>

          <details style={{ marginTop: 16 }}>
            <summary>Full Execute Response</summary>
            <pre className="json-block">{JSON.stringify(executeResult, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
