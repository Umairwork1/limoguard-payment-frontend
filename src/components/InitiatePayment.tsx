import { useState } from 'react';
import { api } from '../api/api';
import type { PaymentMethod, CurrencyIso } from '../types/payment';

const CURRENCIES: CurrencyIso[] = ['KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD', 'EGP'];

interface Props {
  onMethodSelect: (methodId: number) => void;
}

export default function InitiatePayment({ onMethodSelect }: Props) {
  const [amount, setAmount] = useState(100);
  const [currency, setCurrency] = useState<CurrencyIso>('KWD');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.initiatePayment({ invoiceAmount: amount, currencyIso: currency });
      setMethods(res?.Data?.PaymentMethods || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Step 1 — Get Payment Methods</h2>
      <p className="section-desc">
        Calls <code>POST /v2/InitiatePayment</code> to retrieve all enabled payment methods and
        their service charges.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Invoice Amount</label>
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
          <label>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyIso)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Loading…' : 'Get Payment Methods'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {methods.length > 0 && (
        <div className="result-box">
          <h3>Available Payment Methods</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Method</th>
                <th>Code</th>
                <th>Service Charge</th>
                <th>Total Amount</th>
                <th>Select</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.PaymentMethodId}>
                  <td>{m.PaymentMethodId}</td>
                  <td>{m.PaymentMethodEn}</td>
                  <td>
                    <code>{m.PaymentMethodCode}</code>
                  </td>
                  <td>{m.ServiceCharge}</td>
                  <td>
                    {m.TotalAmount} {m.CurrencyIso}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onMethodSelect(m.PaymentMethodId)}
                    >
                      Use
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
