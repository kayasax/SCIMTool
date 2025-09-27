import { Module } from '@nestjs/common';
import { ActivityParserService } from './activity-parser.service';
import { ActivityController } from './activity.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityController],
  providers: [ActivityParserService],
  exports: [ActivityParserService],
})
export class ActivityParserModule {}