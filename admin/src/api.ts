import { gql } from '@apollo/client';

export type SearchingType = 'USUAL' | 'VIP' | 'STUDENT';
export type SearchingStatus = 'INPROGRESS' | 'FOUND' | 'CANCELED';

export interface Searching {
  id: string;
  status: SearchingStatus;
  type: SearchingType;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const TYPES: SearchingType[] = ['USUAL', 'VIP', 'STUDENT'];
export const STATUSES: SearchingStatus[] = ['INPROGRESS', 'FOUND', 'CANCELED'];

export const STATUS_LABELS: Record<SearchingStatus, string> = {
  INPROGRESS: 'В процессе',
  FOUND: 'Найдено',
  CANCELED: 'Отменено',
};

export const TYPE_LABELS: Record<SearchingType, string> = {
  USUAL: 'ASHGABAT',
  VIP: 'ASHGABAT VIP',
  STUDENT: 'ASHGABAT STUDENT',
};

export const SEARCHINGS = gql`
  query Searchings {
    searchings {
      id
      status
      type
      date
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_SEARCHINGS = gql`
  mutation CreateSearchings($input: CreateSearchingInput!) {
    createSearchings(input: $input) {
      id
    }
  }
`;

export const UPDATE_STATUS = gql`
  mutation UpdateSearchingStatus($id: ID!, $status: SearchingStatus!) {
    updateSearchingStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

export const REMOVE_SEARCHING = gql`
  mutation RemoveSearching($id: ID!) {
    removeSearching(id: $id) {
      id
    }
  }
`;

export const REMOVE_SEARCHINGS = gql`
  mutation RemoveSearchings($ids: [ID!]!) {
    removeSearchings(ids: $ids)
  }
`;

/** Format an ISO date as `01 авг. 2026`. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format an ISO datetime as a short local date+time. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------- Ticket searchings (ASB → IST flights) ----------

export type TicketClass = 'ECONOMY' | 'BUSINESS' | 'BOTH';
export type CabinClass = 'ECONOMY' | 'BUSINESS';
export type TicketSearchingStatus =
  | 'INPROGRESS'
  | 'FOUND'
  | 'NOT_FOUND'
  | 'CANCELED';

export interface FoundFlight {
  flightNumber: string;
  cabinClass: CabinClass;
  date: string;
  departureTime: string;
  arrivalTime: string;
}

export interface TicketSearching {
  id: string;
  status: TicketSearchingStatus;
  ticketClass: TicketClass;
  date: string;
  foundFlights: FoundFlight[] | null;
  foundAt: string | null;
  lastCheckedAt: string | null;
  checksCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export const TICKET_CLASSES: TicketClass[] = ['BOTH', 'ECONOMY', 'BUSINESS'];
export const TICKET_STATUSES: TicketSearchingStatus[] = [
  'INPROGRESS',
  'FOUND',
  'NOT_FOUND',
  'CANCELED',
];

export const TICKET_CLASS_LABELS: Record<TicketClass, string> = {
  ECONOMY: 'Эконом',
  BUSINESS: 'Бизнес',
  BOTH: 'Эконом и бизнес',
};

export const CABIN_LABELS: Record<CabinClass, string> = {
  ECONOMY: 'Эконом',
  BUSINESS: 'Бизнес',
};

export const TICKET_STATUS_LABELS: Record<TicketSearchingStatus, string> = {
  INPROGRESS: 'В процессе',
  FOUND: 'Найдено',
  NOT_FOUND: 'Не найдено',
  CANCELED: 'Отменено',
};

export const TICKET_SEARCHINGS = gql`
  query TicketSearchings {
    ticketSearchings {
      id
      status
      ticketClass
      date
      foundFlights {
        flightNumber
        cabinClass
        date
        departureTime
        arrivalTime
      }
      foundAt
      lastCheckedAt
      checksCount
      lastError
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_TICKET_SEARCHINGS = gql`
  mutation CreateTicketSearchings($input: CreateTicketSearchingInput!) {
    createTicketSearchings(input: $input) {
      id
    }
  }
`;

export const UPDATE_TICKET_STATUS = gql`
  mutation UpdateTicketSearchingStatus(
    $id: ID!
    $status: TicketSearchingStatus!
  ) {
    updateTicketSearchingStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

export const UPDATE_TICKET_CLASS = gql`
  mutation UpdateTicketSearchingClass($id: ID!, $ticketClass: TicketClass!) {
    updateTicketSearchingClass(id: $id, ticketClass: $ticketClass) {
      id
      ticketClass
      updatedAt
    }
  }
`;

export const REMOVE_TICKET_SEARCHING = gql`
  mutation RemoveTicketSearching($id: ID!) {
    removeTicketSearching(id: $id) {
      id
    }
  }
`;

export const REMOVE_TICKET_SEARCHINGS = gql`
  mutation RemoveTicketSearchings($ids: [ID!]!) {
    removeTicketSearchings(ids: $ids)
  }
`;
