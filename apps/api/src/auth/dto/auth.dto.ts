import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() @MaxLength(254)
  email: string;

  // Existing accounts may have short passwords, so only an upper bound is enforced when signing in.
  @IsString() @MinLength(1) @MaxLength(128)
  password: string;
}

export class RegisterDto {
  @IsEmail() @MaxLength(254)
  email: string;

  /** At least 10 characters; bcrypt only reads the first 72 bytes, so longer is rejected instead of silently cut. */
  @IsString() @MinLength(10) @MaxLength(72)
  password: string;

  @IsOptional() @IsString() @MaxLength(80)
  firstName?: string;

  @IsOptional() @IsString() @MaxLength(80)
  lastName?: string;

  @IsOptional() @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;
}
