import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';

export class MarkSeenDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids?: string[];
}