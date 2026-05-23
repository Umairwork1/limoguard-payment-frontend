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
  CreateSessionResponse,
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

  // ── Direct Payment ──────────────────────────────────────────────────────────

  createSession: (data: CreateSessionRequest): Promise<CreateSessionResponse> =>
    client.post('/direct/session', data).then((r) => r.data),

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

  // Step 2 of v3 recurring: retrieve all saved cards for a customer from MyFatoorah
  getCustomerCards: (customerReference: string) =>
    client.get(`/direct/customers/${encodeURIComponent(customerReference)}/cards`).then((r) => r.data),
};
