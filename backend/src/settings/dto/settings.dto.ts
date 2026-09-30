import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  contactLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gestor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gestorPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pin?: string;
}