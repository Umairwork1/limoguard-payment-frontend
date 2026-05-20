import { useState } from 'react';
import { api } from '../api/api';

interface Props {
  prefillId?: string;
}

export default function ResumeRecurring({ prefillId }: Props) {
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
      const res = await api.resumeRecurring(recurringId.trim());
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="section-title">Resume Recurring Payment</h2>
      <p className="section-desc">
        Calls <code>POST /v2/ResumeRecurringPayment?recurringId=...</code> to retry a
        failed or paused recurring. The recurring must be in an inactive state.
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
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Resuming…' : 'Resume Recurring'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <div className="alert alert-success">Recurring payment resumed successfully.</div>
          <details>
            <summary>Full Response</summary>
            <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
