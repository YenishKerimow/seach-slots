import * as cheerio from 'cheerio';
import {
  CabinClass,
  FoundFlight,
  TicketClass,
} from '../ticket-searching/ticket-searching.model';

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/**
 * Parse every `div.result-box` on a Turkmenistan Airlines search result page.
 * The site renders one box per fare, so the same flight appears several times
 * with different prices — those are merged into one offer per
 * flight + departure + cabin (price is ignored). "Opportunity Flight" fares
 * have an empty cabin label and count as Economy; any other fare without a
 * cabin class is skipped.
 *
 * @param searchDate ISO date (YYYY-MM-DD) the page was requested for; supplies
 *   the year (the page only shows "15 November Sunday") and is the fallback
 *   when the box has no readable date.
 */
export function parseFlights(html: string, searchDate: string): FoundFlight[] {
  const $ = cheerio.load(html);
  const unique = new Map<string, FoundFlight>();

  $('div.result-box').each((_, el) => {
    const box = $(el);

    const times = box.find('.result-box-main-row h2');
    const departureTime = times.first().text().trim();
    const arrivalTime = times.last().text().trim();

    // The cabin label sits next to the baggage allowance: "Economy",
    // "Business" or (for "Opportunity Flight" fares) empty. Opportunity
    // Flight fares count as Economy.
    const cabinClass =
      toCabinClass(
        box
          .find('.result-box-main-row i.ti-luggage')
          .first()
          .closest('.result-box-col')
          .children('span')
          .not('.half-opacity')
          .first()
          .text(),
      ) ??
      (/opportunity flight/i.test(box.find('.chance-notice').text())
        ? CabinClass.ECONOMY
        : null);
    if (!cabinClass) {
      return;
    }

    const numbers = box
      .find('.result-box-detail-title span')
      // "Turkmenistan - T5901" (sometimes just "Turkmenistan - 911").
      .map((_, s) => /-\s*(\S+)\s*$/.exec($(s).text().trim())?.[1])
      .get()
      .filter(Boolean);
    const flightNumber = [...new Set(numbers)].join('+') || 'UNKNOWN';

    const dateText = box.find('.time-description h3 span').first().text();

    const flight: FoundFlight = {
      flightNumber,
      cabinClass,
      date: parseDayMonth(dateText, searchDate) ?? searchDate,
      departureTime,
      arrivalTime,
    };

    const key = flightKey(flight);
    if (!unique.has(key)) {
      unique.set(key, flight);
    }
  });

  return [...unique.values()];
}

/** Identity of a flight offer: same flight, departure and cabin = same offer. */
export function flightKey(flight: FoundFlight): string {
  return [
    flight.date,
    flight.flightNumber,
    flight.departureTime,
    flight.cabinClass,
  ].join('|');
}

/** Whether a flight's cabin satisfies the class a searching is looking for. */
export function matchesClass(cabin: CabinClass, wanted: TicketClass): boolean {
  return wanted === TicketClass.BOTH || (cabin as string) === wanted;
}

/** "Economy" / "Business" label -> cabin; anything else (empty) -> null. */
function toCabinClass(label: string): CabinClass | null {
  if (/business/i.test(label)) return CabinClass.BUSINESS;
  if (/economy/i.test(label)) return CabinClass.ECONOMY;
  return null;
}

/**
 * "15 November Sunday - Aşkabat, Ashgabad" -> "2026-11-15", taking the year
 * from `searchDate` (rolling over when the month wraps around New Year).
 */
function parseDayMonth(text: string, searchDate: string): string | null {
  const match = /(\d{1,2})\s+([A-Za-z]+)/.exec(text);
  if (!match) {
    return null;
  }
  const month = MONTHS.indexOf(match[2].toLowerCase());
  if (month < 0) {
    return null;
  }

  const searchYear = Number(searchDate.slice(0, 4));
  const searchMonth = Number(searchDate.slice(5, 7)) - 1;
  let year = searchYear;
  if (month - searchMonth > 6) year -= 1;
  if (searchMonth - month > 6) year += 1;

  const day = Number(match[1]);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
