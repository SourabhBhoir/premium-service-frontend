import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PremiumApi } from '../../core/services/premium-api';

@Component({
  selector: 'app-refunds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './refunds.html',
  styleUrl: './refunds.scss'
})
export class Refunds {
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private readonly premiumApi: PremiumApi
  ) {}

  refundId = 1;

  refundDetails: Record<string, any> | null = null;

  loading = false;
  approving = false;

  errorMessage = '';
  successMessage = '';

  loadRefund(): void {
    const id = Number(this.refundId);

    if (!Number.isInteger(id) || id < 1) {
      this.refundDetails = null;
      this.errorMessage = 'Please enter a valid Refund ID.';
      this.successMessage = '';
      this.cdr.markForCheck();
      return;
    }

    this.refundId = id;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.refundDetails = null;

    this.cdr.markForCheck();

    this.premiumApi
      .getRefund(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (refund) => {
          if (!refund || typeof refund !== 'object') {
            this.refundDetails = null;
            this.errorMessage =
              'The server returned an empty or invalid refund response.';
          } else {
            this.refundDetails = refund;
          }

          this.cdr.markForCheck();
        },

        error: (error) => {
          console.error('Load refund error:', error);

          this.refundDetails = null;

          if (error?.status === 404) {
            this.errorMessage =
              `Refund #${id} was not found. Check the Refund ID.`;
          } else if (error?.status === 500) {
            this.errorMessage =
              'The Premium Service encountered a server error while loading this refund. Check the backend logs.';
          } else if (error?.status === 0) {
            this.errorMessage =
              'Cannot connect to the Premium Service. Check the backend server and proxy configuration.';
          } else {
            this.errorMessage =
              error?.error?.message ||
              `Unable to load refund. HTTP ${error?.status || 'unknown'}.`;
          }

          this.cdr.markForCheck();
        }
      });
  }

  approveRefund(): void {
    if (!this.refundDetails || this.approving || this.loading) {
      this.errorMessage = 'Load a valid refund before approving it.';
      this.cdr.markForCheck();
      return;
    }

    const id = Number(
      this.refundDetails['refundId'] ?? this.refundId
    );

    if (!Number.isInteger(id) || id < 1) {
      this.errorMessage = 'Invalid Refund ID.';
      this.cdr.markForCheck();
      return;
    }

    const status = this.getRefundStatus().toUpperCase();

    if (
      ['APPROVED', 'COMPLETED', 'SUCCESS', 'PROCESSED'].includes(status)
    ) {
      this.errorMessage =
        'This refund already appears to be approved or processed.';
      this.cdr.markForCheck();
      return;
    }

    if (!confirm(`Are you sure you want to approve refund #${id}?`)) {
      return;
    }

    this.approving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.markForCheck();

    this.premiumApi
      .approveRefund(id)
      .pipe(
        finalize(() => {
          this.approving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (refund) => {
          if (refund && typeof refund === 'object') {
            this.refundDetails = refund;
          }

          const updatedStatus = this.getRefundStatus().toUpperCase();

          if (
            ['APPROVED', 'COMPLETED', 'SUCCESS', 'PROCESSED'].includes(
              updatedStatus
            )
          ) {
            this.successMessage =
              `Refund #${id} was approved. Backend status: ${updatedStatus}.`;
          } else {
            this.successMessage =
              'The approval request returned a response. Check the displayed backend status to confirm the result.';
          }

          this.cdr.markForCheck();
        },

        error: (error) => {
          console.error('Approve refund error:', error);

          this.errorMessage =
            error?.error?.message ||
            `Refund approval failed. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  getRefundStatus(): string {
    return String(
      this.refundDetails?.['refundStatus'] ??
      this.refundDetails?.['status'] ??
      'UNKNOWN'
    );
  }

  statusClass(): string {
    switch (this.getRefundStatus().toUpperCase()) {
      case 'APPROVED':
      case 'COMPLETED':
      case 'SUCCESS':
      case 'PROCESSED':
        return 'status-success';

      case 'REJECTED':
      case 'FAILED':
        return 'status-failed';

      case 'PENDING':
      case 'REQUESTED':
      case 'INITIATED':
        return 'status-pending';

      default:
        return 'status-neutral';
    }
  }
}