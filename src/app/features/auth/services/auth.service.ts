import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  AUTH_API_BASE_URL,
  AUTH_TOKEN_STORAGE_KEY,
} from '../../../core/config/api.config';
import {
  AccountProfile,
  ApiResponse,
  AuthRoleDetail,
  AuthRolesListResult,
  AuthUserDetail,
  AuthUsersListResult,
  JwtTokenPayload,
  LoginRequest,
  RolePermission,
  UpdateAuthRoleRequest,
  UpdateAuthUserRequest,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${AUTH_API_BASE_URL}/Api`;

  hasToken(): boolean {
    return !!this.getToken();
  }

  getToken(): string {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '';
  }

  saveToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token.trim());
  }

  clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }

  decodeToken(token: string): JwtTokenPayload | null {
    try {
      const [, payload] = token.split('.');

      if (!payload) {
        return null;
      }

      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        '=',
      );
      const decodedPayload = atob(paddedPayload);

      return JSON.parse(decodedPayload) as JwtTokenPayload;
    } catch {
      return null;
    }
  }

  login(payload: LoginRequest): Observable<string> {
    return this.http.post(`${this.baseUrl}/Auth/Login`, payload, {
      responseType: 'text',
    });
  }

  getCurrentAccount(): Observable<AccountProfile> {
    return this.http
      .get<ApiResponse<AccountProfile>>(`${this.baseUrl}/Account/me`)
      .pipe(map((response) => response.data));
  }

  getRolePermissions(roleId: string): Observable<RolePermission[]> {
    return this.http.get<RolePermission[]>(
      `${this.baseUrl}/Roles/${roleId}/permissions`,
    );
  }

  getUsers(page = 1, pageSize = 10): Observable<AuthUsersListResult> {
    const params = new HttpParams()
      .set('Page', String(page))
      .set('PageSize', String(pageSize));

    return this.http.get<AuthUsersListResult>(`${this.baseUrl}/Users`, { params });
  }

  getUserById(id: string): Observable<AuthUserDetail> {
    return this.http.get<AuthUserDetail>(`${this.baseUrl}/Users/${id}`);
  }

  updateUser(id: string, payload: UpdateAuthUserRequest): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/Users/${id}`, payload);
  }

  deleteUser(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/Users/${id}`);
  }

  getRoles(page = 1, pageSize = 10): Observable<AuthRolesListResult> {
    const params = new HttpParams()
      .set('Page', String(page))
      .set('PageSize', String(pageSize));

    return this.http.get<AuthRolesListResult>(`${this.baseUrl}/Roles`, { params });
  }

  getRoleById(id: string): Observable<AuthRoleDetail> {
    return this.http.get<AuthRoleDetail>(`${this.baseUrl}/Roles/${id}`);
  }

  updateRole(id: string, payload: UpdateAuthRoleRequest): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/Roles/${id}`, payload);
  }

  deleteRole(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/Roles/${id}`);
  }

  getPermissions(params?: Record<string, string | number | boolean>): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/Permissions`, { params });
  }

  updateCurrentAccount(payload: unknown): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/Account/me/update`, payload);
  }
}
