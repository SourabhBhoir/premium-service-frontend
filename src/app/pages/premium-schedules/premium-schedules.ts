import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  PremiumApi,
  PremiumSchedule,
  PremiumScheduleRequest
} from '../../core/services/premium-api';

@Component({
  selector: 'app-premium-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './premium-schedules.html',
  styleUrl: './premium-schedules.scss'
})
export class PremiumSchedules {

  policyId = 1;

  schedules: PremiumSchedule[] = [];

  loading = false;
  creating = false;

  errorMessage = '';
  successMessage = '';

  showCreateForm = false;

  form: PremiumScheduleRequest = {
    policyId: 1,
    totalInstallments: 12,
    premiumAmount: 1000,
    paymentFrequency: 'MONTHLY',
    firstDueDate: ''
  };

constructor(
  private readonly premiumApi: PremiumApi,
  private readonly cdr: ChangeDetectorRef
) {}

  // Load schedules for a policy
 loadSchedules(): void {
  if (!this.policyId || this.policyId < 1) {
    this.errorMessage = 'Please enter a valid policy ID.';
    this.cdr.markForCheck();
    return;
  }

  this.loading = true;
  this.errorMessage = '';
  this.successMessage = '';
  this.schedules = [];

  this.cdr.markForCheck();

  this.premiumApi.getSchedules(this.policyId)
    .pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: (data) => {
        console.log('Schedules received:', data);
        console.log('Response is array:', Array.isArray(data));

        this.schedules = Array.isArray(data) ? data : [];

        if (!Array.isArray(data)) {
          this.errorMessage = 'Unexpected API response format.';
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Schedule API error:', error);

        this.errorMessage =
          error.error?.message ||
          `Unable to load schedules. HTTP ${error.status}`;

        this.cdr.markForCheck();
      }
    });
}

  // Create a premium schedule
  createSchedule(): void {

    if (
      !this.form.policyId ||
      this.form.policyId < 1 ||
      !this.form.totalInstallments ||
      this.form.totalInstallments < 1 ||
      !this.form.premiumAmount ||
      this.form.premiumAmount <= 0
    ) {
      this.errorMessage =
        'Enter valid policy, installment and premium values.';
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: PremiumScheduleRequest = {
      ...this.form,
      firstDueDate: this.form.firstDueDate || undefined
    };

    this.premiumApi
      .createSchedule(request)
      .pipe(
        finalize(() => {
          this.creating = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.policyId = this.form.policyId;
          this.showCreateForm = false;
          this.successMessage =
            'Premium schedule created successfully.';

          // Reload the saved schedules from the backend
          this.loadSchedules();
        },

        error: (error) => {
          console.error('Create schedule API error:', error);

          this.errorMessage =
            error.error?.message ||
            `Schedule creation failed. HTTP status: ${error.status}.`;
        }
      });
  }

  // Update an installment status
  updateStatus(
    schedule: PremiumSchedule,
    status: 'PENDING' | 'PAID' | 'OVERDUE'
  ): void {

    if (schedule.status === status) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.premiumApi
      .updateInstallmentStatus(schedule.scheduleId, status)
      .pipe(
        finalize(() => {
          // The subsequent loadSchedules call manages its own loading state
        })
      )
      .subscribe({
        next: () => {
          this.successMessage =
            `Installment ${schedule.scheduleId} status updated.`;

          this.loadSchedules();
        },

        error: (error) => {
          console.error('Update installment API error:', error);

          this.errorMessage =
            error.error?.message ||
            `Status update failed. HTTP status: ${error.status}.`;
        }
      });
  }

  // Track rows by schedule ID
  trackBySchedule(
    index: number,
    schedule: PremiumSchedule
  ): number {
    return schedule.scheduleId;
  }
}
