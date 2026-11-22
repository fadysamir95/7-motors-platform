import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WholesaleService } from './wholesale.service';
import { WholesaleController } from './wholesale.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WholesaleController],
  providers: [WholesaleService],
  exports: [WholesaleService],
})
export class WholesaleModule {}
