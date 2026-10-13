import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { isoDay } from '../common/dates';
import {
  CabinClass,
  FoundFlight,
  TicketClass,
  TicketSearchingStatus,
} from '../ticket-searching/ticket-searching.model';
import { AirlineClient } from './airline.client';
import { matchesClass } from './flight-parser';
import {
  TICKET_SEARCH_CONCURRENCY,
  TICKET_SEARCH_QUEUE,
  TicketSearchJobData,
} from './ticket-scraper.constants';

const CLASS_LABELS: Record<TicketClass, string> = {
  [TicketClass.ECONOMY]: 'Эконом',
  [TicketClass.BUSINESS]: 'Бизнес',
  [TicketClass.BOTH]: 'Эконом и бизнес',
};

const CABIN_LABELS: Record<CabinClass, string> = {
  [CabinClass.ECONOMY]: 'Эконом',
  [CabinClass.BUSINESS]: 'Бизнес',
};

/**
 * Checks one TicketSearching against the airline site. On a match the
 * searching is marked FOUND (with the matching flights) and Telegram is
 * notified; otherwise only the check bookkeeping is updated.
 */
@Processor(TICKET_SEARCH_QUEUE, { concurrency: TICKET_SEARCH_CONCURRENCY })
export class TicketSearchProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketSearchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly airline: AirlineClient,
    private readonly telegram: TelegramService,
  ) {
    super();
  }

  async process(job: Job<TicketSearchJobData>): Promise<void> {
    const { searchingId } = job.data;
    const searching = await this.prisma.ticketSearching.findUnique({
      where: { id: searchingId },
    });
    // Canceled / deleted / already resolved since the job was queued.
    if (!searching || searching.status !== TicketSearchingStatus.INPROGRESS) {
      return;
    }

    const date = isoDay(searching.date);
    const ticketClass = searching.ticketClass as TicketClass;

    let flights: FoundFlight[];
    try {
      flights = await this.airline.fetchFlights(date);
    } catch (err) {
      await this.prisma.ticketSearching.update({
        where: { id: searchingId },
        data: {
          lastCheckedAt: new Date(),
          checksCount: { increment: 1 },
          lastError: (err as Error).message,
        },
      });
      throw err;
    }

    const matches = flights.filter(
      (f) => f.date === date && matchesClass(f.cabinClass, ticketClass),
    );

    if (matches.length === 0) {
      await this.prisma.ticketSearching.update({
        where: { id: searchingId },
        data: {
          lastCheckedAt: new Date(),
          checksCount: { increment: 1 },
          lastError: null,
        },
      });
      return;
    }

    // Only resolve if still INPROGRESS — the admin may have canceled it or
    // changed it while we were fetching.
    const now = new Date();
    const { count } = await this.prisma.ticketSearching.updateMany({
      where: { id: searchingId, status: TicketSearchingStatus.INPROGRESS },
      data: {
        status: TicketSearchingStatus.FOUND,
        foundFlights: matches as unknown as Prisma.InputJsonValue,
        foundAt: now,
        lastCheckedAt: now,
        checksCount: { increment: 1 },
        lastError: null,
      },
    });
    if (count === 0) {
      return;
    }

    this.logger.log(
      `Ticket searching ${searchingId} (${date} ${ticketClass}) -> FOUND: ` +
        matches.map((f) => `${f.flightNumber} ${f.cabinClass}`).join(', '),
    );

    const lines = matches.map(
      (f) =>
        `• <b>${f.flightNumber}</b> ${f.departureTime} → ${f.arrivalTime} · ` +
        CABIN_LABELS[f.cabinClass],
    );
    await this.telegram.sendMessage(
      `✈️ <b>Найдены билеты!</b>\n` +
        `Маршрут: <b>${this.airline.route}</b>\n` +
        `Дата: <b>${date}</b>\n` +
        `Класс поиска: <b>${CLASS_LABELS[ticketClass]}</b>\n` +
        `${lines.join('\n')}\n` +
        `<a href="${this.airline.searchUrl(date)}">Открыть страницу поиска</a>`,
    );
  }
}
