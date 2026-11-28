import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

/** The web form sends empty strings for fields left blank; treat those as "not provided". */
const blankToUndefined = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value));

export class WholesaleItemDto {
  @blankToUndefined() @IsOptional() @IsString() @MaxLength(200) productName?: string;
  @blankToUndefined() @IsOptional() @IsString() @MaxLength(64) partCode?: string;
  @blankToUndefined() @IsOptional() @IsUUID() modelId?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100_000) quantity: number;
  @blankToUndefined() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

/** Public form for businesses asking for a wholesale quotation. */
export class CreateWholesaleRequestDto {
  @IsString() @MinLength(2) @MaxLength(120) businessName: string;
  @IsString() @MinLength(2) @MaxLength(80) contactPerson: string;
  @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'phone must be a valid phone number' }) phone: string;
  @blankToUndefined() @IsOptional() @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'whatsapp must be a valid phone number' }) whatsapp?: string;
  @blankToUndefined() @IsOptional() @IsEmail() @MaxLength(120) email?: string;
  @blankToUndefined() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @blankToUndefined() @IsOptional() @IsString() @MaxLength(80) businessType?: string;
  @blankToUndefined() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => WholesaleItemDto) items: WholesaleItemDto[];
}

export const WHOLESALE_STATUSES = ['NEW', 'CONTACTED', 'QUOTATION_SENT', 'NEGOTIATION', 'APPROVED', 'REJECTED', 'CLOSED'] as const;

import { IsIn, IsNumber } from 'class-validator';

export class UpdateWholesaleStatusDto {
  @IsIn(WHOLESALE_STATUSES) status: (typeof WHOLESALE_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

export class AddWholesaleNoteDto {
  @IsString() @MinLength(1) @MaxLength(2000) note: string;
}

export class AddWholesaleQuotationDto {
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000) amount?: number;
  @IsOptional() @IsString() @MaxLength(4000) details?: string;
}
