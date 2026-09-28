import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY = 'Cloudinary';

export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return cloudinary.config({
      cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME') || 'demo_cloud',
      api_key: configService.get<string>('CLOUDINARY_API_KEY') || '1234567890',
      api_secret: configService.get<string>('CLOUDINARY_API_SECRET') || 'abcdefghijklmnopqrstuvwxyz',
    });
  },
};
