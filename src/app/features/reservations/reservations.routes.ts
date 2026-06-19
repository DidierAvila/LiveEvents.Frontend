import { Routes } from '@angular/router';

import { ReservationFormPageComponent } from './components/reservation-form-page.component';
import { ReservationsListPageComponent } from './components/reservations-list-page.component';

export const RESERVATIONS_ROUTES: Routes = [
  {
    path: '',
    component: ReservationsListPageComponent,
  },
  {
    path: 'new',
    component: ReservationFormPageComponent,
  },
];
