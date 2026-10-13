export const TICKET_SEARCH_QUEUE = 'ticket-search';
export const TICKET_SEARCH_JOB = 'search';
/** How many searchings the worker checks against the airline site at once. */
export const TICKET_SEARCH_CONCURRENCY = 50;

export interface TicketSearchJobData {
  searchingId: string;
}
