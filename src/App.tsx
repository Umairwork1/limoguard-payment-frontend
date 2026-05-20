import { useState } from 'react';

// Recurring
import InitiatePayment from './components/InitiatePayment';
import CreateRecurring from './components/CreateRecurring';
import GetRecurring from './components/GetRecurring';
import ResumeRecurring from './components/ResumeRecurring';
import CancelRecurring from './components/CancelRecurring';
import RecurringList from './components/RecurringList';

// Direct
import DirectInitiate from './components/DirectInitiate';
import DirectRegister from './components/DirectRegister';
import DirectTokenDetail from './components/DirectTokenDetail';
import DirectCharge from './components/DirectCharge';
import DirectTokensList from './components/DirectTokensList';
import ErrorBoundary from './components/ErrorBoundary';

import type { CurrencyIso } from './types/payment';
import './App.css';

type Section = 'recurring' | 'direct';
type RecurringTab = 'initiate' | 'create' | 'get' | 'resume' | 'cancel';
type DirectTab = 'initiate' | 'register' | 'detail' | 'charge';

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

export default function App() {
  const [section, setSection] = useState<Section>('recurring');

  // Recurring state
  const [recurringTab, setRecurringTab] = useState<RecurringTab>('initiate');
  const [selectedMethodId, setSelectedMethodId] = useState<number | undefined>();
  const [activeRecurringId, setActiveRecurringId] = useState('');
  const [recurringRefresh, setRecurringRefresh] = useState(0);

  // Direct state
  const [directTab, setDirectTab] = useState<DirectTab>('initiate');
  const [directMethodId, setDirectMethodId] = useState<number | undefined>();
  const [directAmount, setDirectAmount] = useState<number | undefined>();
  const [directCurrency, setDirectCurrency] = useState<CurrencyIso | undefined>();
  const [activeTokenId, setActiveTokenId] = useState('');
  const [directRefresh, setDirectRefresh] = useState(0);

  // Recurring handlers
  const refreshRecurring = () => setRecurringRefresh((n) => n + 1);
  const handleRecurringSelectId = (id: string) => {
    setActiveRecurringId(id);
    setRecurringTab('get');
  };
  const handleMethodSelect = (methodId: number) => {
    setSelectedMethodId(methodId);
    setRecurringTab('create');
  };

  // Direct handlers
  const refreshDirect = () => setDirectRefresh((n) => n + 1);
  const handleDirectMethodSelect = (methodId: number, amount: number, currency: CurrencyIso) => {
    setDirectMethodId(methodId);
    setDirectAmount(amount);
    setDirectCurrency(currency);
    setDirectTab('register');
  };
  const handleTokenSelect = (tokenId: string) => {
    setActiveTokenId(tokenId);
    setDirectTab('detail');
  };

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
          <button
            className={`section-btn ${section === 'recurring' ? 'section-btn--active' : ''}`}
            onClick={() => setSection('recurring')}
          >
            Recurring
          </button>
          <button
            className={`section-btn ${section === 'direct' ? 'section-btn--active' : ''}`}
            onClick={() => setSection('direct')}
          >
            Direct
          </button>
        </div>

        <a
          href="http://localhost:3001/api/docs"
          target="_blank"
          rel="noreferrer"
          className="swagger-link"
        >
          Swagger Docs →
        </a>
      </header>

      <div className="app-body">
        {section === 'recurring' ? (
          <>
            <RecurringList onSelectId={handleRecurringSelectId} refreshTrigger={recurringRefresh} />
            <main className="main-content">
              <nav className="tab-nav">
                {RECURRING_TABS.map((t) => (
                  <button
                    key={t.id}
                    className={`tab-btn ${recurringTab === t.id ? 'tab-btn--active' : ''}`}
                    onClick={() => setRecurringTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="tab-content">
                {recurringTab === 'initiate' && (
                  <InitiatePayment onMethodSelect={handleMethodSelect} />
                )}
                {recurringTab === 'create' && (
                  <CreateRecurring
                    selectedMethodId={selectedMethodId}
                    onCreated={refreshRecurring}
                  />
                )}
                {recurringTab === 'get' && <GetRecurring prefillId={activeRecurringId} />}
                {recurringTab === 'resume' && <ResumeRecurring prefillId={activeRecurringId} />}
                {recurringTab === 'cancel' && (
                  <CancelRecurring
                    prefillId={activeRecurringId}
                    onCancelled={refreshRecurring}
                  />
                )}
              </div>
            </main>
          </>
        ) : (
          <ErrorBoundary>
            <>
              <DirectTokensList onSelectToken={handleTokenSelect} refreshTrigger={directRefresh} />
              <main className="main-content">
                <nav className="tab-nav">
                  {DIRECT_TABS.map((t) => (
                    <button
                      key={t.id}
                      className={`tab-btn ${directTab === t.id ? 'tab-btn--active' : ''}`}
                      onClick={() => setDirectTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
                <div className="tab-content">
                  {directTab === 'initiate' && (
                    <DirectInitiate onMethodSelect={handleDirectMethodSelect} />
                  )}
                  {directTab === 'register' && (
                    <DirectRegister
                      selectedMethodId={directMethodId}
                      prefillAmount={directAmount}
                      prefillCurrency={directCurrency}
                      onRegistered={refreshDirect}
                    />
                  )}
                  {directTab === 'detail' && (
                    <DirectTokenDetail
                      prefillTokenId={activeTokenId}
                      onDeleteSuccess={() => {
                        refreshDirect();
                        setActiveTokenId('');
                      }}
                    />
                  )}
                  {directTab === 'charge' && (
                    <DirectCharge prefillTokenId={activeTokenId} />
                  )}
                </div>
              </main>
            </>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
