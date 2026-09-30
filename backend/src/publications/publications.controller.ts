import { Controller, Get, Param } from '@nestjs/common';
import { PublicationsService } from './publications.service.js';

@Controller('publications')
export class PublicationsController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get('product/:productId')
  listByProduct(@Param('productId') productId: string) {
    return this.publicationsService.listByProduct(productId);
  }
}