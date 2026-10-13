import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { eachDay, isoDay } from '../common/dates';
import { CreateTicketSearchingInput } from './dto/create-ticket-searching.input';
import { TicketClass, TicketSearchingStatus } from './ticket-searching.model';

@Injectable()
export class TicketSearchingService {
  private readonly logger = new Logger(TicketSearchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.ticketSearching.findMany({ orderBy: { date: 'asc' } });
  }

  async findOne(id: string) {
    const searching = await this.prisma.ticketSearching.findUnique({
      where: { id },
    });
    if (!searching) {
      throw new NotFoundException(`Ticket searching ${id} not found`);
    }
    return searching;
  }

  /** Expand a date range into one TicketSearching per day (inclusive). */
  async create(input: CreateTicketSearchingInput) {
    const days = eachDay(input.dates.from, input.dates.to);
    const ticketClass = input.ticketClass ?? TicketClass.BOTH;

    const created = await this.prisma.$transaction(
      days.map((date) =>
        this.prisma.ticketSearching.create({ data: { date, ticketClass } }),
      ),
    );

    this.logger.log(
      `Created ${created.length} ticket searching(s) of class ${ticketClass} ` +
        `for range ${isoDay(days[0])}..${isoDay(days[days.length - 1])}`,
    );

    return created;
  }

  /**
   * Change status from the admin panel. Resuming (back to INPROGRESS) clears
   * the previous result so the searching starts from scratch.
   */
  async updateStatus(id: string, status: TicketSearchingStatus) {
    await this.findOne(id);
    const reset: Prisma.TicketSearchingUpdateInput =
      status === TicketSearchingStatus.INPROGRESS
        ? { foundFlights: Prisma.DbNull, foundAt: null, lastError: null }
        : {};
    return this.prisma.ticketSearching.update({
      where: { id },
      data: { status, ...reset },
    });
  }

  /** Change which cabin class the searching is looking for. */
  async updateClass(id: string, ticketClass: TicketClass) {
    await this.findOne(id);
    return this.prisma.ticketSearching.update({
      where: { id },
      data: { ticketClass },
    });
  }

  remove(id: string) {
    return this.prisma.ticketSearching.delete({ where: { id } });
  }

  async removeMany(ids: string[]): Promise<number> {
    const { count } = await this.prisma.ticketSearching.deleteMany({
      where: { id: { in: ids } },
    });
    this.logger.log(`Removed ${count} ticket searching(s)`);
    return count;
  }
}
