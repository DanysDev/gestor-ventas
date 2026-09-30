import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Supplier, SupplierDocument } from '../suppliers/supplier.schema.js';
import { Product, ProductDocument } from '../products/product.schema.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const SKIP_NAMES = new Set(['.directory', 'desktop.ini', '.thumbnails']);

const TENNIS_SUPPLIER = 'GESTORES TENNIS PLAYA';
const TENNIS_COMMISSION = 5;

const SIZE_TXT_PATTERN = /^datos adicionales\.txt$/i;

interface ParsedCommission {
  type: 'fixed' | 'percent';
  value: number;
}

interface SizeBlock {
  name: string;
  price: number;
  sizes: string;
}

const SIZE_OVERRIDES: {
  leaf: RegExp;
  expectedName: RegExp;
  prefer: (sizes: string) => boolean;
}[] = [
  {
    leaf: /newb\s*530\s*\(\s*grandes\s*\)/i,
    expectedName: /^newb530$/,
    prefer: (s: string) => /\b4[2-4]\b/.test(s),
  },
  {
    leaf: /^newb\s*530$/i,
    expectedName: /^newb530$/,
    prefer: (s: string) => /36/.test(s),
  },
  {
    leaf: /air\s*max\s*tn\s*blanco/i,
    expectedName: /^airmaxtn$/,
    prefer: (s: string) => /\b39\b/.test(s),
  },
  {
    leaf: /^air\s*max\s*tn$/i,
    expectedName: /^airmaxtn$/,
    prefer: (s: string) => /45/.test(s),
  },
];

@Injectable()
export class ImportDataService {
  private rootDir = '';

  constructor(
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async scan(dir: string): Promise<unknown> {
    const root = path.resolve(dir);
    this.rootDir = root;
    if (!fs.existsSync(root)) {
      return { error: 'Directorio no existe: ' + root };
    }
const results = { suppliers: 0, products: 0, skipped: 0, details: [] as unknown[] };
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_NAMES.has(entry.name)) {
        continue;
      }
      results.suppliers += 1;
      const supplier = await this.upsertSupplier(entry.name);
      const counted = await this.importSupplierDir(path.join(root, entry.name), supplier);
      results.products += counted.created;
      results.skipped += counted.skipped;
    }
    this.rootDir = '';
    return results;
  }

  private async upsertSupplier(name: string): Promise<SupplierDocument> {
    let supplier = await this.supplierModel.findOne({ name }).exec();
    if (!supplier) {
      supplier = await this.supplierModel.create({ name });
    }
    return supplier;
  }

  private async importSupplierDir(
    dir: string,
    supplier: SupplierDocument,
  ): Promise<{ created: number; skipped: number }> {
    const isTennis = supplier.name === TENNIS_SUPPLIER;
    const stack = [dir];
    const result = { created: 0, skipped: 0 };
    while (stack.length > 0) {
      const current = stack.pop()!;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      const subdirs = entries.filter((e) => e.isDirectory() && !SKIP_NAMES.has(e.name));
      const directImages = entries.filter(
        (e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
      );
      const hasDescription =
        entries.some((e) => e.isFile() && /^descripci[oó]n\.txt$/i.test(e.name));

      if (directImages.length > 0 || hasDescription) {
        const created = await this.importProduct(current, supplier, isTennis);
        if (created) result.created += 1;
        else result.skipped += 1;
        continue;
      }
      for (const sd of subdirs) {
        stack.push(path.join(current, sd.name));
      }
    }
    if (isTennis) {
      const removed = await this.productModel.deleteMany({
        supplierId: supplier._id,
        images: { $size: 0 },
      });
      result.skipped += removed.deletedCount ?? 0;
    }
    return result;
  }

  private relativeToSupplier(productDir: string, supplierName: string): string {
    return path.relative(path.join(this.rootDir, supplierName), productDir);
  }

  private async importProduct(
    productDir: string,
    supplier: SupplierDocument,
    isTennis: boolean,
  ): Promise<boolean> {
    const relative = this.relativeToSupplier(productDir, supplier.name);
    const rootRelative = path.relative(this.rootDir, productDir);
    const leaf = path.basename(productDir);
    const title = relative.includes(path.sep)
      ? `${path.dirname(relative).split(path.sep).join(' › ')} › ${leaf}`
      : leaf;

    const description = await this.findTextUp(productDir, /^descripci[oó]n\.txt$/i);
    const commissionRaw = await this.findTextUp(productDir, /^comisi[oó]n\.txt$/i);
    const commission = this.parseCommission(commissionRaw);
    let price = this.guessPrice(description, commissionRaw, commission);
    let sizes = '';

    const existing = await this.productModel
      .findOne({ title, supplierId: supplier._id })
      .exec();

    let block: SizeBlock | null = null;
    if (isTennis) {
      const additionalRaw = await this.findTextUp(productDir, SIZE_TXT_PATTERN);
      block = this.matchSizeBlock(additionalRaw, leaf);
      if (block) {
        price = block.price;
        sizes = block.sizes;
      } else if (existing) {
        price = existing.price;
      }
    }

    const images = fs
      .readdirSync(productDir, { withFileTypes: true })
      .filter(
        (e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()),
      )
      .map((e) => ({
        path: path.posix.join(rootRelative.split(path.sep).join('/'), e.name),
        filename: e.name,
      }));

    if (existing) {
      if (isTennis) {
        existing.commissionType = 'fixed';
        existing.commissionValue = TENNIS_COMMISSION;
        if (block) {
          existing.price = price;
          existing.sizes = sizes;
        }
        await existing.save();
        return false;
      }
      return false;
    }

    const commissionToUse: ParsedCommission = isTennis
      ? { type: 'fixed', value: TENNIS_COMMISSION }
      : commission;

    await this.productModel.create({
      title,
      description: description.trim() || leaf,
      sizes,
      price,
      commissionType: commissionToUse.type,
      commissionValue: commissionToUse.value,
      status: 'active',
      images,
      supplierId: supplier._id,
    });
    return true;
  }

  private async findTextUp(fromDir: string, pattern: RegExp): Promise<string> {
    let current: string | null = fromDir;
    while (current) {
      if (path.dirname(current) === this.rootDir) {
        break;
      }
      const match = fs
        .readdirSync(current, { withFileTypes: true })
        .find((e) => e.isFile() && pattern.test(e.name));
      if (match) {
        return fs.readFileSync(path.join(current, match.name), 'utf8');
      }
      current = path.dirname(current);
    }
    return '';
  }

  private parseCommission(raw: string): ParsedCommission {
    const percent = /(\d+(?:[.,]\d+)?)\s*%/i.exec(raw);
    if (percent) {
      return { type: 'percent', value: parseFloat(percent[1].replace(',', '.')) };
    }
    const amounts = [...raw.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:USD|usd|\$)/g)].map(
      (m) => parseFloat(m[1].replace(',', '.')),
    );
    if (amounts.length === 0) {
      return { type: 'fixed', value: 0 };
    }
    return { type: 'fixed', value: amounts[amounts.length - 1] };
  }

  private guessPrice(
    description: string,
    commissionRaw: string,
    commission: ParsedCommission,
  ): number {
    const fromDescription = /Precio\s*:?\s*\$?\s*([\d.,]+)/i.exec(description);
    if (fromDescription) {
      return parseFloat(fromDescription[1].replace(/,/g, ''));
    }
    const amounts = [...commissionRaw.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:USD|usd|\$)/g)].map(
      (m) => parseFloat(m[1].replace(',', '.')),
    );
    if (commission.type === 'fixed' && amounts.length >= 2) {
      return Math.max(...amounts);
    }
    return 0;
  }

  private normName(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private parseSizeBlocks(raw: string): SizeBlock[] {
    const blocks: SizeBlock[] = [];
    const parts = raw.split(/^\s*(?:\*{3,}|-{3,})\s*$/m);
    const header =
      /^(?:descripci[oó]n\s+y\s+n[úu]meros\s+disponibles.*|link\s+de\s+whatsapp\s+acortado.*|https?:\/\/\S*)$/i;
    const isJunk =
      /^\s*-?\s*(?:https?:\/\/|www\.|bit\.ly\/)\S*$/i;
    for (const part of parts) {
      const lines = part
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !header.test(l) && !isJunk.test(l));
      if (lines.length === 0) {
        continue;
      }
      const priceMatch =
        part.match(/\b(\d+(?:[.,]\d+)?)\s*(?:usd|mlc|cuc)\b/i) ??
        part.match(/precio\s*:?\s*\$?\s*(\d+(?:[.,]\d+)?)/i);
      const sizeLines = lines.slice(1).filter((l) => this.isSizeLine(l));
      blocks.push({
        name: lines[0].replace(/[:.\s]+$/, ''),
        price: priceMatch
          ? parseFloat(priceMatch[1].replace(',', '.'))
          : 0,
        sizes: sizeLines.map((l) => this.cleanSize(l)).join(' · '),
      });
    }
    return blocks;
  }

  private isSizeLine(line: string): boolean {
    if (/#/.test(line)) {
      return true;
    }
    const t = line;
    return (
      /^\d[\d\s,._#-]*(?:\s+al\s+\d[\d\s,._#-]*)?$/.test(t) ||
      /^[\d\s,.#_]+$/.test(t)
    );
  }

  private cleanSize(line: string): string {
    return line.replace(/[‼️]/g, '').replace(/#/g, '').trim();
  }

  private matchSizeBlock(raw: string, leaf: string): SizeBlock | null {
    const blocks = this.parseSizeBlocks(raw);
    if (blocks.length === 0) {
      return null;
    }
    const leafNorm = this.normName(leaf);
    const candidates = blocks.filter(
      (b) => this.normName(b.name) === leafNorm,
    );
    for (const rule of SIZE_OVERRIDES) {
      if (!rule.leaf.test(leaf)) {
        continue;
      }
      const hit = blocks.filter(
        (b) => rule.expectedName.test(this.normName(b.name)) && rule.prefer(b.sizes),
      );
      if (hit.length === 1) {
        return hit[0];
      }
    }
    if (candidates.length === 1) {
      return candidates[0];
    }
    if (candidates.length > 1) {
      return candidates[0];
    }
    const contained = blocks.find(
      (b) =>
        this.normName(b.name).length >= 3 &&
        (leafNorm.includes(this.normName(b.name)) ||
          this.normName(b.name).includes(leafNorm)),
    );
    return contained ?? null;
  }
}