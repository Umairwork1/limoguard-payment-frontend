import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PaymentSuccess from './components/PaymentSuccess.tsx'
import PaymentError from './components/PaymentError.tsx'

const path = window.location.pathname;

let Component: React.ComponentType;
if (path === '/payment-success') {
  Component = PaymentSuccess;
} else if (path === '/payment-error') {
  Component = PaymentError;
} else {
  Component = App;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Component />
  </StrictMode>,
)
