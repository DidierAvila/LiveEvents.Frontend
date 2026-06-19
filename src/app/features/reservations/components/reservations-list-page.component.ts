import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageSectionComponent } from '../../../shared/components/page-section.component';
import {
  ReservationListResult,
  ReservationStatus,
  ReservationSummary,
} from '../models/reservation.model';
import { ReservationsService } from '../services/reservations.service';

@Component({
  selector: 'app-reservations-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageSectionComponent],
  template: `
    <div class="page">
      <app-page-section
        title="Mis reservas"
        description="Consulta las reservas del usuario logueado y ejecuta acciones por cada registro."
      >
        @if (feedbackMessage()) {
          <p class="feedback feedback--success">{{ feedbackMessage() }}</p>
        }

        @if (errorMessage()) {
          <p class="feedback feedback--error">{{ errorMessage() }}</p>
        }

        <div class="toolbar">
          <a routerLink="/reservations/new">Nueva reserva</a>
        </div>

        @if (loading()) {
          <p class="feedback">Cargando reservas...</p>
        } @else if (reservations().length === 0) {
          <p class="feedback">No tienes reservas registradas.</p>
        } @else {
          <div class="table-wrapper">
            <table class="reservations-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Lugar</th>
                  <th>Fecha evento</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Codigo</th>
                  <th>Creada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (reservation of reservations(); track reservation.id) {
                  <tr>
                    <td>
                      <div class="event-cell">
                        <strong>{{ reservation.eventTitle || reservation.eventId }}</strong>
                        <span>{{ reservation.id }}</span>
                      </div>
                    </td>
                    <td>{{ reservation.venueName || 'No disponible' }}</td>
                    <td>{{ reservation.eventStartsAt | date: 'medium' }}</td>
                    <td>{{ reservation.quantity }}</td>
                    <td>
                      <span class="status">
                        {{ getStatusLabel(reservation.status) }}
                      </span>
                    </td>
                    <td>{{ reservation.reservationCode || 'Pendiente' }}</td>
                    <td>{{ reservation.createdAt | date: 'medium' }}</td>
                    <td>
                      <div class="actions">
                        <button
                          type="button"
                          class="action-button"
                          (click)="confirmPayment(reservation.id)"
                          [disabled]="!canConfirmPayment(reservation) || actionLoadingId() === reservation.id"
                        >
                          Confirmar pago
                        </button>
                        <button
                          type="button"
                          class="action-button action-button--danger"
                          (click)="cancelReservation(reservation.id)"
                          [disabled]="!canCancelReservation(reservation) || actionLoadingId() === reservation.id"
                        >
                          Cancelar reserva
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination">
            <p class="pagination__summary">
              Mostrando {{ visibleRangeStart() }}-{{ visibleRangeEnd() }} de
              {{ totalRecords() }} reserva(s) · Pagina {{ currentPage() }} de
              {{ totalPages() }}
            </p>
            <div class="pagination__actions">
              <label class="pagination__size">
                <span>Tamano pagina</span>
                <select
                  [value]="pageSize()"
                  (change)="changePageSize($any($event.target).value)"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </select>
              </label>
              <button
                type="button"
                class="pagination__button pagination__button--secondary"
                (click)="goToPreviousPage()"
                [disabled]="!hasPreviousPage() || loading()"
              >
                Anterior
              </button>
              <button
                type="button"
                class="pagination__button"
                (click)="goToNextPage()"
                [disabled]="!hasNextPage() || loading()"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </app-page-section>
    </div>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 1.5rem;
      }

      .toolbar,
      .pagination,
      .pagination__actions,
      .actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
      }

      button,
      a {
        border: none;
        border-radius: 12px;
        padding: 0.8rem 1rem;
        background: #1d4ed8;
        color: #fff;
        cursor: pointer;
        text-align: center;
      }

      a {
        background: #0f172a;
      }

      select {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0.75rem 0.9rem;
        background: #fff;
      }

      .table-wrapper {
        overflow-x: auto;
        border: 1px solid #dbe4f0;
        border-radius: 16px;
        background: #fff;
      }

      .reservations-table {
        width: 100%;
        min-width: 1100px;
        border-collapse: collapse;
      }

      .reservations-table th,
      .reservations-table td {
        padding: 0.9rem 1rem;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        vertical-align: top;
      }

      .reservations-table th {
        background: #f8fafc;
        font-weight: 600;
      }

      .reservations-table tbody tr:hover {
        background: #f8fbff;
      }

      .event-cell {
        display: grid;
        gap: 0.35rem;
      }

      .event-cell strong,
      .feedback {
        margin: 0;
      }

      .event-cell span {
        color: #64748b;
        font-size: 0.9rem;
      }

      .feedback--error {
        color: #b91c1c;
      }

      .feedback--success {
        color: #15803d;
      }

      .status {
        display: inline-flex;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        background: #dbeafe;
        color: #1e3a8a;
      }

      .action-button {
        padding: 0.65rem 0.85rem;
        white-space: nowrap;
      }

      .action-button--danger {
        background: #b91c1c;
      }

      .pagination {
        justify-content: space-between;
      }

      .pagination__summary {
        margin: 0;
      }

      .pagination__size {
        display: grid;
        gap: 0.35rem;
        min-width: 140px;
      }

      .pagination__button--secondary {
        background: #475569;
      }

      .pagination__button:disabled,
      .pagination__button--secondary:disabled,
      .action-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ReservationsListPageComponent implements OnInit {
  private readonly reservationsService = inject(ReservationsService);

  protected readonly reservations = signal<ReservationSummary[]>([]);
  protected readonly listResult = signal<ReservationListResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly actionLoadingId = signal('');
  protected readonly errorMessage = signal('');
  protected readonly feedbackMessage = signal('');
  protected readonly currentPageSignal = signal(1);
  protected readonly pageSizeSignal = signal(10);

  ngOnInit(): void {
    this.loadReservations();
  }

  protected loadReservations(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.reservationsService
      .getMine(this.currentPageSignal(), this.pageSizeSignal())
      .subscribe({
        next: (result) => {
          this.listResult.set(result);
          this.reservations.set(result.data);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message || 'No fue posible consultar tus reservas.',
          );
          this.loading.set(false);
        },
      });
  }

  protected confirmPayment(reservationId: string): void {
    this.feedbackMessage.set('');
    this.errorMessage.set('');
    this.actionLoadingId.set(reservationId);

    this.reservationsService.confirmPayment(reservationId).subscribe({
      next: () => {
        this.feedbackMessage.set(
          this.reservationsService.toActionResult('confirm', reservationId).message,
        );
        this.actionLoadingId.set('');
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message || 'No fue posible confirmar el pago de la reserva.',
        );
        this.actionLoadingId.set('');
      },
    });
  }

  protected cancelReservation(reservationId: string): void {
    this.feedbackMessage.set('');
    this.errorMessage.set('');
    this.actionLoadingId.set(reservationId);

    this.reservationsService.cancel(reservationId).subscribe({
      next: () => {
        this.feedbackMessage.set(
          this.reservationsService.toActionResult('cancel', reservationId).message,
        );
        this.actionLoadingId.set('');
        this.loadReservations();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message || 'No fue posible cancelar la reserva.',
        );
        this.actionLoadingId.set('');
      },
    });
  }

  protected currentPage(): number {
    return this.listResult()?.currentPage || this.currentPageSignal();
  }

  protected pageSize(): number {
    return this.listResult()?.pageSize || this.pageSizeSignal();
  }

  protected totalPages(): number {
    return this.listResult()?.totalPages || 1;
  }

  protected totalRecords(): number {
    return this.listResult()?.totalRecords || 0;
  }

  protected hasPreviousPage(): boolean {
    return this.listResult()?.hasPreviousPage || false;
  }

  protected hasNextPage(): boolean {
    return this.listResult()?.hasNextPage || false;
  }

  protected visibleRangeStart(): number {
    if (this.totalRecords() === 0) {
      return 0;
    }

    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  protected visibleRangeEnd(): number {
    if (this.totalRecords() === 0) {
      return 0;
    }

    return Math.min(
      this.visibleRangeStart() + this.reservations().length - 1,
      this.totalRecords(),
    );
  }

  protected changePageSize(value: string): void {
    this.pageSizeSignal.set(Number(value) || 10);
    this.currentPageSignal.set(1);
    this.loadReservations();
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.currentPageSignal.set(this.currentPage() - 1);
    this.loadReservations();
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.currentPageSignal.set(this.currentPage() + 1);
    this.loadReservations();
  }

  protected canConfirmPayment(reservation: ReservationSummary): boolean {
    return this.normalizeStatus(reservation.status) === 'PendientePago';
  }

  protected canCancelReservation(reservation: ReservationSummary): boolean {
    const status = this.normalizeStatus(reservation.status);
    return status === 'PendientePago' || status === 'Confirmada';
  }

  protected getStatusLabel(status?: ReservationStatus): string {
    switch (this.normalizeStatus(status)) {
      case 'PendientePago':
        return 'Pendiente pago';
      case 'Confirmada':
        return 'Confirmada';
      case 'Cancelada':
        return 'Cancelada';
      case 'Perdida':
        return 'Perdida';
      default:
        return status || 'No informado';
    }
  }

  private normalizeStatus(status?: ReservationStatus): string {
    switch (status) {
      case 'pendiente_pago':
        return 'PendientePago';
      case 'confirmada':
        return 'Confirmada';
      case 'cancelada':
        return 'Cancelada';
      case 'perdida':
        return 'Perdida';
      default:
        return status || '';
    }
  }
}
