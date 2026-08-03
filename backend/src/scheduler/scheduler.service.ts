import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ScraperService, AvailableSlot } from '../scraper/scraper.service';
import { TelegramService } from '../telegram/telegram.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { SearchingStatus, SearchingType } from '../searching/searching.model';

/** Business labels for each type (kept in sync with the admin UI). */
const TYPE_LABELS: Record<SearchingType, string> = {
  [SearchingType.USUAL]: 'ASHGABAT',
  [SearchingType.VIP]: 'ASHGABAT VIP',
  [SearchingType.STUDENT]: 'ASHGABAT STUDENT',
};

/**
 * Background worker. Every 30 seconds it reuses (or opens) a headless Chrome,
 * keeps the 6 calendar tabs open, scrapes the available appointment days and
 * closes out any matching INPROGRESS searching — marking it done and notifying
 * Telegram.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: ScraperService,
    private readonly telegram: TelegramService,
    private readonly notifications: NotificationsGateway,
  ) {}

  /** Every 30 seconds: scrape the calendars and resolve matching searchings. */
  @Cron('*/30 * * * * *', { name: 'scrape-slots' })
  async tick() {
    // Guard against overlapping runs if a scrape takes longer than 30s.
    if (this.running) {
      this.logger.debug('Previous scrape still running, skipping tick');
      return;
    }
    this.running = true;
    try {
      const slots = await this.scraper.scrapeAvailableSlots();
      if (slots.length === 0) {
        return;
      }
      await this.resolveMatches(slots);
    } catch (err) {
      this.logger.error('Scrape tick failed', err as Error);
    } finally {
      this.running = false;
    }
  }

  /**
   * For every open (INPROGRESS) searching whose type+date matches an available
   * slot, mark it done and send a Telegram notification.
   */
  private async resolveMatches(slots: AvailableSlot[]) {
    const pending = await this.prisma.searching.findMany({
      where: { status: SearchingStatus.INPROGRESS },
    });
    if (pending.length === 0) {
      return;
    }

    // Index available slots by `TYPE|YYYY-MM-DD` for O(1) lookups.
    const byKey = new Map<string, AvailableSlot>();
    for (const slot of slots) {
      byKey.set(`${slot.type}|${slot.date}`, slot);
    }

    for (const searching of pending) {
      const dateIso = searching.date.toISOString().slice(0, 10);
      const slot = byKey.get(`${searching.type}|${dateIso}`);
      if (!slot) {
        continue;
      }

      await this.prisma.searching.update({
        where: { id: searching.id },
        data: { status: SearchingStatus.FOUND },
      });
      this.logger.log(
        `Searching ${searching.id} (${searching.type} ${dateIso}) -> FOUND`,
      );

      const type = searching.type as SearchingType;
      const typeLabel = TYPE_LABELS[type];
      const url = this.scraper.calendarUrlFor(type, dateIso);

      // Push a real-time event to connected browsers for a web notification.
      this.notifications.emitSlotFound({
        id: searching.id,
        type: searching.type,
        typeLabel,
        date: dateIso,
        remaining: slot.remaining,
        url,
      });

      await this.telegram.sendMessage(
        `✅ <b>Свободный слот найден!</b>\n` +
          `Тип: <b>${typeLabel}</b>\n` +
          `Дата: <b>${dateIso}</b>\n` +
          `Свободно мест: <b>${slot.remaining}</b>\n` +
          `<a href="${url}">Открыть страницу слотов</a>`,
      );
    }
  }
}
