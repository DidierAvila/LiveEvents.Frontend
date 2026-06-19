import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PageSectionComponent } from '../../../shared/components/page-section.component';
import { toLocalDateTimeString } from '../../../shared/utils/date-time.util';
import {
  CreateEventRequest,
  EventType,
  VenueDropdownOption,
} from '../models/event.model';
import { EventsService } from '../services/events.service';

@Component({
  selector: 'app-event-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PageSectionComponent],
  template: `
    <app-page-section
      title="Crear evento"
      description="Formulario alineado con POST /Api/Events del contrato del backend."
    >
      <form class="form" [formGroup]="form" (ngSubmit)="submit()">
        <label class="form__full">
          <span>Titulo</span>
          <input
            formControlName="title"
            placeholder="Angular Day Bogota"
            minlength="5"
            maxlength="100"
          />
          @if (shouldShowControlError('title')) {
            <small class="field-error">{{ getControlErrorMessage('title') }}</small>
          }
        </label>

        <label class="form__full">
          <span>Descripcion</span>
          <textarea
            rows="4"
            formControlName="description"
            placeholder="Describe el evento y sus objetivos"
            minlength="10"
            maxlength="500"
          ></textarea>
          @if (shouldShowControlError('description')) {
            <small class="field-error">{{ getControlErrorMessage('description') }}</small>
          }
        </label>

        <label>
          <span>Lugar</span>
          <select formControlName="venueId">
            <option value="">
              {{ loadingVenues() ? 'Cargando lugares...' : 'Selecciona un lugar' }}
            </option>
            @for (venue of venues(); track venue.id) {
              <option [value]="venue.id">{{ venue.name }}</option>
            }
          </select>
          @if (shouldShowControlError('venueId')) {
            <small class="field-error">{{ getControlErrorMessage('venueId') }}</small>
          }
        </label>

        <label>
          <span>Capacidad maxima</span>
          <input type="number" formControlName="maxCapacity" min="1" step="1" />
          @if (shouldShowControlError('maxCapacity')) {
            <small class="field-error">{{ getControlErrorMessage('maxCapacity') }}</small>
          }
        </label>

        <label>
          <span>Inicio</span>
          <input type="datetime-local" formControlName="startsAt" />
          @if (shouldShowControlError('startsAt')) {
            <small class="field-error">{{ getControlErrorMessage('startsAt') }}</small>
          }
        </label>

        <label>
          <span>Fin</span>
          <input type="datetime-local" formControlName="endsAt" />
          @if (shouldShowDatesRangeError()) {
            <small class="field-error">{{ getDatesRangeErrorMessage() }}</small>
          } @else if (shouldShowControlError('endsAt')) {
            <small class="field-error">{{ getControlErrorMessage('endsAt') }}</small>
          }
        </label>

        <label>
          <span>Precio de entrada</span>
          <input
            type="number"
            formControlName="ticketPrice"
            min="1"
            step="0.01"
          />
          @if (shouldShowControlError('ticketPrice')) {
            <small class="field-error">{{ getControlErrorMessage('ticketPrice') }}</small>
          }
        </label>

        <label>
          <span>Tipo</span>
          <select formControlName="type">
            <option value="">Selecciona un tipo</option>
            @for (type of eventTypes; track type.value) {
              <option [value]="type.value">{{ type.label }}</option>
            }
          </select>
          @if (shouldShowControlError('type')) {
            <small class="field-error">{{ getControlErrorMessage('type') }}</small>
          }
        </label>

        <p class="hint">
          El formulario muestra los lugares disponibles desde GET /Api/Venues/dropdown
          y envia el id seleccionado al backend. La capacidad del venue y su existencia
          se validan definitivamente en el backend.
        </p>

        @if (errorMessage()) {
          <p class="feedback feedback--error">{{ errorMessage() }}</p>
        }

        @if (successMessage()) {
          <p class="feedback feedback--success">{{ successMessage() }}</p>
        }

        <div class="actions">
          <button type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Guardando...' : 'Crear evento' }}
          </button>
          <a routerLink="/events">Volver al listado</a>
        </div>
      </form>
    </app-page-section>
  `,
  styles: [
    `
      .form {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .form__full,
      label {
        display: grid;
        gap: 0.35rem;
      }

      .form__full {
        grid-column: 1 / -1;
      }

      input,
      select,
      textarea {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0.8rem 0.9rem;
        background: #fff;
      }

      textarea {
        resize: vertical;
      }

      .field-error {
        color: #b91c1c;
        font-size: 0.875rem;
      }

      .actions {
        grid-column: 1 / -1;
        display: flex;
        gap: 0.75rem;
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
        grid-column: 1 / -1;
        margin: 0;
      }

      .hint {
        grid-column: 1 / -1;
        margin: 0;
        color: #475569;
      }

      .feedback--error {
        color: #b91c1c;
      }

      .feedback--success {
        color: #15803d;
      }
    `,
  ],
})
export class EventFormPageComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly eventsService = inject(EventsService);

  protected readonly eventTypes: Array<{ value: EventType; label: string }> = [
    { value: 1, label: 'Conferencia' },
    { value: 2, label: 'Taller' },
    { value: 3, label: 'Concierto' },
  ];
  protected readonly venues = signal<VenueDropdownOption[]>([]);
  protected readonly loadingVenues = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly form = this.fb.group(
    {
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: [
        '',
        [Validators.required, Validators.minLength(10), Validators.maxLength(500)],
      ],
      venueId: ['', Validators.required],
      maxCapacity: ['', [Validators.required, positiveIntegerValidator()]],
      startsAt: ['', [Validators.required, futureDateTimeValidator()]],
      endsAt: ['', Validators.required],
      ticketPrice: ['', [Validators.required, positiveDecimalValidator()]],
      type: ['', Validators.required],
    },
    { validators: [endAfterStartValidator()] },
  );

  protected shouldShowControlError(
    controlName: keyof typeof this.form.controls,
  ): boolean {
    const control = this.form.controls[controlName];

    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected shouldShowDatesRangeError(): boolean {
    const startsAtControl = this.form.controls.startsAt;
    const endsAtControl = this.form.controls.endsAt;

    return (
      !!this.form.errors?.['endBeforeStart'] &&
      (
        startsAtControl.touched ||
        startsAtControl.dirty ||
        endsAtControl.touched ||
        endsAtControl.dirty
      )
    );
  }

  protected getControlErrorMessage(
    controlName: keyof typeof this.form.controls,
  ): string {
    const control = this.form.controls[controlName];

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return this.getRequiredMessage(controlName);
    }

    if (control.errors['minlength']) {
      if (controlName === 'title') {
        return 'El titulo debe tener entre 5 y 100 caracteres.';
      }

      if (controlName === 'description') {
        return 'La descripcion debe tener entre 10 y 500 caracteres.';
      }
    }

    if (control.errors['maxlength']) {
      if (controlName === 'title') {
        return 'El titulo debe tener entre 5 y 100 caracteres.';
      }

      if (controlName === 'description') {
        return 'La descripcion debe tener entre 10 y 500 caracteres.';
      }
    }

    if (control.errors['positiveInteger']) {
      return 'La capacidad maxima debe ser un entero positivo.';
    }

    if (control.errors['futureDateTime']) {
      return 'La fecha y hora de inicio debe ser futura.';
    }

    if (control.errors['positiveDecimal']) {
      return 'El precio de entrada debe ser un decimal positivo.';
    }

    return 'El valor ingresado no es valido.';
  }

  protected getDatesRangeErrorMessage(): string {
    return 'La fecha y hora de fin debe ser posterior al inicio.';
  }

  private getRequiredMessage(
    controlName: keyof typeof this.form.controls,
  ): string {
    const messages: Record<keyof typeof this.form.controls, string> = {
      title: 'El titulo es obligatorio.',
      description: 'La descripcion es obligatoria.',
      venueId: 'Debes seleccionar un lugar.',
      maxCapacity: 'La capacidad maxima es obligatoria.',
      startsAt: 'La fecha y hora de inicio son obligatorias.',
      endsAt: 'La fecha y hora de fin son obligatorias.',
      ticketPrice: 'El precio de entrada es obligatorio.',
      type: 'Debes seleccionar un tipo de evento.',
    };

    return messages[controlName];
  }

  ngOnInit(): void {
    this.loadVenues();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload: CreateEventRequest = {
      title: rawValue.title,
      description: rawValue.description,
      venueId: rawValue.venueId,
      maxCapacity: Number(rawValue.maxCapacity),
      startsAt: toLocalDateTimeString(rawValue.startsAt),
      endsAt: toLocalDateTimeString(rawValue.endsAt),
      ticketPrice: Number(rawValue.ticketPrice),
      type: Number(rawValue.type) as EventType,
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.eventsService.create(payload).subscribe({
      next: () => {
        this.successMessage.set('Evento creado correctamente.');
        this.form.reset({
          title: '',
          description: '',
          venueId: '',
          maxCapacity: '',
          startsAt: '',
          endsAt: '',
          ticketPrice: '',
          type: '',
        });
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.message || 'No fue posible crear el evento.',
        );
        this.saving.set(false);
      },
    });
  }

  private loadVenues(): void {
    this.loadingVenues.set(true);

    this.eventsService.getVenueDropdown().subscribe({
      next: (venues) => {
        this.venues.set(venues);
        this.loadingVenues.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'No fue posible cargar los lugares disponibles.',
        );
        this.loadingVenues.set(false);
      },
    });
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

function positiveDecimalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);

    if (control.value === null || control.value === undefined || control.value === '') {
      return null;
    }

    return Number.isFinite(value) && value > 0 ? null : { positiveDecimal: true };
  };
}

function futureDateTimeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
      return { futureDateTime: true };
    }

    return parsedValue.getTime() > Date.now() ? null : { futureDateTime: true };
  };
}

function endAfterStartValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const startsAt = group.get('startsAt')?.value;
    const endsAt = group.get('endsAt')?.value;

    if (!startsAt || !endsAt) {
      return null;
    }

    const startsAtDate = new Date(String(startsAt));
    const endsAtDate = new Date(String(endsAt));

    if (
      Number.isNaN(startsAtDate.getTime()) ||
      Number.isNaN(endsAtDate.getTime())
    ) {
      return null;
    }

    return endsAtDate.getTime() > startsAtDate.getTime()
      ? null
      : { endBeforeStart: true };
  };
}
