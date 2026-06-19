export type EventType = 1 | 2 | 3;
export type EventStatus = 0 | 1 | 2;

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  venueId: string;
  venueName?: string;
  maxCapacity: number;
  startsAt: string;
  endsAt: string;
  ticketPrice: number;
  type: EventType;
  status?: EventStatus;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  venueId: string;
  maxCapacity: number;
  startsAt: string;
  endsAt: string;
  ticketPrice: number;
  type: EventType;
}

export interface EventFilters {
  search?: string;
  type?: string;
  startsFrom?: string;
  startsTo?: string;
  venueId?: string;
  status?: string;
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDescending?: string;
}

export interface EventListResult {
  items: EventSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OccupationReport {
  eventId?: string;
  eventTitle?: string;
  confirmedTickets?: number;
  availableTickets?: number;
  occupancyPercentage?: number;
  occupationPercentage?: number;
  totalRevenue?: number;
  status?: string;
}

export interface VenueDropdownOption {
  id: string;
  name: string;
}
