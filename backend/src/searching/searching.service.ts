import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchingInput } from './dto/create-searching.input';
import { SearchingStatus, SearchingType } from './searching.model';

@Injectable()
export class SearchingService {
  private readonly logger = new Logger(SearchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.searching.findMany({ orderBy: { date: 'asc' } });
  }

  async findOne(id: string) {
    const searching = await this.prisma.searching.findUnique({ where: { id } });
    if (!searching) {
      throw new NotFoundException(`Searching ${id} not found`);
    }
    return searching;
  }

  /**
   * Expand a date range into one Searching row per day (inclusive) and persist
   * them all in a single transaction.
   */
  async create(input: CreateSearchingInput) {
    const days = this.eachDay(input.dates.from, input.dates.to);
    const type = input.type ?? SearchingType.USUAL;

    const created = await this.prisma.$transaction(
      days.map((date) =>
        this.prisma.searching.create({ data: { date, type } }),
      ),
    );

    this.logger.log(
      `Created ${created.length} searching(s) of type ${type} for range ` +
        `${input.dates.from.toISOString().slice(0, 10)}..${input.dates.to
          .toISOString()
          .slice(0, 10)}`,
    );

    return created;
  }

  /** Update just the status of a searching (used by the admin panel). */
  async updateStatus(id: string, status: SearchingStatus) {
    await this.findOne(id);
    return this.prisma.searching.update({ where: { id }, data: { status } });
  }

  remove(id: string) {
    return this.prisma.searching.delete({ where: { id } });
  }

  /** Delete many searchings at once; returns how many rows were removed. */
  async removeMany(ids: string[]): Promise<number> {
    const { count } = await this.prisma.searching.deleteMany({
      where: { id: { in: ids } },
    });
    this.logger.log(`Removed ${count} searching(s)`);
    return count;
  }

  /** Returns each UTC calendar day between `from` and `to`, inclusive. */
  private eachDay(from: Date, to: Date): Date[] {
    const start = this.toUtcMidnight(from);
    const end = this.toUtcMidnight(to);
    if (end < start) {
      throw new Error('`to` date must not be earlier than `from` date');
    }

    const days: Date[] = [];
    for (
      let cursor = start;
      cursor <= end;
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
    ) {
      days.push(new Date(cursor));
    }
    return days;
  }

  private toUtcMidnight(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
