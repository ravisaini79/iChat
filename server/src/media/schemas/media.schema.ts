import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type MediaDocument = Media & Document;

@Schema({ _id: false })
export class FilesystemStorageRef {
  @Prop({ default: '' })
  storageKey: string;

  @Prop({ default: 'pending' }) // pending | uploading | completed | failed
  status: string;
}

@Schema({ _id: false })
export class CloudinaryStorageRef {
  @Prop({ default: '' })
  publicId: string;

  @Prop({ default: '' })
  secureUrl: string;

  @Prop({ default: 'auto' })
  resourceType: string;

  @Prop({ default: '' })
  format: string;

  @Prop({ default: 'pending' }) // pending | uploading | completed | failed
  status: string;
}

@Schema({ timestamps: true })
export class Media {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ index: true })
  mediaId?: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  storedName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, default: 'image', index: true })
  mediaType: string; // 'image' | 'video' | 'file' | 'audio' | 'status'

  @Prop({ default: 0 })
  size: number;

  @Prop({ index: true })
  checksum?: string;

  @Prop({ default: 'chat-attachment' })
  source: string; // 'automatic-backup' | 'chat-attachment' | 'manual-import'

  @Prop({ default: 'filesystem' })
  storageProvider: string; // 'filesystem' | 'cloudinary' | 'both'

  @Prop({ required: true })
  storagePath: string; // Relative path inside UPLOAD_ROOT (e.g., users/{userId}/images/{filename})

  @Prop({ type: FilesystemStorageRef, default: () => ({ storageKey: '', status: 'completed' }) })
  filesystem: FilesystemStorageRef;

  @Prop({ type: CloudinaryStorageRef, default: () => ({ publicId: '', secureUrl: '', resourceType: 'auto', format: '', status: 'pending' }) })
  cloudinary: CloudinaryStorageRef;

  @Prop({ default: 'completed', index: true }) // queued | uploading | partial | completed | failed
  overallStatus: string;

  @Prop({ default: null })
  cloudinaryPublicId?: string;

  @Prop({ default: null })
  cloudinaryUrl?: string;

  @Prop({ default: null })
  thumbnailPath?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', default: null, index: true })
  conversationId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null, index: true })
  messageId?: MongooseSchema.Types.ObjectId;

  @Prop({ default: 'chat-media' })
  category: string; // profile | chat-media | images | videos | audio | documents | status

  @Prop({ default: 'auto' })
  resourceType: string;

  @Prop()
  format: string;

  @Prop({ default: 0 })
  bytes: number;

  @Prop({ default: null })
  width?: number;

  @Prop({ default: null })
  height?: number;

  @Prop({ default: null })
  publicId?: string;

  @Prop({ default: null })
  secureUrl?: string;

  @Prop({ default: null })
  backedUpAt?: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ userId: 1, checksum: 1 });
MediaSchema.index({ userId: 1, mediaId: 1 });
