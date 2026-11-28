import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

/** A customer asking the team to source a spare part that is not in the catalog. */
export class CreatePartsRequestDto {
  @IsString() @MinLength(2) @MaxLength(80)
  fullName: string;

  @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone: string;

  @IsString() @MinLength(2) @MaxLength(120)
  partName: string;

  @IsOptional() @IsUUID()
  modelId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99)
  quantity?: number;

  @IsOptional() @IsEmail() @MaxLength(120)
  email?: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}
