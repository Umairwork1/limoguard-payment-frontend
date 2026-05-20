import { useState } from 'react';
import { api } from '../api/api';

interface Props {
  prefillId?: string;
  onCancelled: () => void;
}

export default function CancelRecurring({ prefillId, onCancelled }: Props) {
  const [recurringId, setRecurringId] = useState(prefillId || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.cancelRecurring(recurringId.trim());
      setResult(res);
      onCancelled();
      setConfirmed(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Cancel Recurring Payment</h2>
      <p className="section-desc">
        Calls <code>DELETE /v2/CancelRecurringPayment?recurringId=...</code>. This permanently
        cancels the recurring — no further charges will be made.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label>Recurring ID</label>
          <input
            type="text"
            value={recurringId}
            onChange={(e) => {
              setRecurringId(e.target.value);
              setConfirmed(false);
            }}
            placeholder="e.g. 12345"
            required
          />
        </div>

        {confirmed && (
          <div className="alert alert-warn">
            Are you sure? This will permanently cancel the recurring. Click again to confirm.
          </div>
        )}

        <button
          type="submit"
          className={`btn ${confirmed ? 'btn-danger-confirm' : 'btn-danger'}`}
          disabled={loading}
        >
          {loading ? 'Cancelling…' : confirmed ? 'Confirm Cancel' : 'Cancel Recurring'}
        </button>

        {confirmed && (
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: 8 }}
            onClick={() => setConfirmed(false)}
          >
            Abort
          </button>
        )}
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <div className="alert alert-success">Recurring payment cancelled successfully.</div>
          <details>
            <summary>Full Response</summary>
            <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
