import { CommonModule, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { PageSectionComponent } from '../../../shared/components/page-section.component';
import {
  AuthRoleDetail,
  AuthRolesListResult,
  AuthRoleSummary,
  AuthUserDetail,
  AuthUsersListResult,
  AuthUserSummary,
  UpdateAuthRoleRequest,
  UpdateAuthUserRequest,
} from '../models/auth.model';
import { AuthService } from '../services/auth.service';

type ResourceKind = 'users' | 'roles' | 'permissions';

@Component({
  selector: 'app-auth-resource-page',
  standalone: true,
  imports: [CommonModule, JsonPipe, ReactiveFormsModule, PageSectionComponent],
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

        @if (successMessage()) {
          <p class="feedback feedback--success">{{ successMessage() }}</p>
        }
      </app-page-section>

      <app-page-section
        title="Respuesta del backend"
        description="Vista cruda de la respuesta para avanzar rapido mientras definimos tablas y filtros finales."
      >
        @if (resource() === 'users') {
          @if (loading()) {
            <p class="feedback">Consultando usuarios...</p>
          } @else if (users().length === 0) {
            <p class="feedback">No hay usuarios para mostrar.</p>
          } @else {
            <div class="table-wrapper">
              <table class="resource-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Tipo usuario</th>
                    <th>Telefono</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of users(); track user.id) {
                    <tr>
                      <td>
                        <div class="primary-cell">
                          <strong>{{ user.name }}</strong>
                          <span>{{ user.id }}</span>
                        </div>
                      </td>
                      <td>{{ user.email }}</td>
                      <td>{{ user.firstRoleName || 'No disponible' }}</td>
                      <td>{{ user.userTypeName || 'No disponible' }}</td>
                      <td>{{ user.phone || 'No disponible' }}</td>
                      <td>
                        <span class="status" [class.status--inactive]="!user.status">
                          {{ user.status ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>{{ user.createdAt | date: 'medium' }}</td>
                      <td>
                        <div class="row-actions">
                          <button
                            type="button"
                            class="button button--secondary"
                            (click)="handleUserAction('ver', user)"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            class="button button--secondary"
                            (click)="handleUserAction('actualizar', user)"
                            [disabled]="deleteLoadingId() === user.id"
                          >
                            Actualizar
                          </button>
                          <button
                            type="button"
                            class="button button--danger"
                            (click)="handleUserAction('eliminar', user)"
                            [disabled]="deleteLoadingId() === user.id"
                          >
                            {{ deleteLoadingId() === user.id ? 'Eliminando...' : 'Eliminar' }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="pagination">
              <p class="feedback">
                Mostrando {{ visibleRangeStart() }}-{{ visibleRangeEnd() }} de
                {{ totalRecords() }} usuario(s) · Pagina {{ currentPage() }} de
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
                  class="button button--secondary"
                  (click)="goToPreviousPage()"
                  [disabled]="!hasPreviousPage() || loading()"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  (click)="goToNextPage()"
                  [disabled]="!hasNextPage() || loading()"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        } @else if (resource() === 'roles') {
          @if (loading()) {
            <p class="feedback">Consultando roles...</p>
          } @else if (roles().length === 0) {
            <p class="feedback">No hay roles para mostrar.</p>
          } @else {
            <div class="table-wrapper">
              <table class="resource-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripcion</th>
                    <th>Estado</th>
                    <th>Usuarios</th>
                    <th>Permisos</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (role of roles(); track role.id) {
                    <tr>
                      <td>
                        <div class="primary-cell">
                          <strong>{{ role.name }}</strong>
                          <span>{{ role.id }}</span>
                        </div>
                      </td>
                      <td>{{ role.description || 'No disponible' }}</td>
                      <td>
                        <span class="status" [class.status--inactive]="!role.status">
                          {{ role.status ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>{{ role.userCount ?? 0 }}</td>
                      <td>{{ role.permissionCount ?? 0 }}</td>
                      <td>{{ role.createdAt | date: 'medium' }}</td>
                      <td>
                        <div class="row-actions">
                          <button
                            type="button"
                            class="button button--secondary"
                            (click)="handleRoleAction('ver', role)"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            class="button button--secondary"
                            (click)="handleRoleAction('actualizar', role)"
                            [disabled]="roleDeleteLoadingId() === role.id"
                          >
                            Actualizar
                          </button>
                          <button
                            type="button"
                            class="button button--danger"
                            (click)="handleRoleAction('eliminar', role)"
                            [disabled]="roleDeleteLoadingId() === role.id"
                          >
                            {{ roleDeleteLoadingId() === role.id ? 'Eliminando...' : 'Eliminar' }}
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="pagination">
              <p class="feedback">
                Mostrando {{ visibleRangeStart() }}-{{ visibleRangeEnd() }} de
                {{ totalRecords() }} rol(es) · Pagina {{ currentPage() }} de
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
                  class="button button--secondary"
                  (click)="goToPreviousPage()"
                  [disabled]="!hasPreviousPage() || loading()"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  (click)="goToNextPage()"
                  [disabled]="!hasNextPage() || loading()"
                >
                  Siguiente
                </button>
              </div>
            </div>
          }
        } @else if (loading()) {
          <p class="feedback">Consultando recurso...</p>
        } @else if (!payload()) {
          <p class="feedback">Aun no hay informacion cargada.</p>
        } @else {
          <pre>{{ payload() | json }}</pre>
        }
      </app-page-section>
    </div>

    @if (isUserDetailModalOpen()) {
      <div class="modal-backdrop" (click)="closeUserDetailModal()">
        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-modal-title"
          (click)="$event.stopPropagation()"
        >
          <header class="modal__header">
            <div>
              <p class="modal__eyebrow">
                {{ userModalMode() === 'edit' ? 'Actualizar usuario' : 'Detalle de usuario' }}
              </p>
              <h3 id="user-detail-modal-title">
                {{ selectedUserDetail()?.name || selectedUserName() || 'Usuario' }}
              </h3>
            </div>
            <button
              type="button"
              class="modal__close button button--secondary"
              (click)="closeUserDetailModal()"
              aria-label="Cerrar"
            >
              X
            </button>
          </header>

          <p class="modal__subtitle">
            UserId: {{ selectedUserDetail()?.id || selectedUserId() || 'No disponible' }}
          </p>

          @if (userDetailLoading()) {
            <p class="feedback">Consultando detalle del usuario...</p>
          }

          @if (userDetailError()) {
            <p class="feedback feedback--error">{{ userDetailError() }}</p>
          }

          @if (selectedUserDetail() && userModalMode() === 'view') {
            <div class="detail-grid">
              <article class="detail-card detail-card--full">
                <span>Nombre</span>
                <strong>{{ selectedUserDetail()?.name || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Email</span>
                <strong>{{ selectedUserDetail()?.email || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Rol principal</span>
                <strong>{{ selectedUserDetail()?.firstRoleName || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Tipo de usuario</span>
                <strong>{{ selectedUserDetail()?.userTypeName || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>UserTypeId</span>
                <strong>{{ selectedUserDetail()?.userTypeId || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Telefono</span>
                <strong>{{ selectedUserDetail()?.phone || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Direccion</span>
                <strong>{{ selectedUserDetail()?.address || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Imagen</span>
                <strong>{{ selectedUserDetail()?.image || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Estado</span>
                <strong>{{ selectedUserDetail()?.status ? 'Activo' : 'Inactivo' }}</strong>
              </article>
              <article class="detail-card">
                <span>Creado</span>
                <strong>{{ formatDateLabel(selectedUserDetail()?.createdAt) }}</strong>
              </article>
              <article class="detail-card">
                <span>Actualizado</span>
                <strong>{{ formatDateLabel(selectedUserDetail()?.updatedAt) }}</strong>
              </article>
            </div>
          }

          @if (selectedUserDetail() && userModalMode() === 'edit') {
            <form class="edit-form" [formGroup]="userEditForm" (ngSubmit)="submitUserUpdate()">
              <label class="edit-form__field">
                <span>Nombre</span>
                <input formControlName="name" />
              </label>
              <label class="edit-form__field">
                <span>Email</span>
                <input type="email" formControlName="email" />
              </label>
              <label class="edit-form__field">
                <span>Imagen</span>
                <input formControlName="image" />
              </label>
              <label class="edit-form__field">
                <span>Telefono</span>
                <input formControlName="phone" />
              </label>
              <label class="edit-form__field">
                <span>UserTypeId</span>
                <input formControlName="userTypeId" />
              </label>
              <label class="edit-form__field">
                <span>Direccion</span>
                <input formControlName="address" />
              </label>
              <label class="edit-form__field edit-form__field--full">
                <span>RoleIds</span>
                <input
                  formControlName="roleIds"
                  placeholder="Separa los ids por coma"
                />
              </label>
              <label class="edit-form__field edit-form__field--full">
                <span>AdditionalData</span>
                <textarea
                  rows="4"
                  formControlName="additionalData"
                  placeholder='JSON opcional, por ejemplo: {"key":"value"}'
                ></textarea>
              </label>
              <label class="edit-form__checkbox">
                <input type="checkbox" formControlName="status" />
                <span>Usuario activo</span>
              </label>

              <div class="modal__actions">
                <button
                  type="button"
                  class="button button--secondary"
                  (click)="closeUserDetailModal()"
                >
                  Cancelar
                </button>
                <button type="submit" [disabled]="userUpdateLoading()">
                  {{ userUpdateLoading() ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </div>
            </form>
          }
        </section>
      </div>
    }

    @if (isRoleDetailModalOpen()) {
      <div class="modal-backdrop" (click)="closeRoleDetailModal()">
        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-detail-modal-title"
          (click)="$event.stopPropagation()"
        >
          <header class="modal__header">
            <div>
              <p class="modal__eyebrow">
                {{ roleModalMode() === 'edit' ? 'Actualizar rol' : 'Detalle de rol' }}
              </p>
              <h3 id="role-detail-modal-title">
                {{ selectedRoleDetail()?.name || selectedRoleName() || 'Rol' }}
              </h3>
            </div>
            <button
              type="button"
              class="modal__close button button--secondary"
              (click)="closeRoleDetailModal()"
              aria-label="Cerrar"
            >
              X
            </button>
          </header>

          <p class="modal__subtitle">
            RoleId: {{ selectedRoleDetail()?.id || selectedRoleId() || 'No disponible' }}
          </p>

          @if (roleDetailLoading()) {
            <p class="feedback">Consultando detalle del rol...</p>
          }

          @if (roleDetailError()) {
            <p class="feedback feedback--error">{{ roleDetailError() }}</p>
          }

          @if (selectedRoleDetail() && roleModalMode() === 'view') {
            <div class="detail-grid">
              <article class="detail-card detail-card--full">
                <span>Nombre</span>
                <strong>{{ selectedRoleDetail()?.name || 'No disponible' }}</strong>
              </article>
              <article class="detail-card detail-card--full">
                <span>Descripcion</span>
                <strong>{{ selectedRoleDetail()?.description || 'No disponible' }}</strong>
              </article>
              <article class="detail-card">
                <span>Estado</span>
                <strong>{{ selectedRoleDetail()?.status ? 'Activo' : 'Inactivo' }}</strong>
              </article>
              <article class="detail-card">
                <span>Usuarios</span>
                <strong>{{ selectedRoleDetail()?.userCount ?? 0 }}</strong>
              </article>
              <article class="detail-card">
                <span>Permisos</span>
                <strong>{{ selectedRoleDetail()?.permissionCount ?? 0 }}</strong>
              </article>
              <article class="detail-card">
                <span>Creado</span>
                <strong>{{ formatDateLabel(selectedRoleDetail()?.createdAt) }}</strong>
              </article>
              <article class="detail-card detail-card--full">
                <span>PermissionIds</span>
                <strong>{{
                  selectedRoleDetail()?.permissionIds?.length
                    ? selectedRoleDetail()?.permissionIds?.join(', ')
                    : 'No disponible'
                }}</strong>
              </article>
            </div>
          }

          @if (selectedRoleDetail() && roleModalMode() === 'edit') {
            <form class="edit-form" [formGroup]="roleEditForm" (ngSubmit)="submitRoleUpdate()">
              <label class="edit-form__field">
                <span>Nombre</span>
                <input formControlName="name" />
              </label>
              <label class="edit-form__field edit-form__field--full">
                <span>Descripcion</span>
                <textarea rows="4" formControlName="description"></textarea>
              </label>
              <label class="edit-form__field edit-form__field--full">
                <span>PermissionIds</span>
                <input
                  formControlName="permissionIds"
                  placeholder="Separa los ids por coma"
                />
              </label>
              <label class="edit-form__checkbox">
                <input type="checkbox" formControlName="status" />
                <span>Rol activo</span>
              </label>

              <div class="modal__actions">
                <button
                  type="button"
                  class="button button--secondary"
                  (click)="closeRoleDetailModal()"
                >
                  Cancelar
                </button>
                <button type="submit" [disabled]="roleUpdateLoading()">
                  {{ roleUpdateLoading() ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </div>
            </form>
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

      .feedback--success {
        color: #15803d;
      }

      .table-wrapper {
        overflow-x: auto;
        border: 1px solid #dbe4f0;
        border-radius: 16px;
        background: #fff;
      }

      .resource-table {
        width: 100%;
        min-width: 920px;
        border-collapse: collapse;
      }

      .resource-table th,
      .resource-table td {
        padding: 0.9rem 1rem;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        vertical-align: top;
      }

      .resource-table th {
        background: #f8fafc;
        font-weight: 600;
      }

      .resource-table tbody tr:hover {
        background: #f8fbff;
      }

      .primary-cell {
        display: grid;
        gap: 0.35rem;
      }

      .primary-cell strong,
      .primary-cell span {
        margin: 0;
      }

      .primary-cell span {
        color: #64748b;
        font-size: 0.9rem;
      }

      .status {
        display: inline-flex;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        background: #dcfce7;
        color: #166534;
      }

      .status--inactive {
        background: #fee2e2;
        color: #991b1b;
      }

      .pagination,
      .pagination__actions {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .pagination {
        justify-content: space-between;
        margin-top: 1rem;
      }

      .pagination__size {
        display: grid;
        gap: 0.35rem;
        min-width: 140px;
      }

      .pagination__size select {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0.75rem 0.9rem;
        background: #fff;
      }

      .row-actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .button--secondary {
        background: #475569;
      }

      .button--danger {
        background: #b91c1c;
      }

      .button:disabled,
      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
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
        width: min(860px, 100%);
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
        width: 40px;
        height: 40px;
        padding: 0;
        border-radius: 999px;
        flex-shrink: 0;
      }

      .detail-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .detail-card {
        border: 1px solid #dbe4f0;
        border-radius: 16px;
        background: #f8fafc;
        padding: 1rem;
        display: grid;
        gap: 0.35rem;
      }

      .detail-card span {
        color: #475569;
      }

      .detail-card strong {
        font-size: 1rem;
        word-break: break-word;
      }

      .detail-card--full {
        grid-column: 1 / -1;
      }

      .edit-form {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .edit-form__field {
        display: grid;
        gap: 0.35rem;
      }

      .edit-form__field input,
      .edit-form__field textarea {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 0.8rem 0.9rem;
        background: #fff;
      }

      .edit-form__field--full {
        grid-column: 1 / -1;
      }

      .edit-form__checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .modal__actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        grid-column: 1 / -1;
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
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly payload = signal<unknown>(null);
  protected readonly usersListResult = signal<AuthUsersListResult | null>(null);
  protected readonly rolesListResult = signal<AuthRolesListResult | null>(null);
  protected readonly currentPageSignal = signal(1);
  protected readonly pageSizeSignal = signal(10);
  protected readonly isUserDetailModalOpen = signal(false);
  protected readonly userModalMode = signal<'view' | 'edit'>('view');
  protected readonly userDetailLoading = signal(false);
  protected readonly userDetailError = signal('');
  protected readonly userUpdateLoading = signal(false);
  protected readonly deleteLoadingId = signal('');
  protected readonly selectedUserId = signal('');
  protected readonly selectedUserName = signal('');
  protected readonly selectedUserDetail = signal<AuthUserDetail | null>(null);
  protected readonly isRoleDetailModalOpen = signal(false);
  protected readonly roleModalMode = signal<'view' | 'edit'>('view');
  protected readonly roleDetailLoading = signal(false);
  protected readonly roleDetailError = signal('');
  protected readonly roleUpdateLoading = signal(false);
  protected readonly roleDeleteLoadingId = signal('');
  protected readonly selectedRoleId = signal('');
  protected readonly selectedRoleName = signal('');
  protected readonly selectedRoleDetail = signal<AuthRoleDetail | null>(null);
  protected readonly userEditForm = this.fb.group({
    email: [''],
    name: [''],
    image: [''],
    phone: [''],
    userTypeId: [''],
    address: [''],
    additionalData: [''],
    roleIds: [''],
    status: [true],
  });
  protected readonly roleEditForm = this.fb.group({
    name: [''],
    description: [''],
    permissionIds: [''],
    status: [true],
  });

  protected readonly resource = computed<ResourceKind>(
    () => (this.route.snapshot.data['resource'] as ResourceKind) || 'users',
  );
  protected readonly users = computed<AuthUserSummary[]>(
    () => this.usersListResult()?.data ?? [],
  );
  protected readonly roles = computed<AuthRoleSummary[]>(
    () => this.rolesListResult()?.data ?? [],
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
    this.successMessage.set('');

    this.resolveRequest().subscribe({
      next: (payload) => {
        if (this.resource() === 'users') {
          this.usersListResult.set(payload as AuthUsersListResult);
          this.rolesListResult.set(null);
          this.payload.set(null);
        } else if (this.resource() === 'roles') {
          this.rolesListResult.set(payload as AuthRolesListResult);
          this.usersListResult.set(null);
          this.payload.set(null);
        } else {
          this.payload.set(payload);
        }

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

  protected currentPage(): number {
    if (this.resource() === 'roles') {
      return this.rolesListResult()?.currentPage || this.currentPageSignal();
    }

    return this.usersListResult()?.currentPage || this.currentPageSignal();
  }

  protected pageSize(): number {
    if (this.resource() === 'roles') {
      return this.rolesListResult()?.pageSize || this.pageSizeSignal();
    }

    return this.usersListResult()?.pageSize || this.pageSizeSignal();
  }

  protected totalRecords(): number {
    if (this.resource() === 'roles') {
      return this.rolesListResult()?.totalRecords || 0;
    }

    return this.usersListResult()?.totalRecords || 0;
  }

  protected totalPages(): number {
    if (this.resource() === 'roles') {
      return this.rolesListResult()?.totalPages || 1;
    }

    return this.usersListResult()?.totalPages || 1;
  }

  protected hasPreviousPage(): boolean {
    if (this.resource() === 'roles') {
      return this.rolesListResult()?.hasPreviousPage || false;
    }

    return this.usersListResult()?.hasPreviousPage || false;
  }

  protected hasNextPage(): boolean {
    if (this.resource() === 'roles') {
      return this.rolesListResult()?.hasNextPage || false;
    }

    return this.usersListResult()?.hasNextPage || false;
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

    const itemCount = this.resource() === 'roles' ? this.roles().length : this.users().length;
    return Math.min(this.visibleRangeStart() + itemCount - 1, this.totalRecords());
  }

  protected changePageSize(value: string): void {
    this.pageSizeSignal.set(Number(value) || 10);
    this.currentPageSignal.set(1);
    this.load();
  }

  protected goToPreviousPage(): void {
    if (!this.hasPreviousPage()) {
      return;
    }

    this.currentPageSignal.set(this.currentPage() - 1);
    this.load();
  }

  protected goToNextPage(): void {
    if (!this.hasNextPage()) {
      return;
    }

    this.currentPageSignal.set(this.currentPage() + 1);
    this.load();
  }

  protected handleUserAction(
    action: 'ver' | 'actualizar' | 'eliminar',
    user: AuthUserSummary,
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (action === 'ver') {
      this.openUserModal(user, 'view');
      return;
    }

    if (action === 'actualizar') {
      this.openUserModal(user, 'edit');
      return;
    }

    this.deleteUser(user);
  }

  protected handleRoleAction(
    action: 'ver' | 'actualizar' | 'eliminar',
    role: AuthRoleSummary,
  ): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (action === 'ver') {
      this.openRoleModal(role, 'view');
      return;
    }

    if (action === 'actualizar') {
      this.openRoleModal(role, 'edit');
      return;
    }

    this.deleteRole(role);
  }

  protected closeUserDetailModal(): void {
    this.isUserDetailModalOpen.set(false);
    this.userModalMode.set('view');
    this.userDetailLoading.set(false);
    this.userUpdateLoading.set(false);
    this.userDetailError.set('');
    this.selectedUserId.set('');
    this.selectedUserName.set('');
    this.selectedUserDetail.set(null);
    this.userEditForm.reset({
      email: '',
      name: '',
      image: '',
      phone: '',
      userTypeId: '',
      address: '',
      additionalData: '',
      roleIds: '',
      status: true,
    });
  }

  protected closeRoleDetailModal(): void {
    this.isRoleDetailModalOpen.set(false);
    this.roleModalMode.set('view');
    this.roleDetailLoading.set(false);
    this.roleUpdateLoading.set(false);
    this.roleDetailError.set('');
    this.selectedRoleId.set('');
    this.selectedRoleName.set('');
    this.selectedRoleDetail.set(null);
    this.roleEditForm.reset({
      name: '',
      description: '',
      permissionIds: '',
      status: true,
    });
  }

  protected formatDateLabel(value?: string | null): string {
    if (!value) {
      return 'No disponible';
    }

    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
      return value;
    }

    return parsedValue.toLocaleString('es-CO');
  }

  protected submitUserUpdate(): void {
    const selectedUserId = this.selectedUserId();

    if (!selectedUserId) {
      this.userDetailError.set('No hay un usuario seleccionado para actualizar.');
      return;
    }

    const payload = this.buildUserUpdatePayload();

    if (!payload) {
      return;
    }

    this.userUpdateLoading.set(true);
    this.userDetailError.set('');

    this.authService.updateUser(selectedUserId, payload).subscribe({
      next: () => {
        this.successMessage.set('Usuario actualizado correctamente.');
        this.userUpdateLoading.set(false);
        this.closeUserDetailModal();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.userDetailError.set(
          error.error?.detail || error.error?.title || 'No fue posible actualizar el usuario.',
        );
        this.userUpdateLoading.set(false);
      },
    });
  }

  protected submitRoleUpdate(): void {
    const selectedRoleId = this.selectedRoleId();

    if (!selectedRoleId) {
      this.roleDetailError.set('No hay un rol seleccionado para actualizar.');
      return;
    }

    const payload = this.buildRoleUpdatePayload();
    this.roleUpdateLoading.set(true);
    this.roleDetailError.set('');

    this.authService.updateRole(selectedRoleId, payload).subscribe({
      next: () => {
        this.successMessage.set('Rol actualizado correctamente.');
        this.roleUpdateLoading.set(false);
        this.closeRoleDetailModal();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.roleDetailError.set(
          error.error?.detail || error.error?.title || 'No fue posible actualizar el rol.',
        );
        this.roleUpdateLoading.set(false);
      },
    });
  }

  private openUserModal(
    user: AuthUserSummary,
    mode: 'view' | 'edit',
  ): void {
    this.selectedUserId.set(user.id);
    this.selectedUserName.set(user.name);
    this.selectedUserDetail.set(null);
    this.userDetailError.set('');
    this.userModalMode.set(mode);
    this.isUserDetailModalOpen.set(true);
    this.loadUserDetail(user.id);
  }

  private loadUserDetail(userId: string): void {
    this.userDetailLoading.set(true);

    this.authService.getUserById(userId).subscribe({
      next: (user) => {
        this.selectedUserDetail.set(user);
        this.patchUserEditForm(user);
        this.userDetailLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.userDetailError.set(
          error.error?.detail || error.error?.title || 'No fue posible consultar el usuario.',
        );
        this.selectedUserDetail.set(null);
        this.userDetailLoading.set(false);
      },
    });
  }

  private openRoleModal(
    role: AuthRoleSummary,
    mode: 'view' | 'edit',
  ): void {
    this.selectedRoleId.set(role.id);
    this.selectedRoleName.set(role.name);
    this.selectedRoleDetail.set(null);
    this.roleDetailError.set('');
    this.roleModalMode.set(mode);
    this.isRoleDetailModalOpen.set(true);
    this.loadRoleDetail(role.id);
  }

  private loadRoleDetail(roleId: string): void {
    this.roleDetailLoading.set(true);

    this.authService.getRoleById(roleId).subscribe({
      next: (role) => {
        this.selectedRoleDetail.set(role);
        this.patchRoleEditForm(role);
        this.roleDetailLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.roleDetailError.set(
          error.error?.detail || error.error?.title || 'No fue posible consultar el rol.',
        );
        this.selectedRoleDetail.set(null);
        this.roleDetailLoading.set(false);
      },
    });
  }

  private patchUserEditForm(user: AuthUserDetail): void {
    this.userEditForm.reset({
      email: user.email ?? '',
      name: user.name ?? '',
      image: user.image ?? '',
      phone: user.phone ?? '',
      userTypeId: user.userTypeId ?? '',
      address: user.address ?? '',
      additionalData:
        user.additionalData !== undefined && user.additionalData !== null
          ? JSON.stringify(user.additionalData, null, 2)
          : '',
      roleIds: Array.isArray(user.roleIds) ? user.roleIds.join(', ') : '',
      status: user.status ?? true,
    });
  }

  private patchRoleEditForm(role: AuthRoleDetail): void {
    this.roleEditForm.reset({
      name: role.name ?? '',
      description: role.description ?? '',
      permissionIds: Array.isArray(role.permissionIds) ? role.permissionIds.join(', ') : '',
      status: role.status ?? true,
    });
  }

  private buildUserUpdatePayload(): UpdateAuthUserRequest | null {
    const rawValue = this.userEditForm.getRawValue();
    let additionalData: unknown | null = null;

    if (rawValue.additionalData.trim()) {
      try {
        additionalData = JSON.parse(rawValue.additionalData);
      } catch {
        this.userDetailError.set('AdditionalData debe ser un JSON valido.');
        return null;
      }
    }

    const roleIds = rawValue.roleIds
      .split(',')
      .map((item) => item.trim())
      .filter((item) => !!item);

    return {
      email: this.toNullableString(rawValue.email),
      name: this.toNullableString(rawValue.name),
      image: this.toNullableString(rawValue.image),
      phone: this.toNullableString(rawValue.phone),
      userTypeId: this.toNullableString(rawValue.userTypeId),
      address: this.toNullableString(rawValue.address),
      additionalData,
      roleIds: roleIds.length > 0 ? roleIds : null,
      status: rawValue.status,
    };
  }

  private buildRoleUpdatePayload(): UpdateAuthRoleRequest {
    const rawValue = this.roleEditForm.getRawValue();
    const permissionIds = rawValue.permissionIds
      .split(',')
      .map((item) => item.trim())
      .filter((item) => !!item);

    return {
      name: rawValue.name.trim(),
      description: this.toNullableString(rawValue.description),
      status: rawValue.status,
      permissionIds: permissionIds.length > 0 ? permissionIds : null,
    };
  }

  private deleteUser(user: AuthUserSummary): void {
    const shouldDelete = window.confirm(
      `¿Seguro que deseas eliminar al usuario "${user.name}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    this.deleteLoadingId.set(user.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.deleteUser(user.id).subscribe({
      next: () => {
        this.successMessage.set('Usuario eliminado correctamente.');
        this.deleteLoadingId.set('');
        this.closeUserDetailModal();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.detail || error.error?.title || 'No fue posible eliminar el usuario.',
        );
        this.deleteLoadingId.set('');
      },
    });
  }

  private deleteRole(role: AuthRoleSummary): void {
    const shouldDelete = window.confirm(
      `¿Seguro que deseas eliminar el rol "${role.name}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    this.roleDeleteLoadingId.set(role.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.deleteRole(role.id).subscribe({
      next: () => {
        this.successMessage.set('Rol eliminado correctamente.');
        this.roleDeleteLoadingId.set('');
        this.closeRoleDetailModal();
        this.load();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.error?.detail || error.error?.title || 'No fue posible eliminar el rol.',
        );
        this.roleDeleteLoadingId.set('');
      },
    });
  }

  private toNullableString(value: string): string | null {
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
  }

  private resolveRequest() {
    if (this.resource() === 'roles') {
      return this.authService.getRoles(this.currentPageSignal(), this.pageSizeSignal());
    }

    if (this.resource() === 'permissions') {
      return this.authService.getPermissions({ Page: 1, PageSize: 10 });
    }

    return this.authService.getUsers(this.currentPageSignal(), this.pageSizeSignal());
  }
}
