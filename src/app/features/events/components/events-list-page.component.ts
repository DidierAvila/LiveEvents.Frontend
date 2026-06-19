import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageSectionComponent } from '../../../shared/components/page-section.component';
import { toLocalDateTimeString } from '../../../shared/utils/date-time.util';
import {
  EventStatus,
  EventListResult,
  EventSummary,
  EventType,
  OccupationReport,
  VenueDropdownOption,
} from '../models/event.model';
import { EventsService } from '../services/events.service';

@Component({
  selector: 'app-events-list-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageSectionComponent],
  template: `
    <div class="page">
      <app-page-section
        title="Consulta de eventos"
        description="Consumo alineado con GET /Api/Events del contrato del microservicio."
      >
        <form class="filters" [formGroup]="filtersForm" (ngSubmit)="applyFilters()">
          <label>
            <span>Busqueda por titulo</span>
            <input
              formControlName="search"
              placeholder="Buscar por titulo de forma parcial"
            />
          </label>

          <label>
            <span>Tipo</span>
            <select formControlName="type">
              <option value="">Todos</option>
              @for (type of eventTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </label>

          <label>
            <span>Lugar</span>
            <select formControlName="venueId">
              <option value="">
                {{ loadingVenues() ? 'Cargando lugares...' : 'Todos' }}
              </option>
              @for (venue of venues(); track venue.id) {
                <option [value]="venue.id">{{ venue.name }}</option>
              }
            </select>
          </label>

          <label>
            <span>Estado</span>
            <select formControlName="status">
              <option value="">Todos</option>
              @for (status of eventStatuses; track status.value) {
                <option [value]="status.value">{{ status.label }}</option>
              }
            </select>
          </label>

          <label>
            <span>Fecha inicio desde</span>
            <input type="datetime-local" formControlName="startsFrom" />
          </label>

          <label>
            <span>Fecha inicio hasta</span>
            <input type="datetime-local" formControlName="startsTo" />
          </label>

          <div class="filters__actions">
            <button type="submit">Filtrar</button>
            <a routerLink="/events/new">Crear evento</a>
          </div>
        </form>
      </app-page-section>

      <app-page-section
        title="Resultados"
        description="La API no documenta el schema de respuesta del listado; el front presenta un resumen util y hace fallback seguro."
      >
        @if (errorMessage()) {
          <p class="feedback feedback--error">{{ errorMessage() }}</p>
        }

        @if (loading()) {
          <p class="feedback">Cargando eventos...</p>
        } @else if (events().length === 0) {
          <p class="feedback">No hay eventos para mostrar.</p>
        } @else {
          <div class="table-wrapper">
            <table class="events-table">
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Tipo</th>
                  <th>Lugar</th>
                  <th>Estado</th>
                  <th>Cupo</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Precio</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (event of events(); track event.id) {
                  <tr>
                    <td>
                      <div class="event-title-cell">
                        <strong>{{ event.title }}</strong>
                        <span>{{ event.description }}</span>
                      </div>
                    </td>
                    <td>{{ getEventTypeLabel(event.type) }}</td>
                    <td>{{ event.venueName || event.venueId }}</td>
                    <td>
                      <span class="status">{{ getEventStatusLabel(event.status) }}</span>
                    </td>
                    <td>{{ event.maxCapacity }}</td>
                    <td>{{ event.startsAt | date: 'medium' }}</td>
                    <td>{{ event.endsAt | date: 'medium' }}</td>
                    <td>
                      {{ event.ticketPrice | currency: 'COP' : 'symbol' : '1.0-0' }}
                    </td>
                    <td>
                      <button
                        type="button"
                        class="action-button"
                        (click)="showOccupationReport(event.id)"
                      >
                        Reporte de ocupacion
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination">
            <p class="pagination__summary">
              Mostrando {{ visibleRangeStart() }}-{{ visibleRangeEnd() }} de
              {{ totalCount() }} registro(s) · Pagina {{ currentPage() }} de
              {{ totalPages() }}
            </p>
            <div class="pagination__actions">
              <label class="pagination__size">
                <span>Tamano pagina</span>
                <select
                  [value]="currentPageSize()"
                  (change)="changePageSize($any($event.target).value)"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
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

    @if (isOccupationModalOpen()) {
      <div class="modal-backdrop" (click)="closeOccupationModal()">
        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="occupation-modal-title"
          (click)="$event.stopPropagation()"
        >
          <header class="modal__header">
            <div>
              <p class="modal__eyebrow">Reporte de ocupacion</p>
              <h3 id="occupation-modal-title">{{ selectedEventTitle() || 'Evento' }}</h3>
            </div>
            <button
              type="button"
              class="modal__close"
              (click)="closeOccupationModal()"
              aria-label="Cerrar"
            >
              X
            </button>
          </header>

          <p class="modal__subtitle">
            EventId: {{ occupationReport()?.eventId || selectedEventId() || 'No disponible' }}
          </p>

          @if (occupationLoading()) {
            <p class="feedback">Consultando reporte...</p>
          }

          @if (occupationError()) {
            <p class="feedback feedback--error">{{ occupationError() }}</p>
          }

          @if (occupationReport()) {
            <div class="report-grid">
              <article class="report-card report-card--full">
                <span>Evento</span>
                <strong>{{ occupationReport()?.eventTitle || selectedEventTitle() }}</strong>
              </article>
              <article class="report-card">
                <span>Vendidas</span>
                <strong>{{ occupationReport()?.confirmedTickets ?? 'No disponible' }}</strong>
              </article>
              <article class="report-card">
                <span>Disponibles</span>
                <strong>{{ occupationReport()?.availableTickets ?? 'No disponible' }}</strong>
              </article>
              <article class="report-card">
                <span>Ocupacion</span>
                <strong>{{ getOccupationPercentageLabel() }}</strong>
              </article>
              <article class="report-card">
                <span>Ingresos</span>
                <strong>{{ getRevenueLabel() }}</strong>
              </article>
              <article class="report-card">
                <span>Estado</span>
                <strong>{{ occupationReport()?.status || 'No disponible' }}</strong>
              </article>
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 1.5rem;
      }

      .filters {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      label {
        display: grid;
        gap: 0.35rem;
      }

      input,
      select,
      button,
      a {
        border-radius: 12px;
      }

      input,
      select {
        border: 1px solid #cbd5e1;
        padding: 0.75rem 0.9rem;
        background: #fff;
      }

      .filters__actions {
        display: flex;
        gap: 0.75rem;
        align-items: end;
      }

      button,
      a {
        border: none;
        padding: 0.8rem 1rem;
        background: #1d4ed8;
        color: #fff;
        cursor: pointer;
        text-align: center;
      }

      a {
        background: #0f172a;
      }

      .table-wrapper {
        overflow-x: auto;
        border: 1px solid #dbe4f0;
        border-radius: 16px;
        background: #fff;
      }

      .events-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 960px;
      }

      .events-table th,
      .events-table td {
        padding: 0.9rem 1rem;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        vertical-align: top;
      }

      .events-table th {
        background: #f8fafc;
        font-weight: 600;
      }

      .events-table tbody tr:hover {
        background: #f8fbff;
      }

      .event-title-cell {
        display: grid;
        gap: 0.35rem;
      }

      .event-title-cell strong,
      .event-title-cell span,
      .feedback,
      .pagination__summary {
        margin: 0;
      }

      .event-title-cell span {
        color: #475569;
      }

      .status {
        background: #dbeafe;
        color: #1e3a8a;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        display: inline-flex;
      }

      .feedback--error {
        color: #b91c1c;
      }

      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .pagination__actions {
        display: flex;
        gap: 0.75rem;
        align-items: end;
        flex-wrap: wrap;
      }

      .pagination__size {
        min-width: 140px;
      }

      .pagination__button--secondary,
      .action-button {
        background: #0f172a;
      }

      .pagination__button:disabled,
      .pagination__button--secondary:disabled,
      .action-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .action-button {
        padding: 0.6rem 0.85rem;
        white-space: nowrap;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        display: grid;
        place-items: center;
        padding: 1.5rem;
        z-index: 1000;
      }

      .modal {
        width: min(720px, 100%);
        background: #fff;
        border-radius: 20px;
        padding: 1.5rem;
        display: grid;
        gap: 1rem;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
      }

      .modal__header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: start;
      }

      .modal__eyebrow,
      .modal__subtitle {
        margin: 0;
        color: #475569;
      }

      .modal__header h3 {
        margin: 0.25rem 0 0;
      }

      .modal__close {
        background: #e2e8f0;
        color: #0f172a;
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 999px;
        flex-shrink: 0;
      }

      .report-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }

      .report-card {
        border: 1px solid #dbe4f0;
        border-radius: 16px;
        background: #f8fafc;
        padding: 1rem;
        display: grid;
        gap: 0.35rem;
      }

      .report-card span {
        color: #475569;
      }

      .report-card strong {
        font-size: 1.2rem;
      }

      .report-card--full {
        grid-column: 1 / -1;
      }

      @media (max-width: 768px) {
        .modal-backdrop {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class EventsListPageComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly eventsService = inject(EventsService);
  private readonly currencyFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  protected readonly eventTypes: Array<{ value: EventType; label: string }> = [
    { value: 1, label: 'Conferencia' },
    { value: 2, label: 'Taller' },
    { value: 3, label: 'Concierto' },
  ];
  protected readonly eventStatuses: Array<{ value: EventStatus; label: string }> = [
    { value: 0, label: 'Activo' },
    { value: 1, label: 'Cancelado' },
    { value: 2, label: 'Completado' },
  ];
  protected readonly venues = signal<VenueDropdownOption[]>([]);
  protected readonly loadingVenues = signal(false);
  protected readonly events = signal<EventSummary[]>([]);
  protected readonly listResult = signal<EventListResult | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isOccupationModalOpen = signal(false);
  protected readonly occupationLoading = signal(false);
  protected readonly selectedEventId = signal('');
  protected readonly selectedEventTitle = signal('');
  protected readonly occupationReport = signal<OccupationReport | null>(null);
  protected readonly occupationError = signal('');

  protected readonly filtersForm = this.fb.group({
    search: [''],
    type: [''],
    venueId: [''],
    status: [''],
    startsFrom: [''],
    startsTo: [''],
  });

  ngOnInit(): void {
    this.loadVenues();
    this.loadEvents();
  }

  protected applyFilters(): void {
    this.updateListResultPage(1, this.currentPageSize());
    this.loadEvents();
  }

  protected loadEvents(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const rawFilters = this.filtersForm.getRawValue();
    const filters = {
      ...rawFilters,
      page: String(this.currentPage()),
      pageSize: String(this.currentPageSize()),
      startsFrom: toLocalDateTimeString(rawFilters.startsFrom),
      startsTo: toLocalDateTimeString(rawFilters.startsTo),
    };

    this.eventsService.list(filters).subscribe({
      next: (result) => {
        this.listResult.set(result);
        this.events.set(result.items);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message || 'No fue posible consultar los eventos.',
        );
        this.loading.set(false);
      },
    });
  }

  protected loadVenues(): void {
    this.loadingVenues.set(true);

    this.eventsService.getVenueDropdown().subscribe({
      next: (venues) => {
        this.venues.set(venues);
        this.loadingVenues.set(false);
      },
      error: () => {
        this.loadingVenues.set(false);
      },
    });
  }

  protected loadOccupationReport(eventId: string): void {
    if (!eventId) {
      this.occupationError.set('Debes indicar un EventId valido.');
      this.occupationReport.set(null);
      return;
    }

    this.occupationLoading.set(true);
    this.occupationError.set('');

    this.eventsService.getOccupationReport(eventId).subscribe({
      next: (report) => {
        this.occupationReport.set(report as OccupationReport);
        this.occupationLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.occupationError.set(
          error.error?.message ||
            'No fue posible consultar el reporte de ocupacion.',
        );
        this.occupationReport.set(null);
        this.occupationLoading.set(false);
      },
    });
  }

  protected showOccupationReport(eventId: string): void {
    const selectedEvent = this.events().find((event) => event.id === eventId);

    this.selectedEventId.set(eventId);
    this.selectedEventTitle.set(selectedEvent?.title || 'Evento');
    this.occupationReport.set(null);
    this.occupationError.set('');
    this.isOccupationModalOpen.set(true);
    this.loadOccupationReport(eventId);
  }

  protected closeOccupationModal(): void {
    this.isOccupationModalOpen.set(false);
    this.occupationLoading.set(false);
    this.selectedEventId.set('');
    this.selectedEventTitle.set('');
    this.occupationReport.set(null);
    this.occupationError.set('');
  }

  protected currentPage(): number {
    return this.listResult()?.page || 1;
  }

  protected currentPageSize(): number {
    return this.listResult()?.pageSize || 10;
  }

  protected totalCount(): number {
    return this.listResult()?.totalCount || 0;
  }

  protected totalPages(): number {
    return this.listResult()?.totalPages || 1;
  }

  protected hasNextPage(): boolean {
    return this.listResult()?.hasNextPage || false;
  }

  protected hasPreviousPage(): boolean {
    return this.listResult()?.hasPreviousPage || false;
  }

  protected visibleRangeStart(): number {
    if (this.totalCount() === 0) {
      return 0;
    }

    return (this.currentPage() - 1) * this.currentPageSize() + 1;
  }

  protected visibleRangeEnd(): number {
    if (this.totalCount() === 0) {
      return 0;
    }

    return Math.min(
      this.visibleRangeStart() + this.events().length - 1,
      this.totalCount(),
    );
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.updateListResultPage(this.currentPage() - 1, this.currentPageSize());
    this.loadEvents();
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.updateListResultPage(this.currentPage() + 1, this.currentPageSize());
    this.loadEvents();
  }

  protected changePageSize(pageSize: string): void {
    const parsedPageSize = Number(pageSize) || 10;
    this.updateListResultPage(1, parsedPageSize);
    this.loadEvents();
  }

  protected getEventTypeLabel(type: EventType): string {
    return (
      this.eventTypes.find((item) => item.value === type)?.label || `Tipo ${type}`
    );
  }

  protected getEventStatusLabel(status?: EventStatus): string {
    if (status === undefined) {
      return 'No informado';
    }

    return (
      this.eventStatuses.find((item) => item.value === status)?.label ||
      `Estado ${status}`
    );
  }

  protected getOccupationPercentageLabel(): string {
    const report = this.occupationReport();
    const value = report?.occupancyPercentage ?? report?.occupationPercentage;
    return value !== undefined ? `${value}%` : 'No disponible';
  }

  protected getRevenueLabel(): string {
    const value = this.occupationReport()?.totalRevenue;

    if (value === undefined) {
      return 'No disponible';
    }

    return this.currencyFormatter.format(value);
  }

  private updateListResultPage(page: number, pageSize: number): void {
    const current = this.listResult();

    this.listResult.set({
      items: current?.items || [],
      page,
      pageSize,
      totalCount: current?.totalCount || 0,
      totalPages: current?.totalPages || 1,
      hasNextPage: current?.hasNextPage || false,
      hasPreviousPage: page > 1,
    });
  }
}
