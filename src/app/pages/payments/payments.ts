import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  PremiumApi,
  PremiumPayment,
  PremiumPaymentRequest,
  PaymentMode,
  PaymentVerificationRequest
} from '../../core/services/premium-api';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.html',
  styleUrl: './payments.scss'
})
export class Payments {
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private readonly premiumApi: PremiumApi
  ) {}

  policyId = 1;
  paymentId = 1;

  payments: PremiumPayment[] = [];
  paymentDetails: PremiumPayment | null = null;

  loading = false;
  submitting = false;
  verifying = false;

  errorMessage = '';
  successMessage = '';

  showPaymentForm = false;
  showVerificationForm = false;

  paymentModes: PaymentMode[] = [
    'UPI',
    'CARD',
    'NET_BANKING'
  ];

  paymentForm: PremiumPaymentRequest = {
    policyId: 1,
    scheduleId: 1,
    amountPaid: 1000,
    paymentMode: 'UPI'
  };

  verificationForm: PaymentVerificationRequest = {
    gatewayOrderId: '',
    gatewayPaymentId: '',
    gatewaySignature: ''
  };

  loadHistory(): void {
    const id = Number(this.policyId);

    if (!Number.isInteger(id) || id < 1) {
      this.errorMessage = 'Please enter a valid Policy ID.';
      this.payments = [];
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.policyId = id;
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .getPaymentHistory(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.payments = response ?? [];
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Payment history error:', error);

          this.payments = [];
          this.errorMessage =
            error?.error?.message ||
            `Unable to load payment history. HTTP ${error.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  initiatePayment(): void {
    const request: PremiumPaymentRequest = {
      ...this.paymentForm,
      policyId: Number(this.paymentForm.policyId),
      scheduleId: Number(this.paymentForm.scheduleId),
      amountPaid: Number(this.paymentForm.amountPaid)
    };

    if (
      !Number.isInteger(request.policyId) ||
      request.policyId < 1 ||
      !Number.isInteger(request.scheduleId) ||
      request.scheduleId < 1 ||
      !Number.isFinite(request.amountPaid) ||
      request.amountPaid <= 0
    ) {
      this.errorMessage =
        'Enter valid policy ID, schedule ID and amount values.';
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .initiatePayment(request)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (payment) => {
          this.paymentDetails = payment;
          this.paymentId = payment.paymentId;
          this.policyId = request.policyId;
          this.showPaymentForm = false;

          this.successMessage =
            'Payment request received. Check the backend payment status and complete gateway verification if required.';

          this.cdr.markForCheck();
          this.loadHistory();
        },
        error: (error) => {
          console.error('Initiate payment error:', error);

          this.errorMessage =
            error?.error?.message ||
            `Payment initiation failed. HTTP ${error.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  loadPayment(): void {
    const id = Number(this.paymentId);

    if (!Number.isInteger(id) || id < 1) {
      this.errorMessage = 'Enter a valid payment ID.';
      this.cdr.markForCheck();
      return;
    }

    this.paymentId = id;
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .getPayment(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (payment) => {
          this.paymentDetails = payment;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Payment details error:', error);

          this.paymentDetails = null;
          this.errorMessage =
            error?.error?.message ||
            `Unable to retrieve payment. HTTP ${error.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  verifyPayment(): void {
    const request: PaymentVerificationRequest = {
      gatewayOrderId: this.verificationForm.gatewayOrderId.trim(),
      gatewayPaymentId: this.verificationForm.gatewayPaymentId.trim(),
      gatewaySignature: this.verificationForm.gatewaySignature.trim()
    };

    if (
      !request.gatewayOrderId ||
      !request.gatewayPaymentId ||
      !request.gatewaySignature
    ) {
      this.errorMessage =
        'All three gateway verification fields are required.';
      this.cdr.markForCheck();
      return;
    }

    this.verifying = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .verifyPayment(request)
      .pipe(
        finalize(() => {
          this.verifying = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (payment) => {
          this.paymentDetails = payment;
          this.paymentId = payment.paymentId;
          this.showVerificationForm = false;

          this.successMessage =
            `Verification request completed. Backend status: ${payment.paymentStatus || 'Check payment details'}.`;

          this.cdr.markForCheck();
          this.loadHistory();
        },
        error: (error) => {
          console.error('Payment verification error:', error);

          this.errorMessage =
            error?.error?.message ||
            `Payment verification failed. HTTP ${error.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  countPayments(status: string): number {
    const successfulStatuses = [
      'SUCCESS',
      'SUCCESSFUL',
      'COMPLETED',
      'PAID',
      'VERIFIED'
    ];

    return this.payments.filter((payment) => {
      const currentStatus = payment.paymentStatus?.toUpperCase();

      if (status === 'SUCCESS') {
        return successfulStatuses.includes(currentStatus ?? '');
      }

      return currentStatus === status;
    }).length;
  }

  statusClass(status?: string): string {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'SUCCESSFUL':
      case 'COMPLETED':
      case 'PAID':
      case 'VERIFIED':
        return 'status-success';

      case 'FAILED':
      case 'REJECTED':
        return 'status-failed';

      case 'PENDING':
      case 'INITIATED':
        return 'status-pending';

      default:
        return 'status-neutral';
    }
  }
}
