import axios from 'axios';
import type {
  InitiatePaymentRequest,
  ExecutePaymentRequest,
  RecurringRecord,
  DirectInitiateRequest,
  DirectRegisterRequest,
  DirectChargeRequest,
  DirectToken,
  CreateSessionRequest,
  PaymentChargeRequest,
} from '../types/payment';

const BASE = 'http://localhost:3002/api';

const client = axios.create({ baseURL: BASE });

export const api = {
  initiatePayment: (data: InitiatePaymentRequest) =>
    client.post('/recurring/initiate', data).then((r) => r.data),

  executePayment: (data: ExecutePaymentRequest) =>
    client.post('/recurring/execute', data).then((r) => r.data),

  getRecurring: (recurringId: string) =>
    client.get(`/recurring/${recurringId}`).then((r) => r.data),

  resumeRecurring: (recurringId: string) =>
    client.post(`/recurring/${recurringId}/resume`).then((r) => r.data),

  cancelRecurring: (recurringId: string) =>
    client.delete(`/recurring/${recurringId}/cancel`).then((r) => r.data),

  listRecurrings: (): Promise<RecurringRecord[]> =>
    client.get('/recurring').then((r) => r.data),

  // ── v3 Vendor-Managed Recurring ─────────────────────────────────────────────

  // Step 1 — POST /payment/session → SessionId + EncryptionKey for JS SDK
  createSession: (data: CreateSessionRequest) =>
    client.post('/payment/session', data).then((r) => r.data),

  // Step 1b — After SDK callback fires with paymentData, verify with backend
  verifyPayment: (data: { paymentData: string; encryptionKey: string; reference: string }) =>
    client.post('/payment/verify', data).then((r) => r.data),

  // Step 2 — GET /v3/customers → saved tokenized cards for a customer reference
  getCustomerCards: (customerReference: string) =>
    client.get(`/payment/customers?Reference=${encodeURIComponent(customerReference)}`).then((r) => r.data),

  // ── Direct Payment ──────────────────────────────────────────────────────────

  directInitiate: (data: DirectInitiateRequest) =>
    client.post('/direct/initiate', data).then((r) => r.data),

  directRegister: (data: DirectRegisterRequest) =>
    client.post('/direct/register', data).then((r) => r.data),

  listDirectTokens: (): Promise<DirectToken[]> =>
    client.get('/direct/tokens').then((r) => r.data),

  getDirectToken: (tokenId: string) =>
    client.get(`/direct/tokens/${tokenId}`).then((r) => r.data),

  chargeDirectToken: (tokenId: string, data: DirectChargeRequest) =>
    client.post(`/direct/tokens/${tokenId}/charge`, data).then((r) => r.data),

  deleteDirectToken: (tokenId: string) =>
    client.delete(`/direct/tokens/${tokenId}`).then((r) => r.data),

  // POST /payment/charge — charge a saved card token directly
  paymentCharge: (data: PaymentChargeRequest) =>
    client.post('/payment/charge', data).then((r) => r.data),
};
