import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FollowupsService } from './followups.service.js';
import { CreateFollowupDto, UpdateFollowupDto } from './dto/followup.dto.js';

@Controller('followups')
export class FollowupsController {
  constructor(private readonly followupsService: FollowupsService) {}

  @Get()
  findAll() {
    return this.followupsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateFollowupDto) {
    return this.followupsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFollowupDto) {
    return this.followupsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.followupsService.remove(id);
  }
}