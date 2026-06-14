import axios from 'axios';
import type {
  InitiatePaymentRequest,
  ExecutePaymentRequest,
  RecurringRecord,
  DirectInitiateRequest,
  DirectRegisterRequest,
  DirectChargeRequest,
  DirectSaveCardRequest,
  DirectToken,
  V3CreateSessionRequest,
  V3ChargeRequest,
  V3Session,
} from '../types/payment';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

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

  // ── Direct Payment ──────────────────────────────────────────────────────────

  directInitiate: (data: DirectInitiateRequest) =>
    client.post('/direct/initiate', data).then((r) => r.data),

  directRegister: (data: DirectRegisterRequest) =>
    client.post('/direct/register', data).then((r) => r.data),

  directSaveCard: (data: DirectSaveCardRequest) =>
    client.post('/direct/save-card', data).then((r) => r.data),

  listDirectTokens: (): Promise<DirectToken[]> =>
    client.get('/direct/tokens').then((r) => r.data),

  getDirectToken: (tokenId: string) =>
    client.get(`/direct/tokens/${tokenId}`).then((r) => r.data),

  chargeDirectToken: (tokenId: string, data: DirectChargeRequest) =>
    client.post(`/direct/tokens/${tokenId}/charge`, data).then((r) => r.data),

  deleteDirectToken: (tokenId: string) =>
    client.delete(`/direct/tokens/${tokenId}`).then((r) => r.data),

  // ── V3 Vendor-Managed Recurring ─────────────────────────────────────────────

  v3CreateSession: (data: V3CreateSessionRequest) =>
    client.post('/v3/sessions', data).then((r) => r.data),

  v3GetCustomerTokens: (reference: string) =>
    client.get(`/v3/customers/${encodeURIComponent(reference)}`).then((r) => r.data),

  v3ChargeToken: (data: V3ChargeRequest) =>
    client.post('/v3/payments', data).then((r) => r.data),

  v3ListSessions: (): Promise<V3Session[]> =>
    client.get('/v3/sessions').then((r) => r.data),

  // ── Webhooks ─────────────────────────────────────────────────────────────────

  listWebhookEvents: (limit = 50) =>
    client.get(`/webhooks/events?limit=${limit}`).then((r) => r.data),
};
