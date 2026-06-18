/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Organizer {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  mpesaPayoutNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  eventCode: string; // e.g. OTK-2026-000123
  organizerId: string;
  name: string;
  flyerUrl: string;
  eventDate: string; // ISO string
  venue: string;
  description: string;
  status: 'draft' | 'active' | 'past' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  categories?: TicketCategory[];
  minPrice?: number;
  maxPrice?: number;
  isSoldOut?: boolean;
}

export interface TicketCategory {
  id: string;
  eventId: string;
  name: string;
  price: number;
  totalQuantity: number;
  remainingQuantity: number;
  createdAt: string;
}

export interface Order {
  id: string;
  eventId: string;
  categoryId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  mpesaCheckoutRequestId?: string;
  reservedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  categoryId: string;
  ticketNumber: string;
  verificationCode?: string;
  qrSignature: string;
  pdfUrl?: string;
  status: 'valid' | 'used' | 'cancelled';
  issuedAt?: string;
  usedAt?: string;
}

export interface LedgerEntry {
  id: string;
  organizerId: string;
  orderId: string;
  eventId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  entryType: 'sale' | 'payout' | 'adjustment';
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  organizerId: string;
  organizerName: string;
  amount: number;
  availableBalanceAtRequest: number;
  paymentMethod: 'mpesa' | 'bank' | 'airtime';
  accountDetails: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  processedAt?: string;
  rejectionReason?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorRole: 'organizer' | 'admin';
  details: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  organizerId: string;
  amount: number;
  status: 'requested' | 'approved' | 'processing' | 'completed' | 'failed';
  mpesaTransactionId?: string;
  requestedAt: string;
  processedAt?: string;
}
