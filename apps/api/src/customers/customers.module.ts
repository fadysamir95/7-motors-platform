import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomersService } from './customers.service';

@Module({
  imports: [PrismaModule],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
