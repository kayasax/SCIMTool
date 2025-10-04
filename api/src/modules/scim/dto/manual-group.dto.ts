import { IsArray, IsOptional, IsString } from 'class-validator';

export class ManualGroupDto {
  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  scimId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
