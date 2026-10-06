import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const COMMISSION_TYPES = ['fixed', 'percent', 'margin'] as const;
export const COMMISSION_QTY_TYPES = ['none', 'fixed', 'percent'] as const;
export const COMMISSION_CURRENCIES = ['USD', 'CUP'] as const;
export const PRODUCT_STATUSES = ['active', 'sold', 'hidden'] as const;

export class ProductImageDto {
  @IsString()
  path: string;

  @IsString()
  filename: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  facebookDescription?: string;

  @IsOptional()
  @IsBoolean()
  useFacebookDescription?: boolean;

  @IsString()
  @IsOptional()
  sizes?: string;

  @IsString()
  @IsOptional()
  salesNotes?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  supplierPrice?: number;

  @IsEnum(COMMISSION_TYPES)
  commissionType: 'fixed' | 'percent' | 'margin';

  @IsNumber()
  @Min(0)
  commissionValue: number;

  @IsOptional()
  @IsEnum(COMMISSION_CURRENCIES)
  commissionCurrency?: 'USD' | 'CUP';

  @IsOptional()
  @IsEnum(COMMISSION_QTY_TYPES)
  commissionQtyType?: 'none' | 'fixed' | 'percent';

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionQtyValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionQtyMin?: number;

  @IsOptional()
  @IsArray()
  images?: ProductImageDto[];

  @IsMongoId()
  supplierId: string;

  @IsOptional()
  @IsEnum(PRODUCT_STATUSES)
  status?: 'active' | 'sold' | 'hidden';
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  facebookDescription?: string;

  @IsOptional()
  @IsBoolean()
  useFacebookDescription?: boolean;

  @IsOptional()
  @IsString()
  sizes?: string;

  @IsOptional()
  @IsString()
  salesNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  supplierPrice?: number;

  @IsOptional()
  @IsEnum(COMMISSION_TYPES)
  commissionType?: 'fixed' | 'percent' | 'margin';

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionValue?: number;

  @IsOptional()
  @IsEnum(COMMISSION_CURRENCIES)
  commissionCurrency?: 'USD' | 'CUP';

  @IsOptional()
  @IsEnum(COMMISSION_QTY_TYPES)
  commissionQtyType?: 'none' | 'fixed' | 'percent';

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionQtyValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionQtyMin?: number;

  @IsOptional()
  @IsArray()
  images?: ProductImageDto[];

  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PRODUCT_STATUSES)
  status?: 'active' | 'sold' | 'hidden';
}

export class QueryProductsDto {
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PRODUCT_STATUSES)
  status?: 'active' | 'sold' | 'hidden';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  sort?: string;
}