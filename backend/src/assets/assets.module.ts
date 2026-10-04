import {
  Inject,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { ZipArchive } from 'archiver';
import { Readable } from 'node:stream';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { INJECTABLE_TOKEN_ASSETS } from './assets.constants.js';
import type { StorageProvider } from '../storage/storage.interface.js';
import { STORAGE_PROVIDER_TOKEN } from '../storage/storage.interface.js';

const MAX_ZIP_FILES = 40;

function expandHome(dir: string): string {
  if (dir === '~' || dir.startsWith('~/')) {
    return path.join(process.env.HOME ?? '', dir.slice(1));
  }
  return dir;
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
};

function extensionFor(contentType: string, key: string): string {
  const fromType = contentType.split(';')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/heic': '.heic',
  };
  if (map[fromType]) {
    return map[fromType];
  }
  const ext = path.extname(key);
  return ext && ext.length <= 6 ? ext : '.jpg';
}

function safeName(value: string, fallback: string): string {
  const base = path
    .basename(value ?? '')
    .replace(/[^\p{L}\p{N} ._-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return base || fallback;
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

@Module({})
export class AssetsModule implements NestModule {
  constructor(
    private readonly configService: ConfigService,
    @Inject(INJECTABLE_TOKEN_ASSETS) private readonly assetsRoot: string,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storage: StorageProvider,
  ) {}
  static register(): {
    module: typeof AssetsModule;
    providers: { provide: string; useFactory: (c: ConfigService) => string; inject: (typeof ConfigService)[] }[];
  } {
    return {
      module: AssetsModule,
      providers: [
        {
          provide: INJECTABLE_TOKEN_ASSETS,
          useFactory: (config: ConfigService): string => {
            const dir =
              config.get<string>('IMAGES_DIR') ??
              path.join(process.env.HOME ?? '', 'Gestion de ventas');
            return expandHome(dir);
          },
          inject: [ConfigService],
        },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(this.handleAssets.bind(this))
      .forRoutes('assets');
  }

  private handleAssets(req: Request, res: Response, next: NextFunction): void {
    const url = req.originalUrl ?? req.url ?? '';
    if (url.startsWith('/api/assets/download-zip')) {
      void this.serveZip(req, res);
      return;
    }
    if (url.startsWith('/api/assets/download')) {
      void this.serveDownload(req, res);
      return;
    }
    this.serveAsset(req, res, next);
  }

  /** Resuelve la llave de una imagen a un flujo legible (remoto o local). */
  private async openImage(
    key: string,
  ): Promise<{ stream: Readable; contentType: string } | null> {
    const publicUrl = this.storage.getPublicUrl(key);
    if (publicUrl.startsWith('http')) {
      const upstream = await fetch(publicUrl);
      if (!upstream.ok || !upstream.body) {
        return null;
      }
      return {
        stream: Readable.fromWeb(upstream.body as never),
        contentType: upstream.headers.get('content-type') ?? 'image/jpeg',
      };
    }

    const rootResolved = path.resolve(this.assetsRoot);
    const absolute = path.normalize(path.join(rootResolved, key));
    if (!absolute.startsWith(rootResolved + path.sep)) {
      return null;
    }
    const stat = await fs.promises.stat(absolute).catch(() => null);
    if (!stat?.isFile()) {
      return null;
    }
    return {
      stream: fs.createReadStream(absolute),
      contentType: MIME_BY_EXT[path.extname(absolute).toLowerCase()] ?? 'application/octet-stream',
    };
  }

  private async serveDownload(req: Request, res: Response): Promise<void> {
    const key = req.query['path'];
    if (typeof key !== 'string' || !key) {
      res.status(400).json({ message: 'Falta el parámetro path' });
      return;
    }
    const image = await this.openImage(decodeURIComponent(key)).catch(() => null);
    if (!image) {
      res.status(404).json({ message: 'No se encontró la imagen' });
      return;
    }
    const name = typeof req.query['name'] === 'string' ? req.query['name'] : key;
    const filename = `${safeName(name, 'imagen')}${extensionFor(image.contentType, key)}`;
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Content-Disposition', contentDisposition(filename));
    image.stream.on('error', () => res.destroy());
    image.stream.pipe(res);
  }

  private async serveZip(req: Request, res: Response): Promise<void> {
    const raw = req.query['paths'];
    const keys = (Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [])
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .map((v) => decodeURIComponent(v))
      .slice(0, MAX_ZIP_FILES);

    if (keys.length === 0) {
      res.status(400).json({ message: 'No se recibieron imágenes' });
      return;
    }

    const zipName = `${safeName(
      typeof req.query['name'] === 'string' ? req.query['name'] : 'fotos',
      'fotos',
    )}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', contentDisposition(zipName));

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on('error', () => res.destroy());
    archive.pipe(res);

    const used = new Set<string>();
    for (const key of keys) {
      const image = await this.openImage(key).catch(() => null);
      if (!image) {
        continue;
      }
      let entry = `${safeName(key, 'imagen')}${extensionFor(image.contentType, key)}`;
      let n = 2;
      while (used.has(entry.toLowerCase())) {
        const dot = entry.lastIndexOf('.');
        entry = `${entry.slice(0, dot)}-${n}${entry.slice(dot)}`;
        n += 1;
      }
      used.add(entry.toLowerCase());
      archive.append(image.stream, { name: entry });
    }

    await archive.finalize();
  }

  private serveAsset(req: Request, res: Response, _next: NextFunction): void {
    const match = /^\/api\/assets\/(.+)$/.exec(req.originalUrl ?? req.url);
    if (!match) {
      res.status(404).end();
      return;
    }
    const relative = decodeURIComponent(match[1]);

    const publicUrl = this.storage.getPublicUrl(relative);
    if (publicUrl.startsWith('http')) {
      res.redirect(302, publicUrl);
      return;
    }

    const rootResolved = path.resolve(this.assetsRoot);
    const absolute = path.isAbsolute(relative)
      ? path.resolve(relative)
      : path.normalize(path.join(rootResolved, relative));
    if (!absolute.startsWith(rootResolved + path.sep) && absolute !== rootResolved) {
      res.status(403).end();
      return;
    }
    fs.stat(absolute, (err, stat) => {
      if (err || !stat.isFile()) {
        res.status(404).end();
        return;
      }
      res.sendFile(absolute);
    });
  }
}