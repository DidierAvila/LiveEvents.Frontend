import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { PageSectionComponent } from '../../../shared/components/page-section.component';
import { AuthStoreService } from '../services/auth-store.service';

@Component({
  selector: 'app-auth-account-page',
  standalone: true,
  imports: [CommonModule, PageSectionComponent],
  template: `
    <div class="page">
      <app-page-section
        title="Sesion actual"
        description="Resumen del usuario autenticado, roles y configuracion del portal."
      >
        <div class="actions">
          <button type="button" class="secondary" (click)="refresh()">
            {{ authStore.isLoadingProfile() ? 'Actualizando...' : 'Actualizar perfil' }}
          </button>
          <button type="button" class="ghost" (click)="logout()">Cerrar sesion</button>
        </div>
      </app-page-section>

      <app-page-section
        title="Perfil actual"
        description="Respuesta derivada de GET /Api/Account/me."
      >
        @if (authStore.isLoadingProfile()) {
          <p class="feedback">Consultando perfil...</p>
        } @else if (!authStore.profile()) {
          <p class="feedback">Aun no se ha consultado el perfil autenticado.</p>
        } @else {
          <div class="profile-grid">
            <article class="card">
              <h3>Usuario</h3>
              <p><strong>Nombre:</strong> {{ authStore.profile()!.user.name }}</p>
              <p><strong>Email:</strong> {{ authStore.profile()!.user.email }}</p>
              <p><strong>Id:</strong> {{ authStore.profile()!.user.id }}</p>
            </article>

            <article class="card">
              <h3>Roles</h3>
              @if (authStore.profile()!.roles.length === 0) {
                <p>Sin roles asignados.</p>
              } @else {
                <ul>
                  @for (role of authStore.profile()!.roles; track role.id) {
                    <li>{{ role.name }} · {{ role.status ? 'activo' : 'inactivo' }}</li>
                  }
                </ul>
              }
            </article>

            <article class="card">
              <h3>Permisos efectivos</h3>
              @if (authStore.permissionNames().length === 0) {
                <p>No se pudieron resolver permisos o no hay permisos asignados.</p>
              } @else {
                <ul>
                  @for (permission of authStore.permissionNames(); track permission) {
                    <li>{{ permission }}</li>
                  }
                </ul>
              }
            </article>

            <article class="card card--full">
              <h3>Portal configuration</h3>
              @if (!authStore.profile()!.portalConfiguration) {
                <p>El usuario no tiene configuracion de portal asociada.</p>
              } @else {
                <p>
                  <strong>Nombre:</strong>
                  {{ authStore.profile()!.portalConfiguration!.name }}
                </p>
                <p>
                  <strong>Idioma:</strong>
                  {{ authStore.profile()!.portalConfiguration!.language }}
                </p>
                <p>
                  <strong>Tema:</strong>
                  {{ authStore.profile()!.portalConfiguration!.theme }}
                </p>
                <p>
                  <strong>Descripcion:</strong>
                  {{ authStore.profile()!.portalConfiguration!.description }}
                </p>
                <p>
                  <strong>Landing por defecto:</strong>
                  {{
                    authStore.profile()!.portalConfiguration!.defaultLandingPage ||
                      'No configurado'
                  }}
                </p>
              }
            </article>
          </div>
        }
      </app-page-section>
    </div>
  `,
  styles: [
    `
      .page,
      .profile-grid {
        display: grid;
        gap: 1.5rem;
      }

      .actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      button {
        border: none;
        border-radius: 12px;
        padding: 0.85rem 1rem;
        color: #fff;
        background: #1d4ed8;
        cursor: pointer;
      }

      .secondary {
        background: #0f172a;
      }

      .ghost {
        background: #64748b;
      }

      .feedback {
        margin: 0;
      }

      .feedback--error {
        color: #b91c1c;
      }

      .profile-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }

      .card {
        border: 1px solid #dbe4f0;
        border-radius: 16px;
        padding: 1rem 1.25rem;
        background: #f8fafc;
      }

      .card--full {
        grid-column: 1 / -1;
      }

      h3,
      p,
      ul {
        margin: 0;
      }

      .card > * + * {
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class AuthAccountPageComponent {
  readonly authStore = inject(AuthStoreService);

  protected refresh(): void {
    this.authStore.refreshSession().subscribe();
  }

  protected logout(): void {
    this.authStore.logout();
  }
}
