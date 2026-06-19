import { Routes } from '@angular/router';

import { AuthAccountPageComponent } from './components/auth-account-page.component';
import { AuthLoginPageComponent } from './components/auth-login-page.component';
import { AuthResourcePageComponent } from './components/auth-resource-page.component';
import { guestGuard } from './guards/guest.guard';
import { authGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: AuthLoginPageComponent,
  },
  {
    path: 'me',
    canActivate: [authGuard],
    component: AuthAccountPageComponent,
  },
  {
    path: 'users',
    canActivate: [authGuard],
    component: AuthResourcePageComponent,
    data: { resource: 'users' },
  },
  {
    path: 'roles',
    canActivate: [authGuard],
    component: AuthResourcePageComponent,
    data: { resource: 'roles' },
  },
  {
    path: 'permissions',
    canActivate: [authGuard],
    component: AuthResourcePageComponent,
    data: { resource: 'permissions' },
  },
];
