import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { PageSectionComponent } from '../../../shared/components/page-section.component';
import { ProblemDetails } from '../models/auth.model';
import { AuthStoreService } from '../services/auth-store.service';

@Component({
  selector: 'app-auth-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageSectionComponent],
  template: `
    <div class="login-layout">
      <app-page-section
        title="Iniciar sesion"
        description="Autenticacion contra POST /Api/Auth/Login con carga automatica de perfil, roles y permisos."
      >
        <form class="form" [formGroup]="form" (ngSubmit)="submit()">
          <label>
            <span>Email</span>
            <input
              type="email"
              formControlName="email"
              placeholder="usuario@correo.com"
            />
          </label>

          <label>
            <span>Contrasena</span>
            <input
              type="password"
              formControlName="password"
              placeholder="Tu contrasena"
            />
          </label>

          @if (errorMessage()) {
            <p class="feedback feedback--error">{{ errorMessage() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || authStore.isAuthenticating()">
            {{ authStore.isAuthenticating() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </app-page-section>

      <app-page-section
        title="Que hace este flujo"
        description="La sesion queda lista para menús dinamicos y autorizacion por rutas."
      >
        <ul class="tips">
          <li>Guarda el JWT en localStorage.</li>
          <li>Consulta GET /Api/Account/me despues del login.</li>
          <li>Resuelve permisos por rol con GET /Api/Roles/:roleId/permissions.</li>
          <li>Construye el menu visible segun roles y permisos del usuario.</li>
        </ul>
      </app-page-section>
    </div>
  `,
  styles: [
    `
      .login-layout {
        max-width: 720px;
        display: grid;
        gap: 1.5rem;
        margin: 0 auto;
      }

      .form {
        display: grid;
        gap: 1rem;
      }

      label {
        display: grid;
        gap: 0.35rem;
      }

      input,
      button {
        border-radius: 12px;
      }

      input {
        border: 1px solid #cbd5e1;
        padding: 0.85rem 0.9rem;
      }

      button {
        border: none;
        padding: 0.9rem 1rem;
        background: #1d4ed8;
        color: #fff;
        cursor: pointer;
      }

      button:disabled {
        background: #93c5fd;
        cursor: not-allowed;
      }

      .feedback {
        margin: 0;
      }

      .feedback--error {
        color: #b91c1c;
      }

      .tips {
        margin: 0;
        padding-left: 1.1rem;
      }
    `,
  ],
})
export class AuthLoginPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly authStore = inject(AuthStoreService);

  protected readonly errorMessage = signal('');
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.errorMessage.set('');

    this.authStore.login(email, password).subscribe({
      error: (error: HttpErrorResponse) => {
        const problem = error.error as ProblemDetails | string | null;
        const message =
          typeof problem === 'string'
            ? problem
            : problem?.detail || problem?.title || 'No fue posible iniciar sesion.';

        this.errorMessage.set(message);
      },
    });
  }
}
