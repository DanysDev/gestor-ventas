import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ScamsService } from './scams.service.js';
import { CreateScamDto, UpdateScamDto } from './dto/scam.dto.js';

@Controller('scams')
export class ScamsController {
  constructor(private readonly scamsService: ScamsService) {}

  @Get()
  findAll() {
    return this.scamsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateScamDto) {
    return this.scamsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScamDto) {
    return this.scamsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scamsService.remove(id);
  }
}