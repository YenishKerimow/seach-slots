import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { randomUserAgent } from '../common/user-agents';
import { FoundFlight } from '../ticket-searching/ticket-searching.model';
import { parseFlights } from './flight-parser';

const SEARCH_BASE = 'https://turkmenistanairlinestr.com/en-US/SearchResult';
const ORIGIN = 'ASB';
const DESTINATION = 'IST';
/** One-way, 1 adult — fixed tail of the search URL. */
const SEARCH_SUFFIX = '-/0/0/1/0/0/1';

/** HTTP client for the Turkmenistan Airlines one-way search page. */
@Injectable()
export class AirlineClient {
  /** Search page URL for an ISO date, e.g. `…/ASB/IST/15.11.2026/-/0/0/1/0/0/1`. */
  searchUrl(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    return `${SEARCH_BASE}/${ORIGIN}/${DESTINATION}/${day}.${month}.${year}/${SEARCH_SUFFIX}`;
  }

  get route(): string {
    return `${ORIGIN} → ${DESTINATION}`;
  }

  /** Fetch the search page for a day (fresh random User-Agent) and parse it. */
  async fetchFlights(isoDate: string): Promise<FoundFlight[]> {
    const { data: html } = await axios.get<string>(this.searchUrl(isoDate), {
      timeout: 30_000,
      responseType: 'text',
      headers: {
        'User-Agent': randomUserAgent(),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    return parseFlights(html, isoDate);
  }
}
