import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  overview() {
    return this.reportsService.overview();
  }

  @Get('product-ranking')
  productRanking() {
    return this.reportsService.productRanking();
  }
}