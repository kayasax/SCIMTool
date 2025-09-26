import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsArray()
  @ArrayNotEmpty()
  schemas!: string[];

  @IsString()
  userName!: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  [key: string]: unknown;
}
