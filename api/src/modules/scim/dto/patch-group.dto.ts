import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { PatchOperationDto } from './patch-user.dto';

export class PatchGroupDto {
  @IsArray()
  @ArrayNotEmpty()
  schemas!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PatchOperationDto)
  Operations!: PatchOperationDto[];
}
