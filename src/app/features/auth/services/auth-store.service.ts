import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  EMPTY,
  Observable,
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';

import {
  AccountProfile,
  JwtTokenPayload,
  MenuItem,
  RolePermission,
} from '../models/auth.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStoreService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly tokenState = signal(this.authService.getToken());
  private readonly profileState = signal<AccountProfile | null>(null);
  private readonly rolePermissionsState = signal<RolePermission[]>([]);
  private readonly initializedState = signal(false);
  private readonly authenticatingState = signal(false);
  private readonly loadingProfileState = signal(false);

  readonly profile = computed(() => this.profileState());
  readonly rolePermissions = computed(() => this.rolePermissionsState());
  readonly isInitialized = computed(() => this.initializedState());
  readonly isAuthenticating = computed(() => this.authenticatingState());
  readonly isLoadingProfile = computed(() => this.loadingProfileState());
  readonly token = computed(() => this.tokenState());
  readonly tokenPayload = computed<JwtTokenPayload | null>(() => {
    const token = this.token();

    if (!token) {
      return null;
    }

    return this.authService.decodeToken(token);
  });
  readonly isAuthenticated = computed(() => {
    const payload = this.tokenPayload();

    if (!payload?.userId || !payload.exp) {
      return false;
    }

    const currentUnixTime = Math.floor(Date.now() / 1000);
    return payload.exp > currentUnixTime;
  });
  readonly user = computed(() => {
    const payload = this.tokenPayload();

    if (!payload) {
      return this.profileState()?.user ?? null;
    }

    return {
      id: payload.userId,
      name: payload.userName,
      email: payload.userEmail,
      avatar: this.profileState()?.user.avatar ?? null,
    };
  });
  readonly roles = computed(() => this.profileState()?.roles ?? []);
  readonly permissionNames = computed(() => {
    const tokenPermissions = this.tokenPayload()?.permission ?? [];
    const sourcePermissions =
      tokenPermissions.length > 0
        ? tokenPermissions
        : this.rolePermissionsState().map((item) => item.permissionName ?? '');

    return Array.from(
      new Set(
        sourcePermissions
          .map((item) => item.trim().toLowerCase())
          .filter((item): item is string => !!item),
      ),
    );
  });
  readonly userTypeName = computed(() => this.tokenPayload()?.userTypeName ?? '');

  readonly menuItems = computed<MenuItem[]>(() => {
    const items: Array<MenuItem & { allowed: boolean }> = [
      {
        label: 'Eventos',
        route: '/events',
        description: 'Gestion de eventos y programacion',
        icon: 'Eventos',
        allowed: this.isAuthenticated(),
      },
      {
        label: 'Reservas',
        route: '/reservations',
        description: 'Operaciones de reservas y seguimiento',
        icon: 'Reservas',
        allowed: this.isAuthenticated(),
      },
      {
        label: 'Lugares',
        route: '/venues',
        description: 'Referencia funcional de venues segun el contrato',
        icon: 'Lugares',
        allowed: this.isAuthenticated(),
      },
      {
        label: 'Usuarios',
        route: '/auth/users',
        description: 'Administracion de usuarios',
        icon: 'Usuarios',
        allowed: this.canAccessArea('users'),
      },
      {
        label: 'Roles',
        route: '/auth/roles',
        description: 'Consulta y gestion de roles',
        icon: 'Roles',
        allowed: this.canAccessArea('roles'),
      },
      {
        label: 'Permisos',
        route: '/auth/permissions',
        description: 'Consulta y gestion de permisos',
        icon: 'Permisos',
        allowed: this.canAccessArea('permissions'),
      },
    ];

    return items.filter((item) => item.allowed);
  });

  initialize(): void {
    if (this.initializedState()) {
      return;
    }

    this.initializedState.set(true);

    if (!this.token()) {
      return;
    }

    this.refreshSession().subscribe();
  }

  login(email: string, password: string): Observable<void> {
    this.authenticatingState.set(true);

    return this.authService.login({ email, password }).pipe(
      tap((token) => {
        this.authService.saveToken(token);
        this.tokenState.set(token.trim());
      }),
      switchMap(() => this.refreshSession()),
      tap(() => {
        const landingPage =
          this.profileState()?.portalConfiguration?.defaultLandingPage ||
          this.menuItems()[0]?.route ||
          '/auth/me';
        void this.router.navigateByUrl(landingPage);
      }),
      finalize(() => this.authenticatingState.set(false)),
    );
  }

  refreshSession(): Observable<void> {
    if (!this.token()) {
      this.profileState.set(null);
      this.rolePermissionsState.set([]);
      return of(void 0);
    }

    this.loadingProfileState.set(true);

    return this.authService.getCurrentAccount().pipe(
      switchMap((profile) => {
        this.profileState.set(profile);

        if (this.tokenPayload()?.permission?.length || profile.roles.length === 0) {
          this.rolePermissionsState.set([]);
          return of(void 0);
        }

        return forkJoin(
          profile.roles.map((role) =>
            this.authService.getRolePermissions(role.id).pipe(
              catchError(() => of([])),
            ),
          ),
        ).pipe(
          map((responses) => responses.flat()),
          tap((permissions) => this.rolePermissionsState.set(permissions)),
          map(() => void 0),
        );
      }),
      catchError((error: unknown) => {
        if (this.isUnauthorizedError(error)) {
          this.logout(true);
          return EMPTY;
        }

        return of(void 0);
      }),
      finalize(() => this.loadingProfileState.set(false)),
    );
  }

  logout(redirect = true): void {
    this.authService.clearToken();
    this.tokenState.set('');
    this.profileState.set(null);
    this.rolePermissionsState.set([]);
    this.authenticatingState.set(false);
    this.loadingProfileState.set(false);

    if (redirect) {
      void this.router.navigateByUrl('/auth/login');
    }
  }

  private canAccessArea(area: 'users' | 'roles' | 'permissions'): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }

    const adminRole = this.roles().some((role) =>
      role.name.toLowerCase().includes('admin'),
    );
    const adminType = this.userTypeName().toLowerCase().includes('admin');

    if (adminRole || adminType) {
      return true;
    }

    const permissions = this.permissionNames();

    if (area === 'users') {
      return this.matchesAny(permissions, ['users.', 'user.', 'usuario']);
    }

    if (area === 'roles') {
      return this.matchesAny(permissions, ['roles.', 'role.', 'rol']);
    }

    return this.matchesAny(permissions, ['permissions.', 'permission.', 'permiso']);
  }

  private matchesAny(values: string[], fragments: string[]): boolean {
    return values.some((value) =>
      fragments.some((fragment) => value.includes(fragment)),
    );
  }

  private isUnauthorizedError(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      (error.status === 401 || error.status === 403)
    );
  }
}
