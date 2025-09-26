import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class GroupMemberDto {
  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  display?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateGroupDto {
  @IsArray()
  @ArrayNotEmpty()
  schemas!: string[];

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupMemberDto)
  members?: GroupMemberDto[];

  [key: string]: unknown;
}
