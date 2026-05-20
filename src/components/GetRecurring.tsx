import { useState } from 'react';
import { api } from '../api/api';

interface Props {
  prefillId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#16a34a',
  Draft: '#ca8a04',
  Cancelled: '#dc2626',
  Completed: '#2563eb',
  Unknown: '#6b7280',
};

export default function GetRecurring({ prefillId }: Props) {
  const [recurringId, setRecurringId] = useState(prefillId || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.getRecurring(recurringId.trim());
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const status: string = result?.Data?.RecurringStatus || result?.Data?.Status || '';

  return (
    <div>
      <h2 className="section-title">Get Recurring Payment</h2>
      <p className="section-desc">
        Calls <code>GET /v2/GetRecurringPayment?recurringId=...</code> to fetch the current status
        and execution history.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Recurring ID</label>
          <input
            type="text"
            value={recurringId}
            onChange={(e) => setRecurringId(e.target.value)}
            placeholder="e.g. 12345"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Fetching…' : 'Fetch Status'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <div className="result-header">
            <h3>Recurring Details</h3>
            {status && (
              <span
                className="status-badge"
                style={{ background: STATUS_COLORS[status] || '#6b7280' }}
              >
                {status}
              </span>
            )}
          </div>
          <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
