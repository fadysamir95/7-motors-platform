import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleModelDto, UpdateVehicleModelDto } from './dto/vehicle-model.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.vehicleModel.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { generations: true },
    });
  }

  async get(id: string) {
    const m = await this.prisma.vehicleModel.findUnique({
      where: { id },
      include: { generations: true, variants: true },
    });
    if (!m) throw new NotFoundException('Vehicle model not found');
    return m;
  }

  create(dto: CreateVehicleModelDto) {
    return this.prisma.vehicleModel.create({ data: dto });
  }

  async update(id: string, dto: UpdateVehicleModelDto) {
    await this.get(id);
    return this.prisma.vehicleModel.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.vehicleModel.delete({ where: { id } });
  }
}
