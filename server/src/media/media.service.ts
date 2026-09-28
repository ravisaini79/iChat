import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Media, MediaDocument } from './schemas/media.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class MediaService {
  private readonly uploadRoot: string;

  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private cloudinaryService: CloudinaryService,
  ) {
    this.uploadRoot = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');
    try {
      if (!fs.existsSync(this.uploadRoot)) {
        fs.mkdirSync(this.uploadRoot, { recursive: true });
      }
    } catch (err: any) {
      if (err?.code === 'EACCES') {
        const os = require('os');
        this.uploadRoot = path.join(os.tmpdir(), 'ichat_uploads');
        if (!fs.existsSync(this.uploadRoot)) {
          fs.mkdirSync(this.uploadRoot, { recursive: true });
        }
      } else {
        throw err;
      }
    }
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/_{2,}/g, '_');
  }

  private getSubfolderForCategory(mimetype: string, category?: string): string {
    if (category === 'status') return 'statuses';
    if (category === 'profile') return 'profile';
    if (category === 'thumbnails') return 'thumbnails';
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.startsWith('video/')) return 'videos';
    return 'files';
  }

  private getMediaType(mimetype: string, category?: string): 'image' | 'video' | 'file' | 'audio' | 'status' {
    if (category === 'status') return 'status';
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'file';
  }

  async uploadUserMedia(
    userId: string,
    file: Express.Multer.File,
    category: string = 'chat-media',
    conversationId?: string,
    messageId?: string,
  ) {
    if (!file || (!file.buffer && !file.path)) {
      throw new BadRequestException('No file provided for upload');
    }

    const uId = userId.toString();
    const subfolder = this.getSubfolderForCategory(file.mimetype, category);
    const userFolderRel = path.join('users', uId, subfolder);
    const userFolderAbs = path.join(this.uploadRoot, userFolderRel);

    if (!fs.existsSync(userFolderAbs)) {
      fs.mkdirSync(userFolderAbs, { recursive: true });
    }

    const safeOriginal = this.sanitizeFilename(file.originalname || 'file');
    const ext = path.extname(safeOriginal) || '.bin';
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const storedName = `${path.basename(safeOriginal, ext)}_${uniqueSuffix}${ext}`;
    const fileAbsPath = path.join(userFolderAbs, storedName);
    const storagePathRel = path.join(userFolderRel, storedName).replace(/\\/g, '/');

    // 1. Write file to local disk (PRIMARY STORAGE)
    if (file.buffer) {
      fs.writeFileSync(fileAbsPath, file.buffer);
    } else if (file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, fileAbsPath);
    } else {
      throw new BadRequestException('Invalid file upload content');
    }

    const mediaType = this.getMediaType(file.mimetype, category);
    let storageProvider = 'filesystem';
    let cloudRes: any = null;

    // 2. Secondary Cloudinary Mirroring (Optional)
    try {
      const cloudinaryFolder = `ichat/users/${uId}/${subfolder}`;
      let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
      if (file.mimetype.startsWith('image/')) resourceType = 'image';
      else if (file.mimetype.startsWith('video/')) resourceType = 'video';
      else resourceType = 'raw';

      cloudRes = await this.cloudinaryService.uploadFile(file, cloudinaryFolder, resourceType);
      if (cloudRes && cloudRes.public_id && !cloudRes.public_id.includes('fallback')) {
        storageProvider = 'both';
      }
    } catch (err: any) {
      console.warn('Secondary Cloudinary upload notice (using local disk as primary):', err?.message);
    }

    // 3. Save MongoDB Media document
    const mediaDoc = new this.mediaModel({
      userId: new Types.ObjectId(uId),
      originalName: file.originalname || safeOriginal,
      storedName,
      mimeType: file.mimetype,
      mediaType,
      size: file.size,
      storageProvider,
      storagePath: storagePathRel,
      cloudinaryPublicId: cloudRes?.public_id || null,
      cloudinaryUrl: cloudRes?.secure_url || null,
      conversationId: conversationId && Types.ObjectId.isValid(conversationId) ? new Types.ObjectId(conversationId) : null,
      messageId: messageId && Types.ObjectId.isValid(messageId) ? new Types.ObjectId(messageId) : null,
      category,
      resourceType: cloudRes?.resource_type || mediaType,
      format: ext.replace('.', ''),
      bytes: file.size,
      width: cloudRes?.width || null,
      height: cloudRes?.height || null,
      publicId: cloudRes?.public_id || storedName,
      secureUrl: `/api/media/file/${storedName}`,
    });

    await mediaDoc.save();

    return this.formatMediaResponse(mediaDoc);
  }

  async importUserMediaBulk(userId: string, files: Express.Multer.File[], category: string = 'imported') {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new BadRequestException('No files provided for bulk import');
    }

    const results = [];
    for (const file of files) {
      try {
        const item = await this.uploadUserMedia(userId, file, category);
        results.push(item);
      } catch (err: any) {
        console.error('Failed to import file in bulk batch:', file?.originalname, err?.message);
      }
    }

    return {
      importedCount: results.length,
      items: results,
    };
  }

  async getUserMedia(userId: string, category?: string, mediaType?: string) {
    const uId = new Types.ObjectId(userId);
    const filter: any = { userId: uId };
    if (category) filter.category = category;
    if (mediaType && mediaType !== 'all') filter.mediaType = mediaType;

    const items = await this.mediaModel.find(filter).sort({ createdAt: -1 }).exec();
    return items.map((doc) => this.formatMediaResponse(doc));
  }

  async getMediaById(mediaId: string) {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid media ID format');
    }
    const media = await this.mediaModel.findById(mediaId);
    if (!media) throw new NotFoundException('Media item not found');
    return this.formatMediaResponse(media);
  }

  async getMediaFileStream(mediaIdentifier: string, requestingUserId?: string) {
    let mediaDoc: MediaDocument | null = null;

    if (Types.ObjectId.isValid(mediaIdentifier)) {
      mediaDoc = await this.mediaModel.findById(mediaIdentifier);
    }
    if (!mediaDoc) {
      mediaDoc = await this.mediaModel.findOne({ storedName: mediaIdentifier });
    }
    if (!mediaDoc) {
      mediaDoc = await this.mediaModel.findOne({ storagePath: { $regex: mediaIdentifier } });
    }

    if (!mediaDoc) {
      throw new NotFoundException('Requested media file not found');
    }

    if (requestingUserId) {
      const reqUId = requestingUserId.toString();
      const isOwner = mediaDoc.userId.toString() === reqUId;

      let isAuthorized = isOwner;
      if (!isAuthorized && mediaDoc.conversationId) {
        const conv = await this.conversationModel.findById(mediaDoc.conversationId);
        if (conv) {
          isAuthorized = conv.participants.some((p) => p.toString() === reqUId);
        }
      }

      if (!isAuthorized && (mediaDoc.category === 'chat-media' || mediaDoc.category === 'profile' || mediaDoc.category === 'status')) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        throw new ForbiddenException('You are not authorized to access this media file');
      }
    }

    const absolutePath = path.resolve(this.uploadRoot, mediaDoc.storagePath);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Media file missing on server filesystem');
    }

    return {
      filePath: absolutePath,
      mimeType: mediaDoc.mimeType,
      originalName: mediaDoc.originalName,
      size: mediaDoc.size,
    };
  }

  async deleteUserMedia(mediaId: string, requestingUserId: string) {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new BadRequestException('Invalid media ID format');
    }

    const mediaDoc = await this.mediaModel.findById(mediaId);
    if (!mediaDoc) {
      throw new NotFoundException('Media item not found');
    }

    if (mediaDoc.userId.toString() !== requestingUserId.toString()) {
      throw new ForbiddenException('You are only authorized to delete your own media');
    }

    // 1. Delete local file
    const absolutePath = path.resolve(this.uploadRoot, mediaDoc.storagePath);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (err: any) {
        console.warn('Failed to delete disk file:', err?.message);
      }
    }

    // 2. Delete Cloudinary asset if present
    if (mediaDoc.cloudinaryPublicId) {
      try {
        await this.cloudinaryService.uploadFile
      } catch (err: any) {
        console.warn('Cloudinary delete notice:', err?.message);
      }
    }

    // 3. Remove document from MongoDB
    await this.mediaModel.deleteOne({ _id: mediaDoc._id });

    return { success: true, message: 'Media deleted successfully' };
  }

  public formatMediaResponse(doc: MediaDocument) {
    const fileUrl = `/api/media/file/${doc._id}`;

    return {
      _id: doc._id.toString(),
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      originalName: doc.originalName || 'file',
      storedName: doc.storedName,
      mimeType: doc.mimeType,
      mediaType: doc.mediaType,
      size: doc.size,
      category: doc.category,
      storageProvider: doc.storageProvider,
      storagePath: doc.storagePath,
      url: fileUrl,
      secureUrl: fileUrl,
      cloudinaryUrl: doc.cloudinaryUrl || null,
      cloudinaryPublicId: doc.cloudinaryPublicId || null,
      width: doc.width || null,
      height: doc.height || null,
      conversationId: doc.conversationId ? doc.conversationId.toString() : null,
      messageId: doc.messageId ? doc.messageId.toString() : null,
      createdAt: (doc as any).createdAt || new Date(),
    };
  }
}
