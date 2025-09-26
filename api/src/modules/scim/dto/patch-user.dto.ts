import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class PatchOperationDto {
  @IsString()
  op!: string;

  @IsOptional()
  @IsString()
  path?: string;

  value?: unknown;
}

export class PatchUserDto {
  @IsArray()
  @ArrayNotEmpty()
  schemas!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PatchOperationDto)
  Operations!: PatchOperationDto[];
}
