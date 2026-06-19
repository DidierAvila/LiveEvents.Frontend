import { CommonModule, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { PageSectionComponent } from '../../../shared/components/page-section.component';
import { AuthService } from '../services/auth.service';

type ResourceKind = 'users' | 'roles' | 'permissions';

@Component({
  selector: 'app-auth-resource-page',
  standalone: true,
  imports: [CommonModule, JsonPipe, PageSectionComponent],
  template: `
    <div class="page">
      <app-page-section
        [title]="title()"
        [description]="description()"
      >
        <div class="actions">
          <button type="button" (click)="load()">
            {{ loading() ? 'Consultando...' : 'Recargar' }}
          </button>
        </div>

        @if (errorMessage()) {
          <p class="feedback feedback--error">{{ errorMessage() }}</p>
        }
      </app-page-section>

      <app-page-section
        title="Respuesta del backend"
        description="Vista cruda de la respuesta para avanzar rapido mientras definimos tablas y filtros finales."
      >
        @if (loading()) {
          <p class="feedback">Consultando recurso...</p>
        } @else if (!payload()) {
          <p class="feedback">Aun no hay informacion cargada.</p>
        } @else {
          <pre>{{ payload() | json }}</pre>
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

      .actions {
        display: flex;
        gap: 0.75rem;
      }

      button {
        border: none;
        border-radius: 12px;
        padding: 0.85rem 1rem;
        color: #fff;
        background: #1d4ed8;
        cursor: pointer;
      }

      .feedback {
        margin: 0;
      }

      .feedback--error {
        color: #b91c1c;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `,
  ],
})
export class AuthResourcePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly payload = signal<unknown>(null);

  protected readonly resource = computed<ResourceKind>(
    () => (this.route.snapshot.data['resource'] as ResourceKind) || 'users',
  );
  protected readonly title = computed(() => {
    const labels: Record<ResourceKind, string> = {
      users: 'Usuarios',
      roles: 'Roles',
      permissions: 'Permisos',
    };

    return labels[this.resource()];
  });
  protected readonly description = computed(() => {
    const descriptions: Record<ResourceKind, string> = {
      users: 'Consulta inicial sobre `/Api/Users` con sesion autenticada.',
      roles: 'Consulta inicial sobre `/Api/Roles` para administracion de roles.',
      permissions:
        'Consulta inicial sobre `/Api/Permissions` para revisar permisos disponibles.',
    };

    return descriptions[this.resource()];
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.resolveRequest().subscribe({
      next: (payload) => {
        this.payload.set(payload);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.detail || error.error?.title || 'No fue posible consultar el recurso.',
        );
        this.loading.set(false);
      },
    });
  }

  private resolveRequest() {
    if (this.resource() === 'roles') {
      return this.authService.getRoles({ Page: 1, PageSize: 10 });
    }

    if (this.resource() === 'permissions') {
      return this.authService.getPermissions({ Page: 1, PageSize: 10 });
    }

    return this.authService.getUsers({ Page: 1, PageSize: 10 });
  }
}
