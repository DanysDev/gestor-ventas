import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Global, INestApplication, Module } from '@nestjs/common';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import request from 'supertest';
import { AssetsModule } from './assets.module.js';
import type { MulterFile, StorageProvider, UploadResult } from '../storage/storage.interface.js';
import { STORAGE_PROVIDER_TOKEN } from '../storage/storage.interface.js';

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

class FakeStorageProvider implements StorageProvider {
  async upload(): Promise<string> {
    return '';
  }
  async delete(): Promise<void> {}
  getPublicUrl(key: string): string {
    return key;
  }
  async uploadFiles(_files: MulterFile[], _supplier: string): Promise<UploadResult[]> {
    return [];
  }
}

@Global()
@Module({
  providers: [{ provide: STORAGE_PROVIDER_TOKEN, useValue: new FakeStorageProvider() }],
  exports: [STORAGE_PROVIDER_TOKEN],
})
class StorageStubModule {}

function asBinary(res: request.Response): Buffer {
  return res.body as Buffer;
}

describe('AssetsModule (descargas)', () => {
  let app: INestApplication;
  let root: string;

  beforeAll(async () => {
    root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'assets-test-'));
    const dir = path.join(root, 'Proveedor', 'Producto');
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, 'foto.png'), PNG_BYTES);
    await fs.promises.writeFile(path.join(dir, 'otra.png'), PNG_BYTES);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ IMAGES_DIR: root })],
        }),
        StorageStubModule,
        AssetsModule.register(),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await fs.promises.rm(root, { recursive: true, force: true });
  });

  it('sirve la imagen normal (sin cambio de comportamiento previo)', async () => {
    await request(app.getHttpServer())
      .get('/api/assets/Proveedor/Producto/foto.png')
      .expect(200);
  });

  it('descarga una imagen suelta como adjunto, con nombre y extensión', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/assets/download')
      .query({ path: 'Proveedor/Producto/foto.png', name: 'MI CAFETERA' })
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('MI CAFETERA.png');
    expect(res.headers['content-type']).toContain('image/png');
    expect(asBinary(res).equals(PNG_BYTES)).toBe(true);
  });

  it('responde 404 si la imagen no existe', async () => {
    await request(app.getHttpServer())
      .get('/api/assets/download')
      .query({ path: 'Proveedor/Producto/no-existe.png' })
      .expect(404);
  });

  it('responde 400 si no viene el path', async () => {
    await request(app.getHttpServer()).get('/api/assets/download').expect(400);
  });

  it('no deja salir de la carpeta de imágenes', async () => {
    await request(app.getHttpServer())
      .get('/api/assets/download')
      .query({ path: '../../../etc/passwd' })
      .expect(404);
  });

  it('empaqueta varias imágenes en un zip', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/assets/download-zip')
      .query({
        paths: ['Proveedor/Producto/foto.png', 'Proveedor/Producto/otra.png'],
        name: 'CAFETERA GOURMET',
      })
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect('Content-Type', 'application/zip');

    const zip = asBinary(res);
    expect(res.headers['content-disposition']).toContain('CAFETERA GOURMET.zip');
    expect(zip.subarray(0, 2).toString('latin1')).toBe('PK');
    expect(zip.toString('latin1')).toContain('foto.png');
    expect(zip.toString('latin1')).toContain('otra.png');
  });

  it('responde 400 si el zip no recibe imágenes', async () => {
    await request(app.getHttpServer()).get('/api/assets/download-zip').expect(400);
  });
});