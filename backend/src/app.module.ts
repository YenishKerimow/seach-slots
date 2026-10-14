import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SearchingModule } from './searching/searching.module';
import { ScraperModule } from './scraper/scraper.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { TicketSearchingModule } from './ticket-searching/ticket-searching.module';
import { TicketScraperModule } from './ticket-scraper/ticket-scraper.module';

@Module({
  imports: [
    // Load the backend-local .env first, then fall back to the repo-root .env
    // (which holds shared values like BOT_TOKEN / TELEGRAM_CHAT_ID).
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    PrismaModule,
    SearchingModule,
    ScraperModule,
    SchedulerModule,
    TicketSearchingModule,
    TicketScraperModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
