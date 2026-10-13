import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { SearchingType } from '../searching/searching.model';
import { randomUserAgent } from '../common/user-agents';

/** Base URL of the appointment calendar. */
const CALENDAR_BASE = 'https://appointment.mosaicvisa.com/calendar';

/** Maps each searching type to its calendar id on the site. */
const CALENDAR_IDS: Record<SearchingType, number> = {
  [SearchingType.USUAL]: 11,
  [SearchingType.VIP]: 12,
  [SearchingType.STUDENT]: 20,
};

/** A single available appointment day found on a calendar. */
export interface AvailableSlot {
  /** Appointment type this slot belongs to. */
  type: SearchingType;
  /** ISO date (YYYY-MM-DD) taken from the row's `data-date`. */
  date: string;
  /** Remaining capacity (`data-remaining`), always > 0 for returned slots. */
  remaining: number;
}

/** One calendar page to fetch: a type + a specific month. */
interface CalendarTarget {
  type: SearchingType;
  /** Month string, e.g. `2026-08`. */
  month: string;
  url: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  /**
   * Public link to the calendar page for a given type and ISO date, pointing at
   * the right month so the notification opens straight on the bookable slot.
   */
  calendarUrlFor(type: SearchingType, isoDate: string): string {
    const month = isoDate.slice(0, 7); // YYYY-MM
    return `${CALENDAR_BASE}/${CALENDAR_IDS[type]}?month=${month}`;
  }

  /**
   * Build the full set of pages to fetch: every type × the current month and
   * the next month (max one month ahead), i.e. 3 types × 2 months = 6 pages.
   */
  buildTargets(now: Date = new Date()): CalendarTarget[] {
    const months = [this.monthString(now, 0), this.monthString(now, 1)];
    const targets: CalendarTarget[] = [];
    for (const type of Object.values(SearchingType)) {
      const id = CALENDAR_IDS[type];
      for (const month of months) {
        targets.push({
          type,
          month,
          url: `${CALENDAR_BASE}/${id}?month=${month}`,
        });
      }
    }
    return targets;
  }

  /**
   * Fetch all 6 calendar pages over HTTP, parse each slot table and return
   * every day that is Available with remaining > 0. Pages are fetched in
   * parallel; a failure on one page doesn't abort the others.
   */
  async scrapeAvailableSlots(now: Date = new Date()): Promise<AvailableSlot[]> {
    const targets = this.buildTargets(now);

    const results = await Promise.all(
      targets.map(async (target) => {
        try {
          return await this.scrapeTarget(target);
        } catch (err) {
          this.logger.error(
            `Failed to scrape ${target.url}: ${(err as Error).message}`,
          );
          return [] as AvailableSlot[];
        }
      }),
    );

    return results.flat();
  }

  /** GET one calendar page (retrying once with a fresh UA) and parse it. */
  private async scrapeTarget(target: CalendarTarget): Promise<AvailableSlot[]> {
    try {
      return await this.fetchAndParse(target);
    } catch (err) {
      this.logger.warn(
        `Retrying ${target.url} after error: ${(err as Error).message}`,
      );
      return this.fetchAndParse(target);
    }
  }

  /** Download the page HTML with a random User-Agent and extract the slots. */
  private async fetchAndParse(
    target: CalendarTarget,
  ): Promise<AvailableSlot[]> {
    const { data: html } = await axios.get<string>(target.url, {
      timeout: 30_000,
      responseType: 'text',
      headers: {
        'User-Agent': randomUserAgent(),
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const $ = cheerio.load(html);
    const slots: AvailableSlot[] = [];

    $('tr.calendar-dates').each((_, el) => {
      const row = $(el);
      const date = row.attr('data-date') ?? '';
      const remaining = Number.parseInt(row.attr('data-remaining') ?? '0', 10);
      // The status cell reads "Available" / "Reserved" (or is empty).
      const available = /available/i.test(row.text());
      if (date && available && remaining > 0) {
        slots.push({ type: target.type, date, remaining });
      }
    });

    if (slots.length > 0) {
      this.logger.log(
        `${target.type} ${target.month}: ${slots.length} available day(s) ` +
          `(${slots.map((s) => `${s.date}×${s.remaining}`).join(', ')})`,
      );
    }

    return slots;
  }

  /** `YYYY-MM` for `now` shifted by `monthOffset` months. */
  private monthString(now: Date, monthOffset: number): string {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
    );
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
