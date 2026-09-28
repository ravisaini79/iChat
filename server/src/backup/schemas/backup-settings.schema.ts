import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BackupSettingsDocument = BackupSettings & Document;

@Schema({ timestamps: true })
export class BackupSettings {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  isEnabled: boolean;

  @Prop({ default: true })
  wifiOnly: boolean;

  @Prop({ default: true })
  includePhotos: boolean;

  @Prop({ default: true })
  includeVideos: boolean;

  @Prop({ default: true })
  includeFiles: boolean;

  @Prop({ default: 50 })
  maxFileSizeMB: number;

  @Prop({ default: true })
  autoSyncContacts: boolean;

  @Prop({ default: null })
  lastBackupAt?: Date;

  @Prop({
    type: Object,
    default: {
      totalFiles: 0,
      totalBytes: 0,
      filesystemCount: 0,
      cloudinaryCount: 0,
      partialCount: 0,
    },
  })
  storageStats: {
    totalFiles: number;
    totalBytes: number;
    filesystemCount: number;
    cloudinaryCount: number;
    partialCount: number;
  };
}

export const BackupSettingsSchema = SchemaFactory.createForClass(BackupSettings);
