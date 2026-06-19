import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStoreService } from './features/auth/services/auth-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header class="shell__header">
        <div>
          <p class="shell__eyebrow">Eventos Vivos</p>
          <h1>Front de reservas y eventos</h1>
          <p class="shell__description">
            Base Angular con Feature Driven Architecture para integrar
            autenticacion, eventos y reservas.
          </p>
        </div>

        <div class="shell__actions">
          <nav class="shell__nav">
            @if (authStore.isAuthenticated()) {
              @for (item of authStore.menuItems(); track item.route) {
                <a [routerLink]="item.route" routerLinkActive="is-active">
                  {{ item.label }}
                </a>
              }

              <div class="shell__user">
                <strong>{{ authStore.user()?.name }}</strong>
                <small>{{ authStore.user()?.email }}</small>
              </div>

              <div class="profile-menu">
                <button
                  type="button"
                  class="profile-menu__trigger"
                  (click)="toggleProfileMenu()"
                  aria-label="Abrir menu de perfil"
                >
                  <span class="profile-menu__avatar">
                    {{ getUserInitials() }}
                  </span>
                </button>

                @if (isProfileMenuOpen()) {
                  <div class="profile-menu__panel">
                    <a
                      routerLink="/auth/me"
                      routerLinkActive="is-active"
                      (click)="closeProfileMenu()"
                    >
                      Mi perfil
                    </a>
                    <button type="button" (click)="logout()">Cerrar sesion</button>
                  </div>
                }
              </div>
            }
          </nav>
        </div>
      </header>

      <main class="shell__content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
      }

      .shell__header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: end;
        padding: 2rem 3rem 1rem;
        background: linear-gradient(135deg, #0f172a, #1d4ed8);
        color: #fff;
      }

      .shell__eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.75rem;
        margin: 0 0 0.25rem;
        opacity: 0.8;
      }

      h1 {
        margin: 0;
      }

      .shell__description {
        margin: 0.5rem 0 0;
        max-width: 42rem;
        color: rgba(255, 255, 255, 0.82);
      }

      .shell__actions {
        display: flex;
        align-items: end;
        gap: 0.75rem;
      }

      .shell__nav {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: center;
      }

      .shell__user {
        display: grid;
        gap: 0.2rem;
        padding: 0 0.25rem;
      }

      .shell__user small {
        color: rgba(255, 255, 255, 0.78);
        font-size: 0.82rem;
      }

      .shell__nav a,
      .profile-menu__trigger,
      .profile-menu__panel button {
        padding: 0.75rem 1rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        border: none;
        cursor: pointer;
      }

      .profile-menu {
        position: relative;
      }

      .profile-menu__trigger {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem;
        width: 52px;
        height: 52px;
      }

      .profile-menu__avatar {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
        font-weight: 700;
        font-size: 0.95rem;
      }

      .profile-menu__panel {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        min-width: 200px;
        padding: 0.5rem;
        display: grid;
        gap: 0.35rem;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
      }

      .profile-menu__panel a,
      .profile-menu__panel button {
        background: #f1f5f9;
        color: #0f172a;
        text-align: left;
      }

      .profile-menu__panel button {
        font: inherit;
      }

      .shell__nav a.is-active {
        background: #fff;
        color: #0f172a;
        font-weight: 600;
      }

      .shell__content {
        padding: 2rem 3rem 3rem;
      }

      @media (max-width: 768px) {
        .shell__header,
        .shell__content {
          padding: 1.25rem;
        }

        .shell__header {
          align-items: start;
          flex-direction: column;
        }

        .shell__actions {
          align-items: start;
        }

        .shell__nav {
          align-items: start;
        }

        .profile-menu__panel {
          left: 0;
          right: auto;
        }
      }
    `,
  ],
})
export class AppComponent {
  readonly authStore = inject(AuthStoreService);
  readonly isProfileMenuOpen = signal(false);

  constructor() {
    this.authStore.initialize();
  }

  protected toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((value) => !value);
  }

  protected closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  protected logout(): void {
    this.closeProfileMenu();
    this.authStore.logout();
  }

  protected getUserInitials(): string {
    const name = this.authStore.user()?.name?.trim() ?? '';

    if (!name) {
      return 'U';
    }

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
