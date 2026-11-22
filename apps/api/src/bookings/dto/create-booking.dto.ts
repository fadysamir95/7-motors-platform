import { IsString, IsOptional, IsInt, IsArray, IsEnum, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsString() fullName: string;
  @IsString() phone: string;
  @IsString() licenseNumber: string;
  @IsOptional() @IsString() modelId?: string;
  @IsOptional() @IsString() variantId?: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsInt() vehicleYear?: number;
  @IsArray() @IsString({ each: true }) serviceTypeIds: string[];
  @IsString() date: string; // YYYY-MM-DD
  @IsString() startTime: string; // HH:mm
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() orderId?: string;
}
