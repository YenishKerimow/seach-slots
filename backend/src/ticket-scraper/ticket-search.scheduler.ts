import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { todayInAshgabat } from '../common/dates';
import { TicketSearchingStatus } from '../ticket-searching/ticket-searching.model';
import {
  ACTIVE_TICKET_STATUSES,
  TICKET_SEARCH_JOB,
  TICKET_SEARCH_QUEUE,
  TicketSearchJobData,
} from './ticket-scraper.constants';

@Injectable()
export class TicketSearchScheduler {
  private readonly logger = new Logger(TicketSearchScheduler.name);
  private enqueuing = false;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(TICKET_SEARCH_QUEUE)
    private readonly queue: Queue<TicketSearchJobData>,
  ) {}

  /**
   * Every 30 seconds: queue one job per active (INPROGRESS or FOUND, not yet
   * past) searching. The searching id is the job id, so a day that is still waiting
   * or being checked is not queued twice.
   */
  @Cron('*/30 * * * * *', { name: 'enqueue-ticket-searches' })
  async enqueue() {
    if (this.enqueuing) {
      return;
    }
    this.enqueuing = true;
    try {
      const pending = await this.prisma.ticketSearching.findMany({
        where: {
          status: { in: ACTIVE_TICKET_STATUSES },
          date: { gte: todayInAshgabat() },
        },
        select: { id: true },
      });
      if (pending.length === 0) {
        return;
      }

      await this.queue.addBulk(
        pending.map(({ id }) => ({
          name: TICKET_SEARCH_JOB,
          data: { searchingId: id },
          opts: {
            jobId: id,
            attempts: 2,
            backoff: { type: 'fixed', delay: 5_000 },
            // Free the job id once done so the next tick can queue it again.
            removeOnComplete: true,
            removeOnFail: true,
          },
        })),
      );
      this.logger.debug(`Queued ${pending.length} ticket searching(s)`);
    } catch (err) {
      this.logger.error('Failed to enqueue ticket searches', err as Error);
    } finally {
      this.enqueuing = false;
    }
  }

  /** Close searchings whose flight day has passed without a match. */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'expire-ticket-searches' })
  async expire() {
    try {
      const { count } = await this.prisma.ticketSearching.updateMany({
        where: {
          status: TicketSearchingStatus.INPROGRESS,
          date: { lt: todayInAshgabat() },
        },
        data: { status: TicketSearchingStatus.NOT_FOUND },
      });
      if (count > 0) {
        this.logger.log(`Marked ${count} past ticket searching(s) NOT_FOUND`);
      }
    } catch (err) {
      this.logger.error('Failed to expire ticket searches', err as Error);
    }
  }
}
