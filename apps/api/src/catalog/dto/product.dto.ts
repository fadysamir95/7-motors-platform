import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Photos are stored as links: an absolute http(s) URL, or a path served by the web app (e.g. /images/...). */
export const IMAGE_URL_PATTERN = /^(https?:\/\/|\/(?!\/))\S+$/;
export const MIN_YEAR = 1980;
export const MAX_YEAR = 2100;

export class ProductTranslationDto {
  @IsIn(['ar', 'en']) locale: string;
  @IsString() @MinLength(1) @MaxLength(200) name: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class CompatibilityDto {
  @IsUUID() modelId: string;
  @IsArray()
  @ArrayMaxSize(80)
  @IsInt({ each: true })
  @Min(MIN_YEAR, { each: true })
  @Max(MAX_YEAR, { each: true })
  years: number[];
}

export class CreateProductDto {
  @IsString() @MinLength(1) @MaxLength(64) sku: string;
  @IsOptional() @IsString() @MaxLength(64) partCode?: string;
  @IsOptional() @IsString() @MaxLength(64) oemReference?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(60) countryOfOrigin?: string;
  @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) price: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) salePrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(2) @ValidateNested({ each: true }) @Type(() => ProductTranslationDto) translations?: ProductTranslationDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CompatibilityDto) compatibility?: CompatibilityDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(10) @Matches(IMAGE_URL_PATTERN, { each: true, message: 'each image must be an http(s) URL or a /path' }) @MaxLength(500, { each: true }) images?: string[];
  /** Opening stock for a new product. Later changes go through POST /inventory/:productId/adjust. */
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) stock?: number;
}

/** Partial update: send only what changes. Stock is not editable here (use the inventory adjustment endpoint). */
export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(64) sku?: string;
  @IsOptional() @IsString() @MaxLength(64) partCode?: string;
  @IsOptional() @IsString() @MaxLength(64) oemReference?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(60) countryOfOrigin?: string;
  @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) price?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000) salePrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(2) @ValidateNested({ each: true }) @Type(() => ProductTranslationDto) translations?: ProductTranslationDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CompatibilityDto) compatibility?: CompatibilityDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(10) @Matches(IMAGE_URL_PATTERN, { each: true, message: 'each image must be an http(s) URL or a /path' }) @MaxLength(500, { each: true }) images?: string[];
}

export class AdminProductsQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsIn(['active', 'inactive', 'unpublished']) status?: 'active' | 'inactive' | 'unpublished';
  @IsOptional() @IsIn(['true']) lowStock?: 'true';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

/** Public catalog query. Page size is capped and sorting is limited to safe columns. */
export class ProductsQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() modelId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(MIN_YEAR) @Max(MAX_YEAR) year?: number;
  @IsOptional() @IsString() @MaxLength(60) brand?: string;
  @IsOptional() @IsString() @MaxLength(60) countryOfOrigin?: string;
  @IsOptional() @IsIn(['true', 'false']) available?: 'true' | 'false';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsIn(['createdAt', 'updatedAt', 'price']) sortBy?: 'createdAt' | 'updatedAt' | 'price';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: 'asc' | 'desc';
}
