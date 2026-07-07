// Shared types for API responses and frontend components

export interface SaleOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  amount_total: number;
  amount_untaxed: number;
  state: string;
  date_order: string;
  client_order_ref: string | false;
  invoice_status: string;
}

export interface Invoice {
  id: number;
  name: string;
  partner_id: [number, string];
  amount_total: number;
  amount_untaxed: number;
  state: string;
  invoice_date: string;
  payment_state: string;
  invoice_origin: string;
}

export interface MonthlyData {
  month: string;
  b2cOrders: number;
  b2cRevenue: number;
  b2bOrders: number;
  b2bRevenue: number;
}

export interface PartnerRevenue {
  name: string;
  orders: number;
  revenue: number;
  share: number;
}

export interface SalesApiResponse {
  b2c: {
    orders: number;
    revenue: number;
    avgOrder: number;
    drafts: number;
  };
  b2b: {
    orders: number;
    revenue: number;
    avgOrder: number;
    drafts: number;
  };
  total: {
    orders: number;
    revenue: number;
  };
  monthly: MonthlyData[];
  topB2cChannels: PartnerRevenue[];
  topB2bCustomers: PartnerRevenue[];
}

export interface InvoicesApiResponse {
  total: number;
  totalAmount: number;
  paid: number;
  paidAmount: number;
  partial: number;
  partialAmount: number;
  notPaid: number;
  notPaidAmount: number;
  inPayment: number;
  inPaymentAmount: number;
  outstanding: number;
  collectionRate: number;
}

export interface DashboardData {
  sales: SalesApiResponse;
  invoices: InvoicesApiResponse;
  generatedAt: string;
}
