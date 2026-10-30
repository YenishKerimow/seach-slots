import {
  CabinClass,
  TicketClass,
} from '../ticket-searching/ticket-searching.model';
import { matchesClass, parseFlights } from './flight-parser';

/** Minimal copy of one `result-box` as rendered by the airline site. */
function box(opts: {
  flight: string;
  dep: string;
  arr: string;
  cabin: string;
  price: string;
  day?: string;
  opportunity?: boolean;
}): string {
  return `
  <div class="search-result-list-row">
    <div class="result-box">
      <div class="result-box-info">
        <div class="result-box-main-col">
          <div class="result-box-main-row">
            <div class="result-box-col mobile-reverse">
              <span class="half-opacity">ASB</span><h2>${opts.dep}</h2>
            </div>
            <div class="result-box-col double-size center-style">
              <span class="half-opacity">Direct</span>
            </div>
            <div class="result-box-col mobile-reverse">
              <span class="half-opacity">IST</span><h2>${opts.arr}</h2>
            </div>
            <div class="result-box-col">
              <span class="half-opacity"><i class="ti ti-luggage"></i> 23 KG</span>
              <span>${opts.cabin}</span>
            </div>
          </div>
        </div>
        <div class="result-box-col select-button with-price">
          <h2 data-defaultprice="${opts.price}">${opts.price}</h2>
          ${opts.opportunity ? '<button class="btn btn-sm btn-orange chance-notice"><i class="ti ti-info-circle"></i>Opportunity Flight</button>' : ''}
        </div>
      </div>
      <div class="result-box-detail">
        <div class="result-box-detail-title"><span>Turkmenistan - ${opts.flight}</span></div>
        <div class="time-description">
          <h3><b>${opts.dep}</b><span>${opts.day ?? '15 December Tuesday'} - Aşkabat, Ashgabad</span></h3>
          <h3><b>${opts.arr}</b><span>${opts.day ?? '15 December Tuesday'} - İstanbul</span></h3>
        </div>
        <div class="other-description">
          <h3><i class="ti ti-luggage"></i><b>Baggage:</b><span>23 KG</span></h3>
        </div>
      </div>
    </div>
  </div>`;
}

describe('parseFlights', () => {
  it('merges fares that differ only by price', () => {
    const html = [
      box({
        flight: 'T5911',
        dep: '04:35',
        arr: '06:55',
        cabin: 'Economy',
        price: '375,00 $',
      }),
      box({
        flight: 'T5911',
        dep: '04:35',
        arr: '06:55',
        cabin: 'Economy',
        price: '429,00 $',
      }),
      box({
        flight: 'T5911',
        dep: '04:35',
        arr: '06:55',
        cabin: 'Business',
        price: '560,00 $',
      }),
      box({
        flight: 'T5911',
        dep: '04:35',
        arr: '06:55',
        cabin: 'Business',
        price: '651,00 $',
      }),
      box({
        flight: 'T5921',
        dep: '07:30',
        arr: '09:35',
        cabin: 'Economy',
        price: '375,00 $',
      }),
    ].join('');

    expect(parseFlights(html, '2026-12-15')).toEqual([
      {
        flightNumber: 'T5911',
        cabinClass: CabinClass.ECONOMY,
        date: '2026-12-15',
        departureTime: '04:35',
        arrivalTime: '06:55',
      },
      {
        flightNumber: 'T5911',
        cabinClass: CabinClass.BUSINESS,
        date: '2026-12-15',
        departureTime: '04:35',
        arrivalTime: '06:55',
      },
      {
        flightNumber: 'T5921',
        cabinClass: CabinClass.ECONOMY,
        date: '2026-12-15',
        departureTime: '07:30',
        arrivalTime: '09:35',
      },
    ]);
  });

  it('treats Opportunity Flight fares (empty cabin label) as Economy', () => {
    const html = box({
      flight: '931',
      dep: '13:10',
      arr: '15:15',
      cabin: '',
      price: '594,00 $',
      opportunity: true,
    });

    expect(parseFlights(html, '2026-12-15')).toEqual([
      {
        flightNumber: '931',
        cabinClass: CabinClass.ECONOMY,
        date: '2026-12-15',
        departureTime: '13:10',
        arrivalTime: '15:15',
      },
    ]);
  });

  it('skips other fares without a cabin class', () => {
    const html = [
      box({
        flight: '931',
        dep: '13:10',
        arr: '15:15',
        cabin: '',
        price: '594,00 $',
      }),
      box({
        flight: 'T5921',
        dep: '19:10',
        arr: '21:15',
        cabin: 'Economy',
        price: '375,00 $',
      }),
    ].join('');

    expect(parseFlights(html, '2026-12-15')).toEqual([
      {
        flightNumber: 'T5921',
        cabinClass: CabinClass.ECONOMY,
        date: '2026-12-15',
        departureTime: '19:10',
        arrivalTime: '21:15',
      },
    ]);
  });

  it('reads the departure date from the box, rolling the year over New Year', () => {
    const html = box({
      flight: 'T5901',
      dep: '23:50',
      arr: '02:00',
      cabin: 'Economy',
      price: '1 $',
      day: '1 January Friday',
    });
    expect(parseFlights(html, '2026-12-31')[0].date).toBe('2027-01-01');
  });

  it('returns nothing when the page has no result boxes', () => {
    expect(
      parseFlights('<html><body>No flights</body></html>', '2026-12-15'),
    ).toEqual([]);
  });
});

describe('matchesClass', () => {
  it.each([
    [CabinClass.ECONOMY, TicketClass.ECONOMY, true],
    [CabinClass.BUSINESS, TicketClass.ECONOMY, false],
    [CabinClass.BUSINESS, TicketClass.BUSINESS, true],
    [CabinClass.ECONOMY, TicketClass.BUSINESS, false],
    [CabinClass.ECONOMY, TicketClass.BOTH, true],
    [CabinClass.BUSINESS, TicketClass.BOTH, true],
  ])('%s vs %s -> %s', (cabin, wanted, expected) => {
    expect(matchesClass(cabin, wanted)).toBe(expected);
  });
});
