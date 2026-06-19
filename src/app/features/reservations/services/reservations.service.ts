import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api.config';
import {
  CreateReservationRequest,
  ReservationActionResult,
  ReservationEventOption,
  ReservationListResult,
} from '../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/Reservations`;

  create(payload: CreateReservationRequest): Observable<unknown> {
    return this.http.post(this.baseUrl, payload);
  }

  getMine(page = 1, pageSize = 10): Observable<ReservationListResult> {
    const params = new HttpParams()
      .set('Page', String(page))
      .set('PageSize', String(pageSize));

    return this.http.get<ReservationListResult>(`${this.baseUrl}/mine`, { params });
  }

  getEventsDropdown(): Observable<ReservationEventOption[]> {
    return this.http.get<ReservationEventOption[]>(`${API_BASE_URL}/Events/dropdown`);
  }

  confirmPayment(id: string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/confirm-payment`, {});
  }

  cancel(id: string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${id}/cancel`, {});
  }

  toActionResult(
    action: ReservationActionResult['action'],
    reservationId?: string,
  ): ReservationActionResult {
    const messages: Record<ReservationActionResult['action'], string> = {
      create: 'Reserva creada correctamente.',
      confirm: 'Pago de reserva confirmado correctamente.',
      cancel: 'Reserva cancelada correctamente.',
    };

    return {
      action,
      reservationId,
      message: messages[action],
    };
  }
}
