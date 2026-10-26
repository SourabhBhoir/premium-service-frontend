import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { PremiumApi } from '../../core/services/premium-api';

interface NotificationRecord {
  notificationId?: number;
  recipient?: string;
  subject?: string;
  message?: string;
  notificationType?: string;
  status?: string;
  notificationStatus?: string;
  createdAt?: string;
  sentAt?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications {
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private readonly premiumApi: PremiumApi
  ) {}

  notificationId = 1;
  recipient = '';

  readonly notificationTypes = [
    'PREMIUM_DUE_REMINDER',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'RECEIPT_GENERATED'
  ];

  notifications: NotificationRecord[] = [];
  notificationDetails: NotificationRecord | null = null;
  pendingNotifications: NotificationRecord[] = [];

  loadingHistory = false;
  loadingDetails = false;
  loadingPending = false;
  submitting = false;

  errorMessage = '';
  successMessage = '';

  notificationForm = {
    recipient: '',
    subject: '',
    message: '',
    notificationType: 'PREMIUM_DUE_REMINDER'
  };

  loadHistory(): void {
    const email = this.recipient.trim();

    if (!email) {
      this.errorMessage = 'Enter a recipient email to search notification history.';
      this.successMessage = '';
      this.cdr.markForCheck();
      return;
    }

    this.loadingHistory = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .getNotificationHistory(email)
      .pipe(
        finalize(() => {
          this.loadingHistory = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.notifications = Array.isArray(response)
            ? response as NotificationRecord[]
            : [];

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Notification history error:', error);

          this.notifications = [];
          this.errorMessage =
            error?.error?.message ||
            `Unable to load notification history. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  loadNotification(): void {
    const id = Number(this.notificationId);

    if (!Number.isInteger(id) || id < 1) {
      this.errorMessage = 'Enter a valid Notification ID.';
      this.successMessage = '';
      this.cdr.markForCheck();
      return;
    }

    this.notificationId = id;
    this.loadingDetails = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .getNotification(id)
      .pipe(
        finalize(() => {
          this.loadingDetails = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.notificationDetails =
            response && typeof response === 'object'
              ? response as NotificationRecord
              : null;

          if (!this.notificationDetails) {
            this.errorMessage =
              'The server returned no notification details.';
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Notification details error:', error);

          this.notificationDetails = null;
          this.errorMessage =
            error?.error?.message ||
            `Unable to load notification. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  loadPending(): void {
    this.loadingPending = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .getPendingNotifications()
      .pipe(
        finalize(() => {
          this.loadingPending = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.pendingNotifications = Array.isArray(response)
            ? response as NotificationRecord[]
            : [];

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Pending notifications error:', error);

          this.pendingNotifications = [];
          this.errorMessage =
            error?.error?.message ||
            `Unable to load pending notifications. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  createNotification(): void {
    const request = {
      recipient: this.notificationForm.recipient.trim(),
      subject: this.notificationForm.subject.trim(),
      message: this.notificationForm.message.trim(),
      notificationType: this.notificationForm.notificationType
    };

    if (
      !request.recipient ||
      !request.subject ||
      !request.message ||
      !request.notificationType
    ) {
      this.errorMessage =
        'Recipient, subject, message and notification type are required.';
      this.successMessage = '';
      this.cdr.markForCheck();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.recipient)) {
      this.errorMessage = 'Enter a valid recipient email address.';
      this.cdr.markForCheck();
      return;
    }

    if (request.subject.length > 255) {
      this.errorMessage = 'Subject must not exceed 255 characters.';
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();

    this.premiumApi
      .createNotification(request)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.notificationDetails =
            response && typeof response === 'object'
              ? response as NotificationRecord
              : null;

          this.successMessage =
            'Notification request completed. Check the returned backend status.';

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Create notification error:', error);

          this.errorMessage =
            error?.error?.message ||
            `Unable to create notification. HTTP ${error?.status || 'unknown'}.`;

          this.cdr.markForCheck();
        }
      });
  }

  getNotificationStatus(item: NotificationRecord | null): string {
    if (!item) {
      return 'UNKNOWN';
    }

    return String(
      item.status ??
      item.notificationStatus ??
      'UNKNOWN'
    );
  }

  statusClass(item: NotificationRecord | null): string {
    switch (this.getNotificationStatus(item).toUpperCase()) {
      case 'SENT':
      case 'DELIVERED':
      case 'SUCCESS':
        return 'status-success';

      case 'FAILED':
      case 'REJECTED':
        return 'status-failed';

      case 'PENDING':
      case 'QUEUED':
      case 'INITIATED':
        return 'status-pending';

      default:
        return 'status-neutral';
    }
  }
}