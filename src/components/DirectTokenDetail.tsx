import { useState, useEffect } from 'react';
import { api } from '../api/api';

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  pending: '#ca8a04',
  inactive: '#dc2626',
};

interface Props {
  prefillTokenId?: string;
  onDeleteSuccess: () => void;
}

export default function DirectTokenDetail({ prefillTokenId, onDeleteSuccess }: Props) {
  const [tokenId, setTokenId] = useState(prefillTokenId || '');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (prefillTokenId) setTokenId(prefillTokenId);
  }, [prefillTokenId]);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.getDirectToken(tokenId.trim());
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmed) {
      setDeleteConfirmed(true);
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteDirectToken(tokenId.trim());
      setResult(null);
      setDeleteConfirmed(false);
      onDeleteSuccess();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || err.message);
      setDeleteConfirmed(false);
    } finally {
      setDeleting(false);
    }
  };

  const status: string = result?.status || '';

  return (
    <div>
      <h2 className="section-title">Token Detail</h2>
      <p className="section-desc">
        Calls <code>GET /api/direct/tokens/:tokenId</code> to inspect a saved card token. You can
        also delete it from here.
      </p>

      <form onSubmit={handleFetch} className="form">
        <div className="form-row">
          <label>Token ID</label>
          <input
            type="text"
            value={tokenId}
            onChange={(e) => {
              setTokenId(e.target.value);
              setDeleteConfirmed(false);
            }}
            placeholder="e.g. abc123"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Fetching…' : 'Fetch Token'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div className="result-box">
          <div className="result-header">
            <h3>Token Details</h3>
            {status && (
              <span
                className="status-badge"
                style={{ background: STATUS_COLORS[status?.toLowerCase()] || '#6b7280' }}
              >
                {status}
              </span>
            )}
          </div>

          <div className="kv-grid">
            {result.customerTokenId && (
              <div className="kv">
                <span className="kv-label">Token ID</span>
                <span className="kv-val badge">{result.customerTokenId}</span>
              </div>
            )}
            {result.maskedCard && (
              <div className="kv">
                <span className="kv-label">Card</span>
                <span className="kv-val"><code>{result.maskedCard}</code></span>
              </div>
            )}
            {result.paymentGateway && (
              <div className="kv">
                <span className="kv-label">Gateway</span>
                <span className="kv-val">{result.paymentGateway}</span>
              </div>
            )}
            {result.customerName && (
              <div className="kv">
                <span className="kv-label">Customer</span>
                <span className="kv-val">{result.customerName}</span>
              </div>
            )}
            {result.customerEmail && (
              <div className="kv">
                <span className="kv-label">Email</span>
                <span className="kv-val">{result.customerEmail}</span>
              </div>
            )}
            {result.customerMobile && (
              <div className="kv">
                <span className="kv-label">Mobile</span>
                <span className="kv-val">{result.customerMobile}</span>
              </div>
            )}
            {result.currencyIso && (
              <div className="kv">
                <span className="kv-label">Currency</span>
                <span className="kv-val">{result.currencyIso}</span>
              </div>
            )}
            {result.createdAt && (
              <div className="kv">
                <span className="kv-label">Created</span>
                <span className="kv-val">{new Date(result.createdAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          <details style={{ marginBottom: 16 }}>
            <summary>Full Response</summary>
            <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
          </details>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {deleteConfirmed && (
              <div className="alert alert-warn" style={{ margin: 0, flex: 1 }}>
                This will permanently delete the token. Click again to confirm.
              </div>
            )}
            <button
              type="button"
              className={`btn ${deleteConfirmed ? 'btn-danger-confirm' : 'btn-danger'}`}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : deleteConfirmed ? 'Confirm Delete' : 'Delete Token'}
            </button>
            {deleteConfirmed && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmed(false)}
              >
                Abort
              </button>
            )}
          </div>
          {deleteError && <div className="alert alert-error" style={{ marginTop: 8 }}>{deleteError}</div>}
        </div>
      )}
    </div>
  );
}
