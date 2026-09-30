import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FOLLOWUP_STATUSES } from '../followup.schema.js';
import type { FollowupStatus } from '../followup.schema.js';

export class CreateFollowupDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(FOLLOWUP_STATUSES)
  status?: FollowupStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateFollowupDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(FOLLOWUP_STATUSES)
  status?: FollowupStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}