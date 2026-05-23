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

// ── v3 Vendor-Managed Recurring ───────────────────────────────────────────────

export interface MobileInput {
  countryCode: string; // e.g. "965"
  number: string;      // e.g. "51234567"
}

export interface CreateSessionRequest {
  invoiceValue: number;
  customerName: string;
  customerEmail: string;
  customerMobile: MobileInput;
  customerReference: string;
  currency?: string;
  language?: 'EN' | 'AR';
  paymentMode?: 'COMPLETE_PAYMENT' | 'COLLECT_DETAILS';
  callBackUrl?: string;
  errorUrl?: string;
}

// Shape returned by myfatoorah.init() callback
export interface MfPaymentCallback {
  isSuccess: boolean;
  sessionId: string;
  paymentCompleted: boolean;
  paymentType: string;        // 'CARD' | 'HOSTED_PAYMENT' | 'APPLE_PAY' etc.
  paymentData?: string;       // AES-128-CBC encrypted, only in COMPLETE_PAYMENT mode
  redirectionUrl?: string;
  paymentId?: string;
  card?: {
    brand: string;
    token: string;
    number: string;
    nameOnCard: string;
    expiryYear: string;
    expiryMonth: string;
  };
}

// Card from GET /v3/customers
export interface MfCard {
  Token: string;
  Number: string;
  Brand: string;
  Is3DSVerified: boolean;
  TokenType: string;
}

// ─────────────────────────────────────────────────────────────────────────────

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
  currencyIso: CurrencyIso;
}

export interface PaymentChargeRequest {
  token       : string;
  invoiceValue: number;
  currency   ?: string;
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
