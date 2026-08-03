import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal Telegram Bot API client. Sends notifications to a single configured
 * chat. Reads `BOT_TOKEN` and `TELEGRAM_CHAT_ID` from the environment; if either
 * is missing the service degrades gracefully (logs a warning, no throw) so the
 * scraper keeps running even before the token is filled in.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token?: string;
  private readonly chatId?: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('BOT_TOKEN')?.trim() || undefined;
    this.chatId =
      this.config.get<string>('TELEGRAM_CHAT_ID')?.trim() || undefined;
  }

  /** Whether the bot is configured well enough to actually send messages. */
  get enabled(): boolean {
    return Boolean(this.token && this.chatId);
  }

  /** Send a plain-text message to the configured chat. Never throws. */
  async sendMessage(text: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(
        'Telegram not configured (BOT_TOKEN / TELEGRAM_CHAT_ID missing); ' +
          `skipping message: ${text}`,
      );
      return;
    }

    this.logger.debug(`Sending Telegram message: ${text}, ${this.token}`);
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(
          `Telegram sendMessage failed (${res.status}): ${body}`,
        );
      }
    } catch (err) {
      this.logger.error('Telegram sendMessage error', err as Error);
    }
  }
}
