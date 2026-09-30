import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './settings.schema.js';
import { UpdateSettingsDto } from './dto/settings.dto.js';

export type PublicSettings = {
  _id?: string;
  contactLink: string;
  currency: string;
  gestor: string;
  gestorPhone: string;
  hasPin: boolean;
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
  ) {}

  async get(): Promise<SettingsDocument> {
    let settings = await this.settingsModel.findOne().exec();
    if (!settings) {
      settings = await this.settingsModel.create({
        contactLink: '',
        currency: 'USD',
        gestor: 'Gestor',
        gestorPhone: '',
        pin: '',
      });
    }
    return settings;
  }

  async publicSettings(): Promise<PublicSettings> {
    const current = await this.get();
    return {
      _id: String(current._id),
      contactLink: current.contactLink,
      currency: current.currency,
      gestor: current.gestor,
      gestorPhone: current.gestorPhone,
      hasPin: Boolean(current.pin),
    };
  }

  async update(
    dto: UpdateSettingsDto,
    sentPin?: string,
  ): Promise<PublicSettings> {
    const current = await this.get();
    if (current.pin && sentPin !== current.pin) {
      throw new UnauthorizedException('Se requiere el PIN para modificar la configuración');
    }
    current.contactLink = dto.contactLink ?? current.contactLink;
    current.currency = dto.currency ?? current.currency;
    current.gestor = dto.gestor ?? current.gestor;
    current.gestorPhone = dto.gestorPhone ?? current.gestorPhone;
    current.pin = dto.pin ?? current.pin;
    await current.save();
    return this.publicSettings();
  }
}