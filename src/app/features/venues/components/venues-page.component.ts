import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { PageSectionComponent } from '../../../shared/components/page-section.component';

@Component({
  selector: 'app-venues-page',
  standalone: true,
  imports: [CommonModule, PageSectionComponent],
  template: `
    <div class="page">
      <app-page-section
        title="Lugares"
        description="Referencia funcional para venues dentro del contrato actual."
      >
        <p class="text">
          El contrato LiveEvents.Api.Events | v1 no expone endpoints para crear,
          listar o actualizar lugares. Solo utiliza venueId dentro de
          CreateEventDto y en los filtros de GET /Api/Events.
        </p>
        <p class="text">
          Mientras el backend no publique /Api/Venues o un recurso similar,
          el flujo recomendado es usar el UUID del lugar al crear o filtrar
          eventos.
        </p>
      </app-page-section>

      <app-page-section
        title="Impacto en el front"
        description="Ajustes realizados para respetar el contrato."
      >
        <ul class="list">
          <li>El formulario de eventos ahora pide venueId como UUID.</li>
          <li>El filtro de eventos por venue usa VenueId del contrato.</li>
          <li>No se simula un CRUD de lugares que la API no soporta.</li>
        </ul>
      </app-page-section>
    </div>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 1.5rem;
      }

      .text {
        margin: 0;
      }

      .list {
        margin: 0;
        padding-left: 1.1rem;
      }
    `,
  ],
})
export class VenuesPageComponent {}
