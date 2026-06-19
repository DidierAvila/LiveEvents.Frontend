export type ReservationStatus =
  | 'PendientePago'
  | 'Confirmada'
  | 'Cancelada'
  | 'Perdida'
  | 'pendiente_pago'
  | 'confirmada'
  | 'cancelada'
  | 'perdida';

export interface ReservationSummary {
  id: string;
  eventId: string;
  eventTitle?: string;
  eventStartsAt?: string;
  venueName?: string;
  quantity: number;
  status?: ReservationStatus;
  reservationCode?: string;
  createdAt?: string;
  paidAt?: string;
  cancelledAt?: string;
}

export interface CreateReservationRequest {
  eventId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
}

export interface ReservationEventOption {
  id: string;
  name: string;
  startsAt?: string;
  availableTickets?: number;
}

export interface ReservationListResult {
  data: ReservationSummary[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  sortBy?: string | null;
}

export interface ReservationActionResult {
  action: 'create' | 'confirm' | 'cancel';
  reservationId?: string;
  message: string;
}
