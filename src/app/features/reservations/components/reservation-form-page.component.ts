import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStoreService } from '../../auth/services/auth-store.service';
import { PageSectionComponent } from '../../../shared/components/page-section.component';
import {
  CreateReservationRequest,
  ReservationEventOption,
} from '../models/reservation.model';
import { ReservationsService } from '../services/reservations.service';

type ReservationFormControlName =
  | 'eventId'
  | 'quantity'
  | 'buyerName'
  | 'buyerEmail';

@Component({
  selector: 'app-reservation-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageSectionComponent],
  template: `
    <app-page-section
      title="Crear reserva"
      description="Formulario alineado con POST /Api/Reservations."
    >
      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <label class="field field--full">
          <span class="field__label">Evento</span>
          <span class="field__hint">Busca y selecciona el evento que deseas reservar</span>
          <div class="combobox">
            <input
              [value]="eventSearch()"
              (input)="updateEventSearch($any($event.target).value)"
              (focus)="openDropdown()"
              (blur)="closeDropdownWithDelay()"
              [placeholder]="
                loadingEvents() ? 'Cargando eventos...' : 'Busca y selecciona un evento'
              "
              [attr.aria-expanded]="isDropdownOpen()"
              [attr.aria-controls]="'event-options-list'"
              autocomplete="off"
            />

            @if (isDropdownOpen()) {
              <div class="combobox__panel" id="event-options-list" role="listbox">
                @if (loadingEvents()) {
                  <button type="button" class="combobox__option" disabled>
                    Cargando eventos...
                  </button>
                } @else if (filteredEventOptions().length === 0) {
                  <button type="button" class="combobox__option" disabled>
                    No hay eventos que coincidan
                  </button>
                } @else {
                  @for (event of filteredEventOptions(); track event.id) {
                    <button
                      type="button"
                      class="combobox__option"
                      (mousedown)="selectEvent(event)"
                    >
                      {{ event.name }}
                    </button>
                  }
                }
              </div>
            }
          </div>
          @if (shouldShowControlError('eventId')) {
            <small class="field__error">{{ getControlErrorMessage('eventId') }}</small>
          }
        </label>

        <label class="field field--compact">
          <span class="field__label">Cantidad</span>
          <span class="field__hint">Numero de entradas a reservar</span>
          <input type="number" formControlName="quantity" min="1" />
          @if (showSelectedEventReservationRule()) {
            <span class="field__hint">
              Este evento inicia en menos de 24 horas. Solo puedes reservar maximo 5 entradas.
            </span>
          }
          @if (shouldShowControlError('quantity')) {
            <small class="field__error">{{ getControlErrorMessage('quantity') }}</small>
          }
        </label>

        <label class="field">
          <span class="field__label">Nombre comprador</span>
          <span class="field__hint">Nombre completo de la persona que reserva</span>
          <input formControlName="buyerName" placeholder="Alejo Ceiba" />
          @if (shouldShowControlError('buyerName')) {
            <small class="field__error">{{ getControlErrorMessage('buyerName') }}</small>
          }
        </label>

        <label class="field">
          <span class="field__label">Email comprador</span>
          <span class="field__hint">Correo al que se enviara la informacion</span>
          <input
            type="email"
            formControlName="buyerEmail"
            placeholder="alejo@correo.com"
            [readonly]="!!loggedUserEmail()"
          />
          @if (shouldShowControlError('buyerEmail')) {
            <small class="field__error">{{ getControlErrorMessage('buyerEmail') }}</small>
          }
        </label>

        @if (errorMessage()) {
          <p class="feedback feedback--error">{{ errorMessage() }}</p>
        }

        @if (successMessage()) {
          <p class="feedback feedback--success">{{ successMessage() }}</p>
        }

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Guardando...' : 'Crear reserva' }}
          </button>
          <a routerLink="/reservations">Volver al listado</a>
        </div>
      </form>
    </app-page-section>
  `,
  styles: [
    `
      .form {
        display: grid;
        gap: 1.25rem;
        grid-template-columns: minmax(180px, 240px) repeat(2, minmax(220px, 1fr));
        align-items: start;
      }

      .field {
        display: grid;
        gap: 0.4rem;
        padding: 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #f8fafc;
      }

      .field--full,
      .feedback,
      .actions {
        grid-column: 1 / -1;
      }

      .field--compact {
        max-width: 240px;
      }

      .field__label {
        font-weight: 600;
        color: #0f172a;
      }

      .field__hint {
        font-size: 0.9rem;
        color: #64748b;
      }

      input,
      select {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0.8rem 0.9rem;
        background: #fff;
      }

      .combobox {
        position: relative;
      }

      .combobox input {
        width: 100%;
      }

      .combobox__panel {
        position: absolute;
        top: calc(100% + 0.35rem);
        left: 0;
        right: 0;
        z-index: 10;
        max-height: 260px;
        overflow-y: auto;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
        padding: 0.35rem;
        display: grid;
        gap: 0.25rem;
      }

      .combobox__option {
        width: 100%;
        text-align: left;
        background: transparent;
        color: #0f172a;
        padding: 0.75rem 0.85rem;
        border-radius: 10px;
      }

      .combobox__option:hover:not(:disabled) {
        background: #eff6ff;
      }

      .combobox__option:disabled {
        cursor: default;
        color: #64748b;
      }

      .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }

      button,
      a {
        border: none;
        border-radius: 12px;
        padding: 0.85rem 1rem;
      }

      button {
        background: #1d4ed8;
        color: #fff;
        cursor: pointer;
      }

      button:disabled {
        background: #93c5fd;
        cursor: not-allowed;
      }

      a {
        background: #e2e8f0;
        color: #0f172a;
        text-align: center;
      }

      .feedback {
        margin: 0;
        padding: 0.85rem 1rem;
        border-radius: 14px;
      }

      .feedback--error {
        color: #b91c1c;
        background: #fef2f2;
      }

      .feedback--success {
        color: #15803d;
        background: #f0fdf4;
      }

      .field__error {
        color: #b91c1c;
        font-size: 0.875rem;
      }

      @media (max-width: 960px) {
        .form {
          grid-template-columns: repeat(2, minmax(220px, 1fr));
        }

        .field--compact {
          max-width: none;
        }
      }

      @media (max-width: 640px) {
        .form {
          grid-template-columns: 1fr;
        }

        .actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ReservationFormPageComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly reservationsService = inject(ReservationsService);
  private readonly authStore = inject(AuthStoreService);
  private closeDropdownTimeoutId?: ReturnType<typeof setTimeout>;

  protected readonly eventOptions = signal<ReservationEventOption[]>([]);
  protected readonly eventSearch = signal('');
  protected readonly loggedUserEmail = computed(
    () => this.authStore.user()?.email?.trim() ?? '',
  );
  protected readonly loadingEvents = signal(false);
  protected readonly isDropdownOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly filteredEventOptions = computed(() => {
    const search = this.eventSearch().trim().toLowerCase();

    if (!search) {
      return this.eventOptions();
    }

    return this.eventOptions().filter((event) =>
      event.name.toLowerCase().includes(search),
    );
  });

  protected readonly form = this.fb.group({
    eventId: ['', Validators.required],
    quantity: [
      '',
      [
        Validators.required,
        positiveIntegerValidator(),
        nearStartMaxFiveValidator(() => this.getSelectedEventOption()),
      ],
    ],
    buyerName: ['', [Validators.required, Validators.minLength(3)]],
    buyerEmail: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    effect(() => {
      const userEmail = this.loggedUserEmail();

      if (!userEmail) {
        return;
      }

      this.form.controls.buyerEmail.setValue(userEmail, { emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.loadEventOptions();
  }

  protected shouldShowControlError(controlName: ReservationFormControlName): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected getControlErrorMessage(controlName: ReservationFormControlName): string {
    const control = this.form.controls[controlName];

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      const messages: Record<ReservationFormControlName, string> = {
        eventId: 'Debes seleccionar un evento.',
        quantity: 'La cantidad es obligatoria.',
        buyerName: 'El nombre del comprador es obligatorio.',
        buyerEmail: 'El email del comprador es obligatorio.',
      };

      return messages[controlName];
    }

    if (control.errors['positiveInteger']) {
      return 'La cantidad debe ser 1 o mas.';
    }

    if (control.errors['minlength']) {
      return 'El nombre del comprador debe tener al menos 3 caracteres.';
    }

    if (control.errors['email']) {
      return 'Debes ingresar un email con formato valido.';
    }

    if (control.errors['nearStartMaxFive']) {
      return 'Si el evento inicia en menos de 24 horas, solo puedes reservar maximo 5 entradas.';
    }

    return 'El valor ingresado no es valido.';
  }

  protected showSelectedEventReservationRule(): boolean {
    return startsWithinNext24Hours(this.getSelectedEventOption()?.startsAt);
  }

  protected updateEventSearch(value: string): void {
    this.eventSearch.set(value);
    this.form.controls.eventId.setValue('');
    this.form.controls.eventId.markAsDirty();
    this.form.controls.quantity.updateValueAndValidity({ emitEvent: false });
    this.isDropdownOpen.set(true);
  }

  protected openDropdown(): void {
    this.clearCloseDropdownTimeout();
    this.isDropdownOpen.set(true);
  }

  protected closeDropdownWithDelay(): void {
    this.clearCloseDropdownTimeout();
    this.closeDropdownTimeoutId = setTimeout(() => {
      this.isDropdownOpen.set(false);
      this.syncEventSearchWithSelection();
    }, 150);
  }

  protected selectEvent(event: ReservationEventOption): void {
    this.form.controls.eventId.setValue(event.id);
    this.form.controls.eventId.markAsTouched();
    this.eventSearch.set(event.name);
    this.form.controls.quantity.updateValueAndValidity({ emitEvent: false });
    this.isDropdownOpen.set(false);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload: CreateReservationRequest = {
      eventId: rawValue.eventId,
      quantity: Number(rawValue.quantity),
      buyerName: rawValue.buyerName,
      buyerEmail: this.loggedUserEmail() || rawValue.buyerEmail,
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.reservationsService.create(payload).subscribe({
      next: () => {
        this.successMessage.set(
          this.reservationsService.toActionResult('create').message,
        );
        this.eventSearch.set('');
        this.form.reset({
          eventId: '',
          quantity: '',
          buyerName: '',
          buyerEmail: this.loggedUserEmail(),
        });
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message || 'No fue posible crear la reserva.',
        );
        this.saving.set(false);
      },
    });
  }

  private loadEventOptions(): void {
    this.loadingEvents.set(true);

    this.reservationsService.getEventsDropdown().subscribe({
      next: (events) => {
        this.eventOptions.set(events);
        this.form.controls.quantity.updateValueAndValidity({ emitEvent: false });
        this.loadingEvents.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'No fue posible cargar los eventos disponibles para reservar.',
        );
        this.loadingEvents.set(false);
      },
    });
  }

  private syncEventSearchWithSelection(): void {
    const selectedEventId = this.form.controls.eventId.getRawValue();

    if (!selectedEventId) {
      this.eventSearch.set('');
      return;
    }

    const selectedEvent = this.eventOptions().find(
      (event) => event.id === selectedEventId,
    );

    this.eventSearch.set(selectedEvent?.name || '');
  }

  private getSelectedEventOption(): ReservationEventOption | null {
    const selectedEventId = this.form.controls.eventId.getRawValue();
    return this.eventOptions().find((event) => event.id === selectedEventId) ?? null;
  }

  private clearCloseDropdownTimeout(): void {
    if (this.closeDropdownTimeoutId) {
      clearTimeout(this.closeDropdownTimeoutId);
      this.closeDropdownTimeoutId = undefined;
    }
  }
}

function positiveIntegerValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    return /^[1-9]\d*$/.test(value) ? null : { positiveInteger: true };
  };
}

function nearStartMaxFiveValidator(
  getSelectedEvent: () => ReservationEventOption | null,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);

    if (
      control.value === null ||
      control.value === undefined ||
      control.value === '' ||
      !Number.isFinite(value)
    ) {
      return null;
    }

    const selectedEvent = getSelectedEvent();

    if (!selectedEvent?.startsAt) {
      return null;
    }

    return startsWithinNext24Hours(selectedEvent.startsAt) && value > 5
      ? { nearStartMaxFive: true }
      : null;
  };
}

function startsWithinNext24Hours(value?: string): boolean {
  if (!value) {
    return false;
  }

  const startsAt = new Date(value);

  if (Number.isNaN(startsAt.getTime())) {
    return false;
  }

  const diffInMs = startsAt.getTime() - Date.now();
  return diffInMs > 0 && diffInMs <= 24 * 60 * 60 * 1000;
}
