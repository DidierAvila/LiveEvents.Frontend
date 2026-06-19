import { Routes } from '@angular/router';

import { EventFormPageComponent } from './components/event-form-page.component';
import { EventsListPageComponent } from './components/events-list-page.component';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    component: EventsListPageComponent,
  },
  {
    path: 'new',
    component: EventFormPageComponent,
  },
];
