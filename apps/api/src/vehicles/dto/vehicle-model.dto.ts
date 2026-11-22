import { IsString, IsOptional, IsBoolean, IsInt, IsUrl } from 'class-validator';

export class CreateVehicleModelDto {
  @IsString() slug: string;
  @IsString() name: string;
  @IsOptional() @IsUrl() imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateVehicleModelDto extends CreateVehicleModelDto {}
