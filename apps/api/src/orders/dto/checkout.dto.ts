import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';

export class CheckoutDto {
  @IsEnum(['CASH', 'CARD']) paymentMethod: 'CASH' | 'CARD';
  @IsEnum(['DELIVERY', 'PICKUP']) fulfillmentMethod: 'DELIVERY' | 'PICKUP';
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() guestName?: string;
  @IsOptional() @IsString() guestPhone?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
  @IsOptional() @IsString() sessionId?: string;
}
