import { useState, useCallback } from 'react';

// Recurring
import InitiatePayment from './components/InitiatePayment';
import CreateRecurring from './components/CreateRecurring';
import GetRecurring from './components/GetRecurring';
import ResumeRecurring from './components/ResumeRecurring';
import CancelRecurring from './components/CancelRecurring';
import RecurringList from './components/RecurringList';

// Direct (v2)
import DirectInitiate from './components/DirectInitiate';
import DirectRegister from './components/DirectRegister';
import DirectTokenDetail from './components/DirectTokenDetail';
import DirectCharge from './components/DirectCharge';
import DirectTokensList from './components/DirectTokensList';

// V3 Vendor-Managed Recurring
import V3CreateSession from './components/V3CreateSession';
import V3GetCustomer from './components/V3GetCustomer';
import V3Charge from './components/V3Charge';
import V3FastPay from './components/V3FastPay';
import V3SessionsList from './components/V3SessionsList';
import WebhookEvents from './components/WebhookEvents';

import ErrorBoundary from './components/ErrorBoundary';
import type { CurrencyIso } from './types/payment';
import './App.css';

type Section = 'recurring' | 'direct' | 'v3' | 'webhooks';
type RecurringTab = 'initiate' | 'create' | 'get' | 'resume' | 'cancel';
type DirectTab = 'initiate' | 'register' | 'detail' | 'charge';
type V3Tab = 'session' | 'tokens' | 'charge' | 'fastpay';

const SECTIONS: Section[] = ['recurring', 'direct', 'v3', 'webhooks'];
const RECURRING_TABS: { id: RecurringTab; label: string }[] = [
  { id: 'initiate', label: '1. Get Methods' },
  { id: 'create', label: '2. Create Recurring' },
  { id: 'get', label: '3. Get Status' },
  { id: 'resume', label: '4. Resume' },
  { id: 'cancel', label: '5. Cancel' },
];
const DIRECT_TABS: { id: DirectTab; label: string }[] = [
  { id: 'initiate', label: '1. Get Methods' },
  { id: 'register', label: '2. Register Card' },
  { id: 'detail', label: '3. Token Detail' },
  { id: 'charge', label: '4. Charge Token' },
];
const V3_TABS: { id: V3Tab; label: string }[] = [
  { id: 'session', label: '1. Create Session' },
  { id: 'tokens', label: '2. Get Tokens' },
  { id: 'charge', label: '3. Charge Token' },
  { id: 'fastpay', label: '4. FastPay (No CVV)' },
];

// ── URL param helpers ──────────────────────────────────────────────────────────

function getParam(key: string): string {
  return new URLSearchParams(window.location.search).get(key) ?? '';
}

function setParams(updates: Record<string, string>) {
  const sp = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(updates)) {
    if (v) sp.set(k, v); else sp.delete(k);
  }
  window.history.replaceState(null, '', `?${sp.toString()}`);
}

function readSection(): Section {
  const s = getParam('s');
  return SECTIONS.includes(s as Section) ? (s as Section) : 'recurring';
}
function readRecurringTab(): RecurringTab {
  const t = getParam('rt');
  return RECURRING_TABS.some((x) => x.id === t) ? (t as RecurringTab) : 'initiate';
}
function readDirectTab(): DirectTab {
  const t = getParam('dt');
  return DIRECT_TABS.some((x) => x.id === t) ? (t as DirectTab) : 'initiate';
}
function readV3Tab(): V3Tab {
  const t = getParam('vt');
  return (['session', 'tokens', 'charge', 'fastpay'] as V3Tab[]).includes(t as V3Tab)
    ? (t as V3Tab)
    : 'session';
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [section, _setSection] = useState<Section>(readSection);
  const [recurringTab, _setRecurringTab] = useState<RecurringTab>(readRecurringTab);
  const [directTab, _setDirectTab] = useState<DirectTab>(readDirectTab);
  const [v3Tab, _setV3Tab] = useState<V3Tab>(readV3Tab);

  // Wrap setters so they also write to the URL
  const setSection = useCallback((s: Section) => {
    _setSection(s);
    setParams({ s, rt: '', dt: '', vt: '' });
  }, []);
  const setRecurringTab = useCallback((t: RecurringTab) => {
    _setRecurringTab(t);
    setParams({ rt: t });
  }, []);
  const setDirectTab = useCallback((t: DirectTab) => {
    _setDirectTab(t);
    setParams({ dt: t });
  }, []);
  const setV3Tab = useCallback((t: V3Tab) => {
    _setV3Tab(t);
    setParams({ vt: t });
  }, []);

  // Recurring state
  const [selectedMethodId, setSelectedMethodId] = useState<number | undefined>();
  const [activeRecurringId, setActiveRecurringId] = useState('');
  const [recurringRefresh, setRecurringRefresh] = useState(0);

  // Direct (v2) state
  const [directMethodId, setDirectMethodId] = useState<number | undefined>();
  const [directAmount, setDirectAmount] = useState<number | undefined>();
  const [directCurrency, setDirectCurrency] = useState<CurrencyIso | undefined>();
  const [activeTokenId, setActiveTokenId] = useState('');
  const [directRefresh, setDirectRefresh] = useState(0);

  // V3 state
  const [v3Reference, setV3Reference] = useState('');
  const [v3Token, setV3Token] = useState('');
  const [v3Refresh, setV3Refresh] = useState(0);

  // Recurring handlers
  const refreshRecurring = () => setRecurringRefresh((n) => n + 1);
  const handleRecurringSelectId = (id: string) => { setActiveRecurringId(id); setRecurringTab('get'); };
  const handleMethodSelect = (methodId: number) => { setSelectedMethodId(methodId); setRecurringTab('create'); };

  // Direct handlers
  const refreshDirect = () => setDirectRefresh((n) => n + 1);
  const handleDirectMethodSelect = (methodId: number, amount: number, currency: CurrencyIso) => {
    setDirectMethodId(methodId); setDirectAmount(amount); setDirectCurrency(currency); setDirectTab('register');
  };
  const handleTokenSelect = (tokenId: string) => { setActiveTokenId(tokenId); setDirectTab('detail'); };

  // V3 handlers
  const refreshV3 = () => setV3Refresh((n) => n + 1);
  const handleV3SessionCreated = (reference: string) => {
    setV3Reference(reference);
    setV3Tab('tokens');
  };
  const handleV3TokenSelect = (token: string) => { setV3Token(token); setV3Tab('charge'); };
  const handleV3ReferenceSelect = (reference: string) => { setV3Reference(reference); setV3Tab('tokens'); };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">⟳</span>
          <div>
            <h1>MyFatoorah Payment</h1>
            <p>Test harness · NestJS + React + MongoDB</p>
          </div>
        </div>

        <div className="section-switcher">
          <button className={`section-btn ${section === 'recurring' ? 'section-btn--active' : ''}`} onClick={() => setSection('recurring')}>
            Recurring (v2)
          </button>
          <button className={`section-btn ${section === 'direct' ? 'section-btn--active' : ''}`} onClick={() => setSection('direct')}>
            Direct (v2)
          </button>
          <button className={`section-btn ${section === 'v3' ? 'section-btn--active' : ''}`} onClick={() => setSection('v3')}>
            Vendor Recurring (v3)
          </button>
          <button className={`section-btn ${section === 'webhooks' ? 'section-btn--active' : ''}`} onClick={() => setSection('webhooks')}>
            Webhooks
          </button>
        </div>

        <a href={import.meta.env.VITE_SWAGGER_URL || 'http://localhost:3001/api/docs'} target="_blank" rel="noreferrer" className="swagger-link">
          Swagger →
        </a>
      </header>

      <div className="app-body">
        {section === 'recurring' && (
          <>
            <RecurringList onSelectId={handleRecurringSelectId} refreshTrigger={recurringRefresh} />
            <main className="main-content">
              <nav className="tab-nav">
                {RECURRING_TABS.map((t) => (
                  <button key={t.id} className={`tab-btn ${recurringTab === t.id ? 'tab-btn--active' : ''}`} onClick={() => setRecurringTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="tab-content">
                {recurringTab === 'initiate' && <InitiatePayment onMethodSelect={handleMethodSelect} />}
                {recurringTab === 'create' && <CreateRecurring selectedMethodId={selectedMethodId} onCreated={refreshRecurring} />}
                {recurringTab === 'get' && <GetRecurring prefillId={activeRecurringId} />}
                {recurringTab === 'resume' && <ResumeRecurring prefillId={activeRecurringId} />}
                {recurringTab === 'cancel' && <CancelRecurring prefillId={activeRecurringId} onCancelled={refreshRecurring} />}
              </div>
            </main>
          </>
        )}

        {section === 'direct' && (
          <ErrorBoundary>
            <>
              <DirectTokensList onSelectToken={handleTokenSelect} refreshTrigger={directRefresh} />
              <main className="main-content">
                <nav className="tab-nav">
                  {DIRECT_TABS.map((t) => (
                    <button key={t.id} className={`tab-btn ${directTab === t.id ? 'tab-btn--active' : ''}`} onClick={() => setDirectTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </nav>
                <div className="tab-content">
                  {directTab === 'initiate' && <DirectInitiate onMethodSelect={handleDirectMethodSelect} />}
                  {directTab === 'register' && (
                    <DirectRegister selectedMethodId={directMethodId} prefillAmount={directAmount} prefillCurrency={directCurrency} onRegistered={refreshDirect} />
                  )}
                  {directTab === 'detail' && (
                    <DirectTokenDetail prefillTokenId={activeTokenId} onDeleteSuccess={() => { refreshDirect(); setActiveTokenId(''); }} />
                  )}
                  {directTab === 'charge' && <DirectCharge prefillTokenId={activeTokenId} />}
                </div>
              </main>
            </>
          </ErrorBoundary>
        )}

        {section === 'v3' && (
          <ErrorBoundary>
            <>
              <V3SessionsList onSelectReference={handleV3ReferenceSelect} refreshTrigger={v3Refresh} />
              <main className="main-content">
                <nav className="tab-nav">
                  {V3_TABS.map((t) => (
                    <button key={t.id} className={`tab-btn ${v3Tab === t.id ? 'tab-btn--active' : ''}`} onClick={() => setV3Tab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </nav>
                <div className="tab-content">
                  {v3Tab === 'session' && (
                    <V3CreateSession onCreated={handleV3SessionCreated} onSessionRefresh={refreshV3} />
                  )}
                  {v3Tab === 'tokens' && (
                    <V3GetCustomer prefillReference={v3Reference} onTokenSelect={handleV3TokenSelect} />
                  )}
                  {v3Tab === 'charge' && <V3Charge prefillToken={v3Token} />}
                  {v3Tab === 'fastpay' && <V3FastPay prefillReference={v3Reference} />}
                </div>
              </main>
            </>
          </ErrorBoundary>
        )}

        {section === 'webhooks' && (
          <main className="main-content">
            <div className="tab-content">
              <WebhookEvents />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
