import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

// ==================== PREMIUM SCHEDULES ====================

export interface PremiumScheduleRequest {
  policyId: number;
  totalInstallments: number;
  premiumAmount: number;
  paymentFrequency:
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'HALF_YEARLY'
    | 'YEARLY';
  firstDueDate?: string;
}

export interface PremiumSchedule {
  scheduleId: number;
  policyId: number;
  installmentNo: number;
  dueDate: string;
  premiumAmount: number;
  paymentFrequency: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  totalInstallments: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== PAYMENTS ====================

export interface PremiumPayment {
  paymentId: number;
  amountPaid: number;
  createdAt?: string;
  paymentDate?: string;
  paymentMode?: string;
  paymentStatus?: string;
  policyId: number;
  scheduleId: number;
  transactionReference?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  updatedAt?: string;
}

export type PaymentMode = 'UPI' | 'CARD' | 'NET_BANKING';

export interface PremiumPaymentRequest {
  policyId: number;
  scheduleId: number;
  amountPaid: number;
  paymentMode: PaymentMode;
}

export interface PaymentVerificationRequest {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

// ==================== PREMIUM API SERVICE ====================

@Injectable({
  providedIn: 'root'
})
export class PremiumApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  // ==================== PREMIUM SCHEDULES ====================

  getSchedules(policyId: number): Observable<PremiumSchedule[]> {
    return this.http.get<PremiumSchedule[]>(
      `${this.baseUrl}/premium-schedules/${policyId}`
    );
  }

  getInstallment(scheduleId: number): Observable<PremiumSchedule> {
    return this.http.get<PremiumSchedule>(
      `${this.baseUrl}/premium-schedules/installments/${scheduleId}`
    );
  }

  createSchedule(
    request: PremiumScheduleRequest
  ): Observable<PremiumSchedule[]> {
    return this.http.post<PremiumSchedule[]>(
      `${this.baseUrl}/premium-schedules`,
      request
    );
  }

  updateInstallmentStatus(
    scheduleId: number,
    status: 'PENDING' | 'PAID' | 'OVERDUE'
  ): Observable<PremiumSchedule> {
    const params = new HttpParams().set('status', status);

    return this.http.put<PremiumSchedule>(
      `${this.baseUrl}/premium-schedules/${scheduleId}`,
      null,
      { params }
    );
  }

  // ==================== PAYMENTS ====================

  initiatePayment(
    request: PremiumPaymentRequest
  ): Observable<PremiumPayment> {
    return this.http.post<PremiumPayment>(
      `${this.baseUrl}/payments`,
      request
    );
  }

  verifyPayment(
    request: PaymentVerificationRequest
  ): Observable<PremiumPayment> {
    return this.http.post<PremiumPayment>(
      `${this.baseUrl}/payments/verify`,
      request
    );
  }

  getPayment(paymentId: number): Observable<PremiumPayment> {
    return this.http.get<PremiumPayment>(
      `${this.baseUrl}/payments/${paymentId}`
    );
  }

  getPaymentHistory(policyId: number): Observable<PremiumPayment[]> {
    return this.http.get<PremiumPayment[]>(
      `${this.baseUrl}/payments/history/${policyId}`
    );
  }

  // ==================== REFUNDS ====================

  getRefund(refundId: number): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/refunds/${refundId}`
    );
  }

  approveRefund(refundId: number): Observable<any> {
    return this.http.put<any>(
      `${this.baseUrl}/refunds/${refundId}/approve`,
      null
    );
  }

    // ==================== RECEIPTS ====================

  generateReceipt(paymentId: number) {
    return this.http.post<any>(
      `${this.baseUrl}/payments/${paymentId}/receipt`,
      null
    );
  }

  getReceipt(paymentId: number) {
    return this.http.get<any>(
      `${this.baseUrl}/payments/${paymentId}/receipt`
    );
  }

  downloadReceiptPdf(paymentId: number) {
    return this.http.get(
      `${this.baseUrl}/payments/${paymentId}/receipt/pdf`,
      { responseType: 'blob' }
    );
  }

  regenerateReceipt(paymentId: number) {
    return this.http.post<any>(
      `${this.baseUrl}/payments/${paymentId}/receipt/regenerate`,
      null
    );
  }

    // ==================== NOTIFICATIONS ====================

  createNotification(request: Record<string, any>) {
    return this.http.post<any>(
      `${this.baseUrl}/notifications`,
      request
    );
  }

  getNotification(notificationId: number) {
    return this.http.get<any>(
      `${this.baseUrl}/notifications/${notificationId}`
    );
  }

  getNotificationHistory(recipient: string) {
    const params = new HttpParams().set('recipient', recipient);

    return this.http.get<any[]>(
      `${this.baseUrl}/notifications/history`,
      { params }
    );
  }

  getPendingNotifications() {
    return this.http.get<any[]>(
      `${this.baseUrl}/notifications/pending`
    );
  }
}
