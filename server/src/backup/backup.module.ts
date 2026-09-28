import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackupSettings, BackupSettingsSchema } from './schemas/backup-settings.schema';
import { Media, MediaSchema } from '../media/schemas/media.schema';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BackupSettings.name, schema: BackupSettingsSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService, MongooseModule],
})
export class BackupModule {}
