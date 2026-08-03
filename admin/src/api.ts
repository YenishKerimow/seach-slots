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
