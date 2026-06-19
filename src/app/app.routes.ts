import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'events',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/events/events.routes').then((m) => m.EVENTS_ROUTES),
  },
  {
    path: 'reservations',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/reservations/reservations.routes').then(
        (m) => m.RESERVATIONS_ROUTES,
      ),
  },
  {
    path: 'venues',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/venues/venues.routes').then((m) => m.VENUES_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
