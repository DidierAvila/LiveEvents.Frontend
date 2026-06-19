import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CreateEventRequest,
  EventFilters,
  EventListResult,
  EventSummary,
  OccupationReport,
  VenueDropdownOption,
} from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/Events`;

  list(filters: EventFilters = {}): Observable<EventListResult> {
    let params = new HttpParams();
    const queryParamMap: Record<string, string> = {
      search: 'Search',
      type: 'Type',
      startsFrom: 'StartsFrom',
      startsTo: 'StartsTo',
      venueId: 'VenueId',
      status: 'Status',
      page: 'Page',
      pageSize: 'PageSize',
      sortBy: 'SortBy',
      sortDescending: 'SortDescending',
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(queryParamMap[key] ?? key, String(value));
      }
    });

    return this.http.get<unknown>(this.baseUrl, { params }).pipe(
      map((response) => this.extractListResult<EventSummary>(response, filters)),
    );
  }

  create(payload: CreateEventRequest): Observable<unknown> {
    return this.http.post(this.baseUrl, payload);
  }

  getVenueDropdown(): Observable<VenueDropdownOption[]> {
    return this.http.get<VenueDropdownOption[]>(`${API_BASE_URL}/Venues/dropdown`);
  }

  getById(id: string): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getOccupationReport(id: string): Observable<OccupationReport | unknown> {
    return this.http
      .get<unknown>(`${this.baseUrl}/${id}/occupation-report`)
      .pipe(map((response) => this.extractOccupationReport(response)));
  }

  private extractListResult<TItem>(
    response: unknown,
    filters: EventFilters,
  ): EventListResult {
    const fallbackPage = Number(filters.page) || 1;
    const fallbackPageSize = Number(filters.pageSize) || 10;

    if (Array.isArray(response)) {
      return {
        items: response as TItem[] as EventSummary[],
        page: fallbackPage,
        pageSize: fallbackPageSize,
        totalCount: response.length,
        totalPages: Math.max(1, Math.ceil(response.length / fallbackPageSize)),
        hasNextPage: response.length >= fallbackPageSize,
        hasPreviousPage: fallbackPage > 1,
      };
    }

    const items = this.extractCollection<TItem>(response) as EventSummary[];
    const totalCount = this.extractNumber(
      response,
      ['totalCount', 'total', 'count', 'totalRecords', 'recordsTotal'],
      items.length,
    );
    const page = this.extractNumber(response, ['page', 'pageNumber', 'currentPage'], fallbackPage);
    const pageSize = this.extractNumber(
      response,
      ['pageSize', 'size', 'pageLength', 'perPage'],
      fallbackPageSize,
    );
    const totalPages = this.extractNumber(
      response,
      ['totalPages', 'pageCount'],
      Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
    );
    const hasNextPage = this.extractBoolean(
      response,
      ['hasNextPage', 'hasNext', 'nextPage'],
      page < totalPages,
    );
    const hasPreviousPage = this.extractBoolean(
      response,
      ['hasPreviousPage', 'hasPrevious', 'previousPage'],
      page > 1,
    );

    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  private extractOccupationReport(response: unknown): OccupationReport {
    return {
      eventId: this.extractString(response, ['eventId', 'id']),
      eventTitle: this.extractString(response, ['eventTitle', 'title']),
      confirmedTickets: this.extractOptionalNumber(response, ['confirmedTickets']),
      availableTickets: this.extractOptionalNumber(response, ['availableTickets']),
      occupancyPercentage: this.extractOptionalNumber(response, [
        'occupancyPercentage',
        'occupationPercentage',
      ]),
      totalRevenue: this.extractOptionalNumber(response, ['totalRevenue']),
      status: this.extractString(response, ['status']),
    };
  }

  private extractCollection<TItem>(response: unknown): TItem[] {
    if (Array.isArray(response)) {
      return response as TItem[];
    }

    if (this.hasArrayProperty(response, 'items')) {
      return response.items as TItem[];
    }

    if (this.hasArrayProperty(response, 'data')) {
      return response.data as TItem[];
    }

    if (
      this.isObject(response) &&
      this.isObject(response['data']) &&
      Array.isArray(response['data']['items'])
    ) {
      return response['data']['items'] as TItem[];
    }

    return [];
  }

  private extractNumber(
    response: unknown,
    keys: string[],
    fallback: number,
  ): number {
    const value = this.extractNestedValue(response, keys);
    const parsedValue =
      typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  private extractOptionalNumber(response: unknown, keys: string[]): number | undefined {
    const value = this.extractNestedValue(response, keys);
    const parsedValue =
      typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  private extractString(response: unknown, keys: string[]): string | undefined {
    const value = this.extractNestedValue(response, keys);

    if (typeof value === 'string') {
      return value;
    }

    return value !== undefined && value !== null ? String(value) : undefined;
  }

  private extractBoolean(
    response: unknown,
    keys: string[],
    fallback: boolean,
  ): boolean {
    const value = this.extractNestedValue(response, keys);

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true;
      }

      if (value.toLowerCase() === 'false') {
        return false;
      }
    }

    return fallback;
  }

  private extractNestedValue(response: unknown, keys: string[]): unknown {
    if (!this.isObject(response)) {
      return undefined;
    }

    for (const key of keys) {
      if (key in response) {
        return response[key];
      }

      const matchedRootKey = this.findKeyIgnoreCase(response, key);

      if (matchedRootKey) {
        return response[matchedRootKey];
      }
    }

    if (this.isObject(response['data'])) {
      for (const key of keys) {
        if (key in response['data']) {
          return response['data'][key];
        }

        const matchedDataKey = this.findKeyIgnoreCase(response['data'], key);

        if (matchedDataKey) {
          return response['data'][matchedDataKey];
        }
      }
    }

    if (this.isObject(response['meta'])) {
      for (const key of keys) {
        if (key in response['meta']) {
          return response['meta'][key];
        }

        const matchedMetaKey = this.findKeyIgnoreCase(response['meta'], key);

        if (matchedMetaKey) {
          return response['meta'][matchedMetaKey];
        }
      }
    }

    return undefined;
  }

  private findKeyIgnoreCase(
    source: Record<string, unknown>,
    expectedKey: string,
  ): string | undefined {
    const normalizedExpectedKey = expectedKey.toLowerCase();

    return Object.keys(source).find(
      (candidateKey) => candidateKey.toLowerCase() === normalizedExpectedKey,
    );
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private hasArrayProperty<TProperty extends string>(
    value: unknown,
    property: TProperty,
  ): value is Record<TProperty, unknown[]> {
    return this.isObject(value) && Array.isArray(value[property]);
  }
}
