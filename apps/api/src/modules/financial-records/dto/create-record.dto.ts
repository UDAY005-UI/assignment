import { RecordType } from '@repo/database';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecordDto {
  @IsNumber()
  @Type(() => Number)
  amount!: number;

  @IsEnum(RecordType)
  type!: RecordType;

  @IsString()
  categoryId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
