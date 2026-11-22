import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.systemSetting.findMany(); }
  async get(key: string) {
    const s = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!s) throw new NotFoundException('Setting not found');
    return s;
  }
  async set(key: string, value: any, userId?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedBy: userId },
      create: { key, value, updatedBy: userId },
    });
  }
}
