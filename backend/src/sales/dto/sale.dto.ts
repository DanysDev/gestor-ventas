import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const DELIVERY_TYPES = ['mensajeria', 'recogida'] as const;
export const SALE_STATUSES = ['pending', 'paid', 'cancelled'] as const;
export const COMMISSION_CURRENCIES = ['USD', 'CUP'] as const;

export class CreateSaleDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  clientPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  municipality?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;

  @IsOptional()
  @IsEnum(COMMISSION_CURRENCIES)
  commissionCurrency?: 'USD' | 'CUP';

  @IsOptional()
  @IsEnum(DELIVERY_TYPES)
  deliveryType?: 'mensajeria' | 'recogida';

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  saleDate?: string;

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
  @MaxLength(500)
  observations?: string;

  @IsOptional()
  @IsEnum(SALE_STATUSES)
  status?: 'pending' | 'paid' | 'cancelled';
}

export class UpdateSaleDto {
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  clientPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  municipality?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;

  @IsOptional()
  @IsEnum(DELIVERY_TYPES)
  deliveryType?: 'mensajeria' | 'recogida';

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  saleDate?: string;

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
  @MaxLength(500)
  observations?: string;

  @IsOptional()
  @IsEnum(SALE_STATUSES)
  status?: 'pending' | 'paid' | 'cancelled';
}

export class QuerySalesDto {
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsEnum(SALE_STATUSES)
  status?: 'pending' | 'paid' | 'cancelled';
}