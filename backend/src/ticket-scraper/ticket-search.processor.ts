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
  ACTIVE_TICKET_STATUSES,
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
 * Checks one TicketSearching against the airline site. A searching keeps being
 * checked after it is FOUND (until the user cancels or deletes it):
 * - matching flights -> FOUND, `foundFlights` is replaced with the current set
 *   and Telegram is notified on every check;
 * - no matching flights -> back to INPROGRESS (tickets sold out).
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
    // Canceled / deleted / expired since the job was queued.
    if (
      !searching ||
      !ACTIVE_TICKET_STATUSES.includes(
        searching.status as TicketSearchingStatus,
      )
    ) {
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

    // Only touch it while still active — the admin may have canceled it while
    // we were fetching.
    const now = new Date();
    const { count } = await this.prisma.ticketSearching.updateMany({
      where: { id: searchingId, status: { in: ACTIVE_TICKET_STATUSES } },
      data: {
        lastCheckedAt: now,
        checksCount: { increment: 1 },
        lastError: null,
        ...(matches.length > 0
          ? {
              status: TicketSearchingStatus.FOUND,
              foundFlights: matches as unknown as Prisma.InputJsonValue,
              foundAt: searching.foundAt ?? now,
            }
          : {
              status: TicketSearchingStatus.INPROGRESS,
              foundFlights: Prisma.DbNull,
              foundAt: null,
            }),
      },
    });
    if (count === 0) {
      return;
    }

    if (matches.length === 0) {
      if (searching.status === TicketSearchingStatus.FOUND) {
        this.logger.log(
          `Ticket searching ${searchingId} (${date}) -> INPROGRESS: tickets gone`,
        );
      }
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
