import { RecordType } from '@repo/database';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export class FilterRecordsDto {
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
