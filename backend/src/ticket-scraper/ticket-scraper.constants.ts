import { TicketSearchingStatus } from '../ticket-searching/ticket-searching.model';

export const TICKET_SEARCH_QUEUE = 'ticket-search';
export const TICKET_SEARCH_JOB = 'search';
/** How many searchings the worker checks against the airline site at once. */
export const TICKET_SEARCH_CONCURRENCY = 50;

export interface TicketSearchJobData {
  searchingId: string;
}

/**
 * Statuses that keep being checked: a FOUND searching is still re-checked
 * until the user cancels or deletes it.
 */
export const ACTIVE_TICKET_STATUSES = [
  TicketSearchingStatus.INPROGRESS,
  TicketSearchingStatus.FOUND,
];
