import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NextFunction, Request, Response } from 'express';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './settings.schema.js';

@Injectable()
export class PinMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await this.settingsModel.findOne().exec();
      const pin = settings?.pin;
      if (!pin) {
        next();
        return;
      }
      const sent = req.headers['x-app-pin'];
      if (typeof sent === 'string' && sent === pin) {
        next();
        return;
      }
      res.status(401).json({ statusCode: 401, message: 'PIN requerido' });
    } catch {
      next();
    }
  }
}