import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section">
      <header class="section__header">
        <div>
          <h2>{{ title() }}</h2>
          @if (description()) {
            <p>{{ description() }}</p>
          }
        </div>
      </header>

      <div class="section__content">
        <ng-content />
      </div>
    </section>
  `,
  styles: [
    `
      .section {
        background: #fff;
        border: 1px solid #dbe4f0;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
      }

      .section__header {
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0;
        font-size: 1.25rem;
      }

      p {
        margin: 0.35rem 0 0;
        color: #64748b;
      }
    `,
  ],
})
export class PageSectionComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
