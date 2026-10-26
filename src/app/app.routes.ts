
import { Routes } from '@angular/router';

import { MainLayout } from './layout/main-layout/main-layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { PremiumSchedules } from './pages/premium-schedules/premium-schedules';
import { Payments } from './pages/payments/payments';
import { Refunds } from './pages/refunds/refunds';
import { Receipts } from './pages/receipts/receipts';
import { Notifications } from './pages/notifications/notifications';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard },
      { path: 'premium-schedules', component: PremiumSchedules },
      { path: 'payments', component: Payments },
      { path: 'refunds', component: Refunds },
      { path: 'receipts', component: Receipts },
      { path: 'notifications', component: Notifications }
    ]
  },
  { path: '**', redirectTo: '' }
];
