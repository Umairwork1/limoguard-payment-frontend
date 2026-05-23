export default function PaymentSuccess() {
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get('invoiceId') || params.get('Id') || params.get('paymentId');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
      <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 480, width: '100%' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
        <h1 style={{ color: '#16a34a', marginBottom: 8, fontSize: 28 }}>Payment Successful</h1>
        <p style={{ color: '#6b7280', marginBottom: 24 }}>
          Your card has been saved and the payment was processed successfully.
        </p>
        {invoiceId && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontSize: 13 }}>
            Invoice ID: <strong>{invoiceId}</strong>
          </div>
        )}
        <button
          onClick={() => window.location.href = '/'}
          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, cursor: 'pointer' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
