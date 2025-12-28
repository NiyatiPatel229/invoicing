
import { Timestamp } from 'firebase/firestore';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  currencySymbol: string;
  subTotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  grandTotal: number;
  createdAt: Timestamp | Date;
  userId: string;
  items?: InvoiceItem[];
}

export interface InvoiceCounter {
  lastInvoiceNumber: number;
}

export interface GuestUser {
  uid: string;
  displayName: string;
  isGuest: true;
}
