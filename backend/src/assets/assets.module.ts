import {
  Inject,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { INJECTABLE_TOKEN_ASSETS } from './assets.constants.js';
import type { StorageProvider } from '../storage/storage.interface.js';
import { STORAGE_PROVIDER_TOKEN } from '../storage/storage.interface.js';

function expandHome(dir: string): string {
  if (dir === '~' || dir.startsWith('~/')) {
    return path.join(process.env.HOME ?? '', dir.slice(1));
  }
  return dir;
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
      .apply(this.serveAsset.bind(this))
      .forRoutes('assets');
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