import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductTranslationDto {
  @IsString() locale: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
}

export class CompatibilityDto {
  @IsString() modelId: string;
  @IsArray() @IsInt({ each: true }) years: number[];
}

export class CreateProductDto {
  @IsString() sku: string;
  @IsOptional() @IsString() partCode?: string;
  @IsOptional() @IsString() oemReference?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() countryOfOrigin?: string;
  @IsOptional() @IsString() brand?: string;
  @IsNumber() price: number;
  @IsOptional() @IsNumber() salePrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductTranslationDto) translations?: ProductTranslationDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CompatibilityDto) compatibility?: CompatibilityDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class UpdateProductDto extends CreateProductDto {}
