import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';

export class AdjustStockDto {
  @IsInt() quantity: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsEnum(['IN', 'OUT', 'ADJUSTMENT']) type?: 'IN' | 'OUT' | 'ADJUSTMENT';
}
