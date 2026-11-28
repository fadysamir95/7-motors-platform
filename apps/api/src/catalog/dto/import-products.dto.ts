import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_YEAR, MIN_YEAR } from './product.dto';

export const IMPORT_MAX_ROWS = 500;

/** Request body of POST /products/import. Rows are validated one by one, so one bad row never blocks the others. */
export class ImportProductsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(IMPORT_MAX_ROWS) @IsObject({ each: true })
  rows: Record<string, unknown>[];

  /** Validate and report what would happen without writing anything. */
  @IsOptional() @IsBoolean()
  dryRun?: boolean;
}

/** One CSV row. Values arrive as text from the file, hence the conversions. */
export class ImportRowDto {
  @IsString() @MinLength(1) @MaxLength(64) sku: string;
  @IsOptional() @IsString() @MaxLength(200) nameAr?: string;
  @IsOptional() @IsString() @MaxLength(200) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(2000) descAr?: string;
  @IsOptional() @IsString() @MaxLength(2000) descEn?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) price: number;
  @IsOptional() @IsString() @MaxLength(64) partCode?: string;
  @IsOptional() @IsString() @MaxLength(64) oemReference?: string;
  @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @IsOptional() @IsString() @MaxLength(60) countryOfOrigin?: string;
  /** Category slug. */
  @IsOptional() @IsString() @MaxLength(64) category?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) stock?: number;
  /** Vehicle model slugs separated by | (for example "logan|sandero"). */
  @IsOptional() @IsString() @Matches(/^[a-z0-9\-|,; ]*$/i, { message: 'models must be model slugs separated by |' }) models?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(MIN_YEAR) @Max(MAX_YEAR) yearFrom?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(MIN_YEAR) @Max(MAX_YEAR) yearTo?: number;
}
