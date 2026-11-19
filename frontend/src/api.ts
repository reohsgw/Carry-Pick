import axios, { AxiosError } from 'axios';

export type Mode = 'BUYER' | 'TRAVELER';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'AWAITING_APPROVAL'
  | 'PURCHASED'
  | 'DELIVERED'
  | 'DISPUTED'
  | 'COMPLETED'
  | 'SETTLED'
  | 'CANCELLED';

export interface Payout { bank: string; accountMasked: string; holder: string }
export interface User { id: number; email: string; name: string; mode: Mode; test: boolean; avatarUrl?: string | null; payout?: Payout | null }
export interface Person { id: number; name: string; avatarUrl?: string | null }
export interface Country { code: string; name: string; nameKo: string; currency: string; flag: string }
export interface Quote { budget: number; reward: number; fee: number; tax: number; total: number }

export interface AppConfig {
  paymentMode: 'mock' | 'toss';
  tossClientKey: string | null;
  feeRate: number;
  taxThresholdKrw: number;
  taxRate: number;
  maxRewardRate: number;
  countries: Country[];
}

export interface Trip {
  id: number; countryCode: string; city: string | null;
  departDate: string; returnDate: string; luggageNote: string | null;
}

export interface Offer {
  id: number; traveler: Person; trip: Trip; countryCode: string; productName: string;
  store: string | null; category: string | null; description: string | null; imageUrl: string | null;
  estPrice: number; reward: number; quantity: number; status: 'ACTIVE' | 'SOLD_OUT' | 'CLOSED';
  bookable: boolean; unitQuote: Quote;
  /** Price per item in the trip country's currency; estPrice is its won value today. */
  priceCurrency: string | null; priceLocal: number | null;
  receiptUrl: string | null;
  product: Product | null;
  weightGrams: number | null;
}

export interface Product {
  id: number; name: string; nameKo: string | null; nameLocal: string | null; aliases: string | null;
  category: string | null; countryCode: string | null; weightGrams: number | null;
}

export interface ProductInput {
  name: string; nameKo?: string; nameLocal?: string; aliases?: string; category?: string; countryCode?: string;
}

export interface PurchaseRequest {
  id: number; buyer: Person; traveler: Person | null; countryCode: string; productName: string;
  productLink: string | null; imageUrl: string | null; options: string | null; note: string | null;
  maxBudget: number; reward: number; deadline: string;
  status: 'OPEN' | 'MATCHED' | 'EXPIRED' | 'CANCELLED'; quote: Quote; createdAt: string; orderId: number | null;
  product: Product | null; weightGrams: number | null;
  /** The budget as typed in the country's currency, and the won-per-unit rate used. Null for won budgets. */
  budgetCurrency: string | null; budgetLocal: number | null; fxRate: number | null;
}

/** Won per one unit of each currency, e.g. { JPY: 9.21 }. live is false when fixed fallback rates are used. */
export interface FxRates { krwPerUnit: Record<string, number>; live: boolean; updatedAt: string | null }

export interface PaymentRecord {
  id: number; type: 'INITIAL' | 'EXTRA' | 'REFUND'; amount: number;
  status: 'READY' | 'SUCCESS' | 'FAILED'; failReason: string | null; simulated: boolean; createdAt: string;
}

export interface Order {
  /** Prices in the purchase country's currency and the order's locked won rate; null for won-only orders. */
  currency: string | null; fxRate: number | null; limitLocal: number | null; quotedLocal: number | null; actualLocal: number | null;
  id: number; myRole: 'BUYER' | 'TRAVELER'; status: OrderStatus; source: 'OFFER' | 'REQUEST';
  offerId: number | null; requestId: number | null; buyer: Person; traveler: Person;
  productName: string; countryCode: string; imageUrl: string | null; category: string | null; options: string | null;
  productLink: string | null; quantity: number;
  budget: number; reward: number; fee: number; tax: number; initialCharge: number;
  actualPrice: number | null; receiptUrl: string | null;
  quotedPrice: number | null; priceTagUrl: string | null;
  itemLimit: number;
  extraItemAmount: number; extraFee: number; extraCharge: number;
  expectedDelivery: string | null; cancelReason: string | null;
  createdAt: string; paidAt: string | null; purchasedAt: string | null; deliveredAt: string | null;
  completedAt: string | null; settledAt: string | null; cancelledAt: string | null;
  payments: PaymentRecord[];
  settlement: { travelerPayout: number; buyerRefund: number; platformFee: number; mock: boolean } | null;
  unreadMessages: number;
  handoverMethod: 'IN_PERSON' | 'SHIPPING' | null;
  handoverPhotoUrl: string | null;
  autoConfirmAt: string | null;
  dispute: Dispute | null;
}

export interface Dispute {
  reason: string; note: string | null; photoUrl: string | null; byRole: 'BUYER' | 'TRAVELER'; mine: boolean; at: string;
}

export interface ChatMessage {
  id: number; senderId: number; senderName: string; mine: boolean;
  text: string | null; imageUrl: string | null; createdAt: string;
}

export interface Ranking {
  countryCode: string; demoData: boolean; days: number;
  items: {
    rank: number; productName: string; orderCount: number; offerId: number | null; imageUrl: string | null;
    category: string | null; productId: number | null; nameKo: string | null;
    estPrice: number | null; countryCode: string | null; weightGrams: number | null;
    priceCurrency: string | null; priceLocal: number | null;
  }[];
}

export interface PaymentPrepare {
  mode: 'mock' | 'toss'; clientKey: string | null; tossOrderId: string; orderName: string;
  amount: number; type: 'INITIAL' | 'EXTRA'; customerKey: string;
}

export type NotificationKind =
  | 'BOOKED' | 'REQUEST_ACCEPTED' | 'PAID' | 'PURCHASED' | 'OVER_BUDGET'
  | 'DELIVERED' | 'REJECTED' | 'SETTLED' | 'CANCELLED' | 'EXTRA_PAID' | 'MESSAGE'
  | 'REPORTED' | 'RESOLVED' | 'AUTO_CONFIRMED';

export interface Notification {
  id: number; orderId: number | null; kind: NotificationKind | null; actorName: string | null;
  productName: string | null; amount: number | null; message: string; read: boolean; createdAt: string;
}

export interface BoardRow {
  tripId: number; countryCode: string; city: string | null; departDate: string; returnDate: string;
  travelerName: string; offerCount: number;
}

export type ReceiptCategory =
  | 'alcohol' | 'tobacco' | 'supplement' | 'medicine' | 'meat' | 'food' | 'cosmetics' | 'fashion' | 'electronics' | 'other';

export interface ReceiptScan {
  mock: boolean; model: string; store: string | null; date: string | null; currency: string | null;
  total: number | null; totalKrw: number | null; krwPerUnit: number | null;
  items: { name: string | null; price: number | null; quantity: number | null; category: ReceiptCategory }[];
  customsFlags: ReceiptCategory[]; note: string | null;
}

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const TOKEN_KEY = 'carrypick.token';

export const tokenStore = {
  get(): string | null {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token: string | null) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch { }
  },
};

export const http = axios.create({ baseURL: API_BASE });

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && tokenStore.get()) onUnauthorized();
    return Promise.reject(error);
  },
);

export function errorInfo(err: unknown): { code: string | null; message: string | null; network: boolean } {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { code?: string; message?: string } | undefined;
    return { code: data?.code ?? null, message: data?.message ?? null, network: !err.response };
  }
  return { code: null, message: err instanceof Error ? err.message : null, network: false };
}

export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

const get = <T,>(url: string, params?: object) => http.get<T>(url, { params }).then((r) => r.data);
const post = <T,>(url: string, body?: unknown) => http.post<T>(url, body).then((r) => r.data);
const patch = <T,>(url: string, body?: unknown) => http.patch<T>(url, body).then((r) => r.data);
const del = <T,>(url: string) => http.delete<T>(url).then((r) => r.data);

export const api = {
  config: () => get<AppConfig>('/api/config'),

  signup: (b: { email: string; password: string; name: string }) =>
    post<{ token: string; user: User }>('/api/auth/signup', b),
  login: (b: { email: string; password: string }) => post<{ token: string; user: User }>('/api/auth/login', b),
  me: () => get<{ user: User; unreadNotifications: number }>('/api/users/me'),
  updateMe: (b: { name?: string; mode?: Mode; avatarUrl?: string; payoutBank?: string; payoutAccount?: string; payoutHolder?: string }) =>
    patch<User>('/api/users/me', b),

  board: () => get<BoardRow[]>('/api/board'),
  ranking: (country: string) => get<Ranking>(`/api/countries/${country}/ranking`),
  search: (q: string, country?: string) =>
    get<{ offers: Offer[]; requests: PurchaseRequest[] }>('/api/search', { q, country: country || undefined }),

  offers: (country: string) => get<Offer[]>('/api/offers', { country }),
  offer: (id: number) => get<Offer>(`/api/offers/${id}`),
  myOffers: () => get<Offer[]>('/api/offers/mine'),
  createOffer: (b: OfferInput) => post<Offer>('/api/offers', b),
  updateOffer: (id: number, b: OfferInput) => patch<Offer>(`/api/offers/${id}`, b),
  closeOffer: (id: number) => post<Offer>(`/api/offers/${id}/close`),
  deleteOffer: (id: number) => del<void>(`/api/offers/${id}`),

  myTrips: () => get<Trip[]>('/api/trips/me'),
  myTripsWithPast: () => get<Trip[]>('/api/trips/me', { includePast: true }),
  createTrip: (b: Omit<Trip, 'id'>) => post<Trip>('/api/trips', b),
  updateTrip: (id: number, b: Omit<Trip, 'id'>) => http.put<Trip>(`/api/trips/${id}`, b).then((r) => r.data),
  deleteTrip: (id: number) => del<void>(`/api/trips/${id}`),

  createRequest: (b: RequestInput) => post<PurchaseRequest>('/api/requests', b),
  fx: () => get<FxRates>('/api/fx'),
  products: (q: string, country?: string) =>
    get<Product[]>('/api/products', { q, country: country && country !== 'ALL' ? country : undefined }),
  createProduct: (b: ProductInput) => post<Product>('/api/products', b),
  myRequests: () => get<PurchaseRequest[]>('/api/requests/me'),
  openRequests: () => get<PurchaseRequest[]>('/api/requests/open'),
  request: (id: number) => get<PurchaseRequest>(`/api/requests/${id}`),
  acceptRequest: (id: number, tripId?: number) => post<Order>(`/api/requests/${id}/accept`, { tripId }),
  cancelRequest: (id: number) => del<PurchaseRequest>(`/api/requests/${id}`),

  book: (offerId: number, quantity: number) => post<Order>('/api/orders', { offerId, quantity }),
  myOrders: (role: 'buyer' | 'traveler') => get<Order[]>('/api/orders/me', { role }),
  order: (id: number) => get<Order>(`/api/orders/${id}`),
  purchase: (id: number, price: { actualPrice?: number; actualLocal?: number }, receipt: File) => {
    const form = new FormData();
    if (price.actualLocal != null) form.append('actualLocal', String(price.actualLocal));
    else form.append('actualPrice', String(price.actualPrice));
    form.append('receipt', receipt);
    return http.post<Order>(`/api/orders/${id}/purchase`, form).then((r) => r.data);
  },
  priceCheck: (id: number, price: { price?: number; priceLocal?: number }, photo: File) => {
    const form = new FormData();
    if (price.priceLocal != null) form.append('priceLocal', String(price.priceLocal));
    else form.append('price', String(price.price));
    form.append('photo', photo);
    return http.post<Order>(`/api/orders/${id}/price-check`, form).then((r) => r.data);
  },
  messages: (id: number) => get<ChatMessage[]>(`/api/orders/${id}/messages`),
  sendMessage: (id: number, b: { text: string | null; imageUrl: string | null }) =>
    post<ChatMessage>(`/api/orders/${id}/messages`, b),
  approve: (id: number) => post<PaymentPrepare>(`/api/orders/${id}/approve`),
  reject: (id: number, reopenRequest = false) => post<Order>(`/api/orders/${id}/reject`, { reopenRequest }),
  deliver: (id: number, method: 'IN_PERSON' | 'SHIPPING', proof: File) => {
    const form = new FormData();
    form.append('method', method);
    form.append('proof', proof);
    return http.post<Order>(`/api/orders/${id}/deliver`, form).then((r) => r.data);
  },
  report: (id: number, reason: string, note: string, photo: File | null) => {
    const form = new FormData();
    form.append('reason', reason);
    if (note.trim()) form.append('note', note.trim());
    if (photo) form.append('photo', photo);
    return http.post<Order>(`/api/orders/${id}/report`, form).then((r) => r.data);
  },
  resolve: (id: number, action: 'RECEIVED' | 'REFUND' | 'WITHDRAW') => post<Order>(`/api/orders/${id}/resolve`, { action }),
  confirmReceived: (id: number) => post<Order>(`/api/orders/${id}/confirm`),
  cancelOrder: (id: number, reason?: string) => post<Order>(`/api/orders/${id}/cancel`, { reason }),

  preparePayment: (orderId: number) => post<PaymentPrepare>('/api/payments/prepare', { orderId }),
  confirmPayment: (b: { paymentKey: string; tossOrderId: string; amount: number }) =>
    post<Order>('/api/payments/confirm', b),
  failPayment: (b: { tossOrderId: string; code?: string; message?: string }) => post<Order>('/api/payments/fail', b),

  notifications: () => get<Notification[]>('/api/notifications'),
  readAllNotifications: () => post<void>('/api/notifications/read-all'),

  scanReceipt: (image: File) => {
    const form = new FormData();
    form.append('image', image);
    return http.post<ReceiptScan>('/api/receipts/scan', form).then((r) => r.data);
  },

  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.post<{ url: string }>('/api/files', form).then((r) => r.data);
  },
};

export interface OfferInput {
  tripId: number; productName: string; store?: string; category?: string; description?: string;
  imageUrl?: string | null; estPrice?: number; reward: number; quantity: number;
  priceLocal?: number; priceCurrency?: string;
  receiptUrl?: string | null;
  productId?: number | null;
  weightGrams?: number | null;
}

export interface RequestInput {
  countryCode: string; productName: string; productLink?: string; imageUrl?: string | null;
  options?: string; note?: string; maxBudget?: number; reward: number; deadline: string;
  budgetLocal?: number; budgetCurrency?: string;
  productId?: number | null;
  weightGrams?: number | null;
}
