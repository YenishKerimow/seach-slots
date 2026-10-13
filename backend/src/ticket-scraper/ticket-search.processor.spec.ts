import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  CabinClass,
  FoundFlight,
  TicketClass,
  TicketSearchingStatus,
} from '../ticket-searching/ticket-searching.model';
import { AirlineClient } from './airline.client';
import { TicketSearchProcessor } from './ticket-search.processor';
import { TicketSearchJobData } from './ticket-scraper.constants';

const flight = (cabinClass: CabinClass, date = '2026-12-15'): FoundFlight => ({
  flightNumber: 'T5911',
  cabinClass,
  date,
  departureTime: '05:05',
  arrivalTime: '07:10',
});

describe('TicketSearchProcessor', () => {
  let prisma: {
    ticketSearching: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let airline: { fetchFlights: jest.Mock; searchUrl: jest.Mock; route: string };
  let telegram: { sendMessage: jest.Mock };
  let processor: TicketSearchProcessor;

  const job = { data: { searchingId: 's1' } } as Job<TicketSearchJobData>;

  const givenSearching = (
    ticketClass: TicketClass,
    status = TicketSearchingStatus.INPROGRESS,
  ) =>
    prisma.ticketSearching.findUnique.mockResolvedValue({
      id: 's1',
      status,
      ticketClass,
      date: new Date('2026-12-15T00:00:00.000Z'),
    });

  beforeEach(() => {
    prisma = {
      ticketSearching: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    airline = {
      fetchFlights: jest.fn(),
      searchUrl: jest.fn().mockReturnValue('https://example/search'),
      route: 'ASB → IST',
    };
    telegram = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    processor = new TicketSearchProcessor(
      prisma as unknown as PrismaService,
      airline as unknown as AirlineClient,
      telegram as unknown as TelegramService,
    );
  });

  it('marks FOUND with only the flights matching the class and notifies', async () => {
    givenSearching(TicketClass.ECONOMY);
    airline.fetchFlights.mockResolvedValue([
      flight(CabinClass.ECONOMY),
      flight(CabinClass.BUSINESS),
    ]);

    await processor.process(job);

    expect(airline.fetchFlights).toHaveBeenCalledWith('2026-12-15');
    expect(prisma.ticketSearching.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1', status: TicketSearchingStatus.INPROGRESS },
        data: expect.objectContaining({
          status: TicketSearchingStatus.FOUND,
          foundFlights: [flight(CabinClass.ECONOMY)],
        }),
      }),
    );
    expect(telegram.sendMessage).toHaveBeenCalledTimes(1);
    expect(telegram.sendMessage.mock.calls[0][0]).toContain('T5911');
  });

  it('only records the check when nothing matches', async () => {
    givenSearching(TicketClass.BUSINESS);
    airline.fetchFlights.mockResolvedValue([
      flight(CabinClass.ECONOMY),
      flight(CabinClass.BUSINESS, '2026-12-16'),
    ]);

    await processor.process(job);

    expect(prisma.ticketSearching.updateMany).not.toHaveBeenCalled();
    expect(prisma.ticketSearching.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ checksCount: { increment: 1 } }),
      }),
    );
    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('does not notify if the searching was closed while fetching', async () => {
    givenSearching(TicketClass.BOTH);
    airline.fetchFlights.mockResolvedValue([flight(CabinClass.BUSINESS)]);
    prisma.ticketSearching.updateMany.mockResolvedValue({ count: 0 });

    await processor.process(job);

    expect(telegram.sendMessage).not.toHaveBeenCalled();
  });

  it('skips searchings that are no longer in progress', async () => {
    givenSearching(TicketClass.BOTH, TicketSearchingStatus.CANCELED);

    await processor.process(job);

    expect(airline.fetchFlights).not.toHaveBeenCalled();
  });

  it('stores the error and rethrows so BullMQ retries', async () => {
    givenSearching(TicketClass.BOTH);
    airline.fetchFlights.mockRejectedValue(new Error('timeout'));

    await expect(processor.process(job)).rejects.toThrow('timeout');
    expect(prisma.ticketSearching.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastError: 'timeout' }),
      }),
    );
  });
});
