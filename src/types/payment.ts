export type RecurringType = 'Custom' | 'Daily' | 'Weekly' | 'Monthly';
export type TokenStatus = 'pending' | 'active' | 'inactive';
export type Language = 'en' | 'ar';
export type CurrencyIso = 'KWD' | 'SAR' | 'BHD' | 'AED' | 'QAR' | 'OMR' | 'JOD' | 'EGP';

export interface PaymentMethod {
  PaymentMethodId: number;
  PaymentMethodAr: string;
  PaymentMethodEn: string;
  PaymentMethodCode: string;
  IsDirectPayment: boolean;
  ServiceCharge: number;
  TotalAmount: number;
  CurrencyIso: string;
  ImageUrl: string;
}

export interface InitiatePaymentRequest {
  invoiceAmount: number;
  currencyIso: CurrencyIso;
}

export interface RecurringModelRequest {
  recurringType: RecurringType;
  intervalDays?: number;
  iteration: number;
  retryCount?: number;
}

export interface ExecutePaymentRequest {
  paymentMethodId: number;
  invoiceValue: number;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  displayCurrencyIso: CurrencyIso;
  language: Language;
  callBackUrl?: string;
  errorUrl?: string;
  customerReference?: string;
  recurringModel: RecurringModelRequest;
}

// ── Direct Payment ────────────────────────────────────────────────────────────

export interface DirectInitiateRequest {
  invoiceAmount: number;
  currencyIso: CurrencyIso;
}

export interface DirectRegisterRequest {
  paymentMethodId: number;
  invoiceValue: number;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  displayCurrencyIso: CurrencyIso;
  language: Language;
  callBackUrl?: string;
  errorUrl?: string;
  customerReference?: string;
}

export interface DirectChargeRequest {
  invoiceValue: number;
  currencyIso: CurrencyIso; // maps to backend DirectChargeDto.currencyIso
}

// ── V3 Vendor-Managed Recurring ───────────────────────────────────────────────

export interface V3CreateSessionRequest {
  amount: number;
  customerReference: string;
  currency?: CurrencyIso;
  paymentMode?: 'COMPLETE_PAYMENT' | 'COLLECT_DETAILS';
  redirectionUrl?: string;
}

export interface V3ChargeRequest {
  token?: string;
  sessionId?: string;
  amount?: number;
  customerReference?: string;
  language?: 'EN' | 'AR';
}

export interface V3Card {
  Token: string;
  Number: string;
  Brand: string;
  Is3DSVerified: boolean;
  TokenType: string;
}

export interface V3Session {
  _id: string;
  customerReference: string;
  sessionId: string;
  sessionExpiry: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface DirectToken {
  _id: string;
  tokenId: string;
  recurringId?: string;
  invoiceId?: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  currencyIso: string;
  status: TokenStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Recurring ─────────────────────────────────────────────────────────────────

export interface RecurringRecord {
  _id: string;
  recurringId: string;
  invoiceId: string;
  invoiceUrl: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  amount: number;
  currencyIso: string;
  recurringType: RecurringType;
  intervalDays?: number;
  iteration: number;
  retryCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}
