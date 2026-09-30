import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.env.MM_PORT ?? 27017);
const binary = { version: process.env.MONGOMS_VERSION ?? '7.0.16' };
if (process.env.MONGOMS_DISTRO) binary.distro = process.env.MONGOMS_DISTRO;

const mongod = await MongoMemoryServer.create({ binary, instance: { port } });
console.log('[memory-mongo] escuchando en 127.0.0.1:' + port);
console.log('[memory-mongo] URI: ' + mongod.getUri());
console.log('[memory-mongo] detente con Ctrl+C; los datos viven en la carpeta temporal.');

setInterval(() => {}, 1 << 30);