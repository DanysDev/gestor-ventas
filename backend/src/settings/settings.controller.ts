import { Body, Controller, Get, Headers, Put } from '@nestjs/common';
import { PublicSettings, SettingsService } from './settings.service.js';
import { UpdateSettingsDto } from './dto/settings.dto.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async get(): Promise<PublicSettings> {
    return this.settingsService.publicSettings();
  }

  @Put()
  async update(
    @Body() dto: UpdateSettingsDto,
    @Headers('x-app-pin') sentPin?: string,
  ): Promise<PublicSettings> {
    return this.settingsService.update(dto, sentPin);
  }
}