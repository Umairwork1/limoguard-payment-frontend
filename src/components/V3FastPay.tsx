import { useState, useEffect } from 'react';
import { api } from '../api/api';

interface Card {
  Token: string;
  Number: string;
  Brand: string;
  Is3DSVerified: boolean;
  TokenType: string;
}

interface ChargeState {
  loading: boolean;
  result: any;
  error: string;
}

interface Props {
  prefillReference?: string;
}

export default function V3FastPay({ prefillReference }: Props) {
  const [reference, setReference] = useState(prefillReference || '');
  const [amount, setAmount] = useState(10);
  const [language, setLanguage] = useState<'EN' | 'AR'>('EN');
  const [cards, setCards] = useState<Card[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetched, setFetched] = useState(false);
  const [chargeStates, setChargeStates] = useState<Record<string, ChargeState>>({});

  useEffect(() => {
    if (prefillReference) setReference(prefillReference);
  }, [prefillReference]);

  const fetchCards = async (e: React.FormEvent) => {
    e.preventDefault();
    setFetchLoading(true);
    setFetchError('');
    setCards([]);
    setFetched(false);
    setChargeStates({});
    try {
      const res = await api.v3GetCustomerTokens(reference.trim());
      const list: Card[] = res?.Data?.Cards || [];
      setCards(list);
      setFetched(true);
    } catch (err: any) {
      setFetchError(err?.response?.data?.message || err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const charge = async (card: Card) => {
    setChargeStates((prev) => ({
      ...prev,
      [card.Token]: { loading: true, result: null, error: '' },
    }));
    try {
      const res = await api.v3ChargeToken({
        token: card.Token,
        amount,
        language,
      });
      setChargeStates((prev) => ({
        ...prev,
        [card.Token]: { loading: false, result: res, error: '' },
      }));
    } catch (err: any) {
      setChargeStates((prev) => ({
        ...prev,
        [card.Token]: {
          loading: false,
          result: null,
          error: err?.response?.data?.message || err.message,
        },
      }));
    }
  };

  return (
    <div>
      <h2 className="section-title">FastPay — Direct Token Charge (No CVV)</h2>
      <p className="section-desc">
        Charges a saved token directly via <code>POST /v3/payments</code> with{' '}
        <code>SourceOfFund.Token</code>. No card form, no CVV, no redirect — fully server-side.
      </p>

      <div className="alert alert-warn" style={{ marginBottom: 20 }}>
        <strong>Account requirement:</strong> <em>FastPay</em> (for 3DS-verified cards) or{' '}
        <em>Bypass3DS + BypassCvv</em> must be enabled by your MyFatoorah account manager. Without
        these features the charge will be rejected.
      </div>

      {/* ── Lookup form ───────────────────────────────────────────────────────── */}
      <form onSubmit={fetchCards} className="form">
        <div className="form-grid">
          <div className="form-row">
            <label>Customer Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="#CUST-001"
              required
            />
            <span className="hint">The same reference used when saving the card</span>
          </div>
          <div className="form-row">
            <label>Charge Amount</label>
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
        </div>
        <button type="submit" className="btn btn-primary" disabled={fetchLoading}>
          {fetchLoading ? 'Fetching cards…' : 'Fetch Saved Cards'}
        </button>
      </form>

      {fetchError && <div className="alert alert-error" style={{ marginTop: 12 }}>{fetchError}</div>}

      {/* ── Card list ─────────────────────────────────────────────────────────── */}
      {fetched && (
        <div className="result-box" style={{ marginTop: 20 }}>
          <h3>
            Saved cards for <code>{reference}</code>
            <span style={{ fontWeight: 400, fontSize: 13, color: '#6b7280', marginLeft: 8 }}>
              ({cards.length} found)
            </span>
          </h3>

          {cards.length === 0 ? (
            <div className="alert alert-warn" style={{ marginTop: 12 }}>
              No saved cards for this reference. Complete a session payment in <strong>Step 1</strong> first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              {cards.map((card) => {
                const state = chargeStates[card.Token];
                const txn = state?.result?.Data?.TransactionDetails;
                return (
                  <div
                    key={card.Token}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 16,
                      background: '#fff',
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{card.Brand}</span>
                      <code style={{ flex: 1 }}>{card.Number}</code>
                      <span
                        style={{
                          fontSize: 12,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: card.Is3DSVerified ? '#dcfce7' : '#fef3c7',
                          color: card.Is3DSVerified ? '#166534' : '#92400e',
                        }}
                      >
                        {card.Is3DSVerified ? '✓ 3DS Verified (FastPay eligible)' : '✗ Not 3DS Verified'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                      Token: <code>{card.Token}</code>
                    </div>

                    {/* Charge button */}
                    {!state?.result && (
                      <button
                        type="button"
                        className="btn btn-success"
                        disabled={state?.loading}
                        onClick={() => charge(card)}
                      >
                        {state?.loading ? 'Charging…' : `Charge ${amount} — No CVV`}
                      </button>
                    )}

                    {state?.error && (
                      <div className="alert alert-error" style={{ marginTop: 8 }}>
                        {state.error}
                      </div>
                    )}

                    {/* Charge result */}
                    {state?.result && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span
                            className="status-badge"
                            style={{
                              background:
                                txn?.Transaction?.Status === 'SUCCESS' ? '#16a34a' : '#dc2626',
                            }}
                          >
                            {txn?.Transaction?.Status || (state.result?.IsSuccess ? 'Submitted' : 'Failed')}
                          </span>
                          {state.result?.Data?.InvoiceId && (
                            <span style={{ fontSize: 13, color: '#374151' }}>
                              Invoice: <strong>{state.result.Data.InvoiceId}</strong>
                            </span>
                          )}
                          {txn?.Amount?.ValueInBaseCurrency && (
                            <span style={{ fontSize: 13, color: '#374151' }}>
                              {txn.Amount.ValueInBaseCurrency} {txn.Amount.BaseCurrency}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: 12 }}
                            onClick={() =>
                              setChargeStates((prev) => {
                                const next = { ...prev };
                                delete next[card.Token];
                                return next;
                              })
                            }
                          >
                            Charge Again
                          </button>
                          <details style={{ display: 'inline' }}>
                            <summary style={{ fontSize: 12, cursor: 'pointer', color: '#6b7280' }}>
                              Full Response
                            </summary>
                            <pre className="json-block" style={{ marginTop: 8 }}>
                              {JSON.stringify(state.result, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
