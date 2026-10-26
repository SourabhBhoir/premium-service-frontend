import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PremiumApi } from '../../core/services/premium-api';

@Component({
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receipts.html',
  styleUrl: './receipts.scss'
})
export class Receipts {
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private readonly premiumApi: PremiumApi
  ) {}

  paymentId = 1;

  receiptDetails: Record<string, any> | null = null;

  loading = false;
  generating = false;
  regenerating = false;
  downloading = false;

  errorMessage = '';
  successMessage = '';

  loadReceipt(): void {
    const id = Number(this.paymentId);

    if (!Number.isInteger(id) || id < 1) {
      this.receiptDetails = null;
      this.errorMessage = 'Please enter a valid Payment ID.';
      this.successMessage = '';
      this.cdr.markForCheck();
      return;
    }

    this.paymentId = id;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .getReceipt(id)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (receipt) => {
          this.receiptDetails = receipt ?? null;

          if (!receipt) {
            this.errorMessage = 'No receipt data was returned by the server.';
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Load receipt error:', error);

          this.receiptDetails = null;
          this.errorMessage =
            error?.error?.message ||
            `Unable to load receipt. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  generateReceipt(): void {
    const id = Number(this.paymentId);

    if (!Number.isInteger(id) || id < 1) {
      this.errorMessage = 'Please enter a valid Payment ID.';
      this.cdr.markForCheck();
      return;
    }

    this.generating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .generateReceipt(id)
      .pipe(
        finalize(() => {
          this.generating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (receipt) => {
          this.receiptDetails = receipt ?? null;
          this.successMessage = 'Receipt generation request completed.';
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Generate receipt error:', error);

          this.errorMessage =
            error?.error?.message ||
            `Receipt generation failed. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  regenerateReceipt(): void {
    const id = Number(this.paymentId);

    if (!Number.isInteger(id) || id < 1) {
      this.errorMessage = 'Please enter a valid Payment ID.';
      this.cdr.markForCheck();
      return;
    }

    if (!confirm(`Regenerate the receipt for Payment #${id}?`)) {
      return;
    }

    this.regenerating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .regenerateReceipt(id)
      .pipe(
        finalize(() => {
          this.regenerating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (receipt) => {
          this.receiptDetails = receipt ?? null;
          this.successMessage = 'Receipt regeneration request completed.';
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Regenerate receipt error:', error);

          this.errorMessage =
            error?.error?.message ||
            `Receipt regeneration failed. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  downloadReceiptPdf(): void {
    const id = Number(this.paymentId);

    if (!Number.isInteger(id) || id < 1) {
      this.errorMessage = 'Please enter a valid Payment ID.';
      this.cdr.markForCheck();
      return;
    }

    this.downloading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .downloadReceiptPdf(id)
      .pipe(
        finalize(() => {
          this.downloading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.errorMessage = 'The server returned an empty PDF.';
            this.cdr.markForCheck();
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');

          link.href = url;
          link.download = `payment-receipt-${id}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(url);

          this.successMessage = 'Receipt PDF download started.';
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Download receipt PDF error:', error);

          this.errorMessage =
            error?.error?.message ||
            `PDF download failed. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }
}