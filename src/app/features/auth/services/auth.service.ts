import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  AUTH_API_BASE_URL,
  AUTH_TOKEN_STORAGE_KEY,
} from '../../../core/config/api.config';
import {
  AccountProfile,
  ApiResponse,
  JwtTokenPayload,
  LoginRequest,
  RolePermission,
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

  getUsers(params?: Record<string, string | number | boolean>): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/Users`, { params });
  }

  getRoles(params?: Record<string, string | number | boolean>): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/Roles`, { params });
  }

  getPermissions(params?: Record<string, string | number | boolean>): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/Permissions`, { params });
  }

  updateCurrentAccount(payload: unknown): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/Account/me/update`, payload);
  }
}
