import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { LoggingService } from './logging.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [
    LoggingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor
    }
  ],
  exports: [LoggingService]
})
export class LoggingModule {}
