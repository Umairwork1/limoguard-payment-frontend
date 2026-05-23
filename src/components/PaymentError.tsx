export default function PaymentError() {
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('invoiceId') || params.get('Id');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2' }}>
      <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 480, width: '100%' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✗</div>
        <h1 style={{ color: '#dc2626', marginBottom: 8, fontSize: 28 }}>Payment Failed</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          The payment could not be completed. No charge has been made.
        </p>
        {invoiceId && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 13 }}>
            Invoice ID: <strong>{invoiceId}</strong>
          </div>
        )}
        <button
          onClick={() => window.location.href = '/'}
          style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, cursor: 'pointer' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
