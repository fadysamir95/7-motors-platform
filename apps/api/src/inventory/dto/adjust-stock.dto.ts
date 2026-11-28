import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AdjustStockDto {
  /** IN and OUT take a positive number of units; ADJUSTMENT takes a signed correction (never 0). */
  @IsInt() @Min(-1_000_000) @Max(1_000_000) quantity: number;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @IsEnum(['IN', 'OUT', 'ADJUSTMENT']) type?: 'IN' | 'OUT' | 'ADJUSTMENT';
}
