import { useState, useEffect, useRef } from 'react';
import { api } from '../api/api';
import type { CurrencyIso } from '../types/payment';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const DEFAULT_REDIRECT = `${BACKEND}/api/v3/callback`;

// Test env: demo.myfatoorah.com  |  Production: portal.myfatoorah.com
//const SDK_URL = 'https://demo.myfatoorah.com/sessions/v1/session.js';
// for UAE
const SDK_URL ='https://ae.myfatoorah.com/sessions/v1/session.js';

type PaymentMode = 'COMPLETE_PAYMENT' | 'COLLECT_DETAILS';

interface SavedCard {
  Token: string;
  Number: string;
  Brand: string;
  Is3DSVerified: boolean;
  TokenType: string;
}

interface Props {
  onCreated: (reference: string) => void;
  onSessionRefresh: () => void;
}

export default function V3CreateSession({ onCreated, onSessionRefresh }: Props) {
  const [form, setForm] = useState({
    amount: 10,
    customerReference: '#CUST-001',
    currency: 'KWD' as CurrencyIso,
    paymentMode: 'COMPLETE_PAYMENT' as PaymentMode,
    redirectionUrl: DEFAULT_REDIRECT,
  });
  const [sessionResp, setSessionResp] = useState<any>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [sdkError, setSdkError] = useState('');
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep latest session data accessible inside async callbacks
  const sessionRef = useRef<any>(null);

  const setField = (f: string, v: any) => setForm((p) => ({ ...p, [f]: v }));
  const getMF = () => (window as any).myfatoorah || (window as any).myFatoorah;

  // ── SDK loader ───────────────────────────────────────────────────────────────

  const loadSdk = (onReady: () => void) => {
    if (getMF()) { onReady(); return; }
    const prev = document.getElementById('mf-sdk-script');
    if (prev) prev.remove();
    const s = document.createElement('script');
    s.id = 'mf-sdk-script';
    s.src = SDK_URL;
    s.async = true;
    s.onload = onReady;
    s.onerror = () => setSdkError(`Failed to load SDK from ${SDK_URL} — check network.`);
    document.head.appendChild(s);
  };

  // ── Payment callback (shared by new-card and CVV flows) ──────────────────────

  const handlePaymentCallback = async (response: any) => {
    console.log('[MF callback]', response);

    if (response.paymentCompleted === false) {
      // COLLECT_DETAILS mode — must call POST /v3/payments with sessionId
      setChargeLoading(true);
      try {
        const amount = sessionRef.current?.Data?.Order?.Amount;
        const res = await api.v3ChargeToken({ sessionId: response.sessionId, amount });
        const result = { mode: 'COLLECT_DETAILS', sdkResponse: response, chargeResponse: res };
        setPaymentResult(result);
        if (res?.Data?.PaymentURL) {
          window.open(res.Data.PaymentURL, '_blank');
        }
      } catch (err: any) {
        setPaymentResult({
          mode: 'COLLECT_DETAILS',
          sdkResponse: response,
          error: err?.response?.data?.message || err.message,
        });
      } finally {
        setChargeLoading(false);
      }
    } else {
      // COMPLETE_PAYMENT mode — callback already contains the result
      setPaymentResult({ mode: 'COMPLETE_PAYMENT', sdkResponse: response });
    }
  };

  // ── Init new-card embedded form ───────────────────────────────────────────────

  const initCardForm = (sessionId: string) => {
    setSdkError('');
    loadSdk(() => {
      const mf = getMF();
      if (!mf) { setSdkError('MyFatoorah SDK object not found after load.'); return; }
      try {
        mf.init({
          sessionId,
          containerId: 'mf-card-form',
          callback: handlePaymentCallback,
          style: { direction: 'ltr' },
        });
      } catch (e: any) {
        setSdkError(e?.message || 'SDK init() failed');
      }
    });
  };

  // ── Init CVV-only form for a saved card ──────────────────────────────────────

  const initCvvForm = (sessionId: string) => {
    setSdkError('');
    loadSdk(() => {
      const mf = getMF();
      if (!mf) { setSdkError('MyFatoorah SDK object not found after load.'); return; }
      try {
        mf.initCvv({
          sessionId,
          containerId: 'mf-cvv-form',
          shouldHandlePaymentUrl: true,
          callback: handlePaymentCallback,
          style: {
            direction: 'ltr',
            cardHeight: 90,
            input: {
              color: 'black',
              fontSize: '13px',
              inputHeight: '32px',
              borderColor: 'c7c7c7',
              borderWidth: '1px',
              borderRadius: '4px',
            },
            label: { display: true, color: '#374151', fontSize: '13px', fontWeight: 'normal', text: 'CVV' },
          },
        });
      } catch (e: any) {
        setSdkError(e?.message || 'SDK initCvv() failed');
      }
    });
  };

  // Auto-init new-card form when there are no saved cards
  useEffect(() => {
    if (!sessionResp || savedCards.length > 0) return;
    initCardForm(sessionResp.Data.SessionId);
  }, [sessionResp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init new-card form when user explicitly clicks "Add new card"
  useEffect(() => {
    if (!showNewCard || !sessionResp) return;
    initCardForm(sessionResp.Data.SessionId);
  }, [showNewCard]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init CVV form when a saved card is selected
  useEffect(() => {
    if (!selectedCard || !sessionResp) return;
    setShowNewCard(false);
    initCvvForm(sessionResp.Data.SessionId);
  }, [selectedCard]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create session ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSessionResp(null);
    setSavedCards([]);
    setSelectedCard(null);
    setShowNewCard(false);
    setPaymentResult(null);
    setSdkError('');
    try {
      const res = await api.v3CreateSession({
        amount: Number(form.amount),
        customerReference: form.customerReference,
        currency: form.currency,
        paymentMode: form.paymentMode,
        redirectionUrl: form.redirectionUrl || undefined,
      });
      const cards: SavedCard[] = res?.Data?.Customer?.Cards || [];
      sessionRef.current = res;
      setSessionResp(res);
      setSavedCards(cards);
      onSessionRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitCvv = () => {
    const mf = getMF();
    if (mf && selectedCard) mf.submitCvv(selectedCard.Token);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <h2 className="section-title">Step 1 — Create Session &amp; Pay</h2>
      <p className="section-desc">
        Creates a session via <code>POST /v3/sessions</code>. If the customer has saved cards they
        are shown below for CVV-only payment. New customers see the full card entry form.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-grid">
          <div className="form-row">
            <label>Amount</label>
            <input type="number" step="0.001" min="0.001" value={form.amount}
              onChange={(e) => setField('amount', e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Currency</label>
            <select value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Customer Reference</label>
            <input type="text" value={form.customerReference}
              onChange={(e) => setField('customerReference', e.target.value)}
              placeholder="#CUST-001" required />
            <span className="hint">Unique per customer — reuse to retrieve saved cards</span>
          </div>
          <div className="form-row">
            <label>Payment Mode</label>
            <select value={form.paymentMode} onChange={(e) => setField('paymentMode', e.target.value)}>
              <option value="COMPLETE_PAYMENT">COMPLETE_PAYMENT — MyFatoorah handles OTP</option>
              <option value="COLLECT_DETAILS">COLLECT_DETAILS — backend calls POST /v3/payments</option>
            </select>
          </div>
          <div className="form-row">
            <label>Redirection URL</label>
            <input type="text" value={form.redirectionUrl}
              onChange={(e) => setField('redirectionUrl', e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating Session…' : 'Create Session'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {sessionResp && !paymentResult && (
        <div className="result-box" style={{ marginTop: 20 }}>
          <div className="kv-grid" style={{ marginBottom: 16 }}>
            <div className="kv">
              <span className="kv-label">Session ID</span>
              <span className="kv-val badge">{sessionResp?.Data?.SessionId}</span>
            </div>
            {sessionResp?.Data?.SessionExpiry && (
              <div className="kv">
                <span className="kv-label">Expires</span>
                <span className="kv-val">{new Date(sessionResp.Data.SessionExpiry).toLocaleString()}</span>
              </div>
            )}
            <div className="kv">
              <span className="kv-label">Mode</span>
              <span className="kv-val">{form.paymentMode}</span>
            </div>
          </div>

          {sdkError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{sdkError}</div>}

          {/* ── Saved cards ──────────────────────────────────────────────────── */}
          {savedCards.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8 }}>Saved Cards</h3>
              <p className="section-desc" style={{ marginBottom: 12 }}>
                Select a card to pay with CVV, or add a new card below.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedCards.map((card) => (
                  <div
                    key={card.Token}
                    onClick={() => setSelectedCard(card)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      border: `2px solid ${selectedCard?.Token === card.Token ? '#2563eb' : '#e5e7eb'}`,
                      borderRadius: 8, cursor: 'pointer', background: selectedCard?.Token === card.Token ? '#eff6ff' : '#fff',
                    }}
                  >
                    <span style={{ fontWeight: 600, minWidth: 70 }}>{card.Brand}</span>
                    <code style={{ flex: 1 }}>{card.Number}</code>
                    <span style={{ fontSize: 12, color: card.Is3DSVerified ? '#16a34a' : '#dc2626' }}>
                      {card.Is3DSVerified ? '✓ 3DS' : '✗ 3DS'}
                    </span>
                    {selectedCard?.Token === card.Token && (
                      <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>Selected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CVV input for selected card ──────────────────────────────────── */}
          {selectedCard && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8 }}>Enter CVV for {selectedCard.Brand} {selectedCard.Number}</h3>
              <div
                id="mf-cvv-form"
                style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fafafa', minHeight: 100, marginBottom: 12 }}
              />
              <button type="button" className="btn btn-success" onClick={submitCvv}>
                Submit Payment
              </button>
            </div>
          )}

          {/* ── New card form ─────────────────────────────────────────────────── */}
          {(savedCards.length === 0 || showNewCard) && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 8 }}>
                {savedCards.length > 0 ? 'Add a New Card' : 'Enter Card Details'}
              </h3>
              <p className="section-desc" style={{ marginBottom: 12 }}>
                {savedCards.length > 0
                  ? 'The card will be saved for future payments against this customer reference.'
                  : 'MyFatoorah embedded form — enter your test card details below.'}
              </p>
              <div
                id="mf-card-form"
                style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#fafafa', minHeight: 180, marginBottom: 12 }}
              >
                {!getMF() && !sdkError && (
                  <p style={{ color: '#6b7280', fontSize: 13 }}>Loading card form…</p>
                )}
              </div>
            </div>
          )}

          {/* ── Toggle: add new card when saved cards exist ──────────────────── */}
          {savedCards.length > 0 && !showNewCard && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginBottom: 20 }}
              onClick={() => { setSelectedCard(null); setShowNewCard(true); }}
            >
              + Pay with a new card
            </button>
          )}

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => onCreated(form.customerReference)}>
              Go to Step 2 → (Get Tokens)
            </button>
            <span style={{ marginLeft: 12, fontSize: 13, color: '#6b7280' }}>
              ref: <code>{form.customerReference}</code>
            </span>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary>Full Session Response</summary>
            <pre className="json-block">{JSON.stringify(sessionResp, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* ── Payment result ────────────────────────────────────────────────────── */}
      {paymentResult && (
        <div className="result-box" style={{ marginTop: 20 }}>
          {chargeLoading && <p>Processing charge…</p>}

          <div className="result-header">
            <h3>Payment Result</h3>
            {paymentResult.sdkResponse?.isSuccess !== undefined && (
              <span
                className="status-badge"
                style={{ background: paymentResult.sdkResponse.isSuccess ? '#16a34a' : '#dc2626' }}
              >
                {paymentResult.sdkResponse.isSuccess ? 'Success' : 'Failed'}
              </span>
            )}
          </div>

          <div className="kv-grid">
            <div className="kv">
              <span className="kv-label">Mode</span>
              <span className="kv-val">{paymentResult.mode}</span>
            </div>
            {paymentResult.sdkResponse?.paymentCompleted !== undefined && (
              <div className="kv">
                <span className="kv-label">Payment Completed</span>
                <span className="kv-val">{paymentResult.sdkResponse.paymentCompleted ? 'Yes' : 'No — charge pending'}</span>
              </div>
            )}
            {paymentResult.sdkResponse?.paymentType && (
              <div className="kv">
                <span className="kv-label">Type</span>
                <span className="kv-val">{paymentResult.sdkResponse.paymentType}</span>
              </div>
            )}
            {paymentResult.chargeResponse?.Data?.InvoiceId && (
              <div className="kv">
                <span className="kv-label">Invoice ID</span>
                <span className="kv-val">{paymentResult.chargeResponse.Data.InvoiceId}</span>
              </div>
            )}
            {paymentResult.chargeResponse?.Data?.PaymentURL && (
              <div className="kv">
                <span className="kv-label">Payment URL</span>
                <span className="kv-val">
                  <a href={paymentResult.chargeResponse.Data.PaymentURL} target="_blank" rel="noreferrer">
                    Open to complete payment →
                  </a>
                </span>
              </div>
            )}
            {paymentResult.error && (
              <div className="kv">
                <span className="kv-label">Error</span>
                <span className="kv-val" style={{ color: '#dc2626' }}>{paymentResult.error}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => onCreated(form.customerReference)}>
              Go to Step 2 → (Get Tokens)
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setPaymentResult(null); setSessionResp(null); }}>
              New Session
            </button>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary>Full SDK Callback</summary>
            <pre className="json-block">{JSON.stringify(paymentResult.sdkResponse, null, 2)}</pre>
          </details>
          {paymentResult.chargeResponse && (
            <details style={{ marginTop: 8 }}>
              <summary>Charge Response</summary>
              <pre className="json-block">{JSON.stringify(paymentResult.chargeResponse, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
