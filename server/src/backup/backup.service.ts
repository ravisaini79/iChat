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
import { BackupSettings, BackupSettingsDocument } from './schemas/backup-settings.schema';
import { Media, MediaDocument } from '../media/schemas/media.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BackupService {
  private readonly uploadRoot: string;

  constructor(
    @InjectModel(BackupSettings.name) private backupSettingsModel: Model<BackupSettingsDocument>,
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    private cloudinaryService: CloudinaryService,
  ) {
    this.uploadRoot = process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadRoot)) {
      fs.mkdirSync(this.uploadRoot, { recursive: true });
    }
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

  private getMediaType(mimetype: string): 'image' | 'video' | 'file' | 'audio' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'file';
  }

  async getSettings(userId: string) {
    const uId = new Types.ObjectId(userId);
    let settings = await this.backupSettingsModel.findOne({ userId: uId });
    if (!settings) {
      settings = new this.backupSettingsModel({ userId: uId });
      await settings.save();
    }
    return settings;
  }

  async updateSettings(userId: string, dto: Partial<BackupSettings>) {
    const uId = new Types.ObjectId(userId);
    let settings = await this.backupSettingsModel.findOne({ userId: uId });
    if (!settings) {
      settings = new this.backupSettingsModel({ userId: uId, ...dto });
    } else {
      Object.assign(settings, dto);
    }
    await settings.save();
    return settings;
  }

  async getStatus(userId: string) {
    const uId = new Types.ObjectId(userId);
    const settings = await this.getSettings(userId);
    const mediaItems = await this.mediaModel.find({ userId: uId }).exec();

    let totalFiles = mediaItems.length;
    let totalBytes = 0;
    let filesystemCount = 0;
    let cloudinaryCount = 0;
    let partialCount = 0;

    mediaItems.forEach((item) => {
      totalBytes += item.size || 0;
      if (item.filesystem?.status === 'completed' || item.storagePath) filesystemCount++;
      if (item.cloudinary?.status === 'completed' || item.cloudinaryUrl || item.cloudinaryPublicId) cloudinaryCount++;
      if (item.overallStatus === 'partial') partialCount++;
    });

    const stats = {
      totalFiles,
      totalBytes,
      filesystemCount,
      cloudinaryCount,
      partialCount,
    };

    settings.storageStats = stats;
    await settings.save();

    return {
      isEnabled: settings.isEnabled,
      wifiOnly: settings.wifiOnly,
      lastBackupAt: settings.lastBackupAt,
      stats,
    };
  }

  async uploadDualMedia(
    userId: string,
    file: Express.Multer.File,
    dto: {
      mediaId?: string;
      checksum?: string;
      source?: string;
      category?: string;
    } = {},
  ) {
    if (!file || (!file.buffer && !file.path)) {
      throw new BadRequestException('No file provided for backup');
    }

    const uId = userId.toString();
    const mediaType = this.getMediaType(file.mimetype);
    const category = dto.category || 'automatic-backup';
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

    // Check if checksum already backed up
    if (dto.checksum) {
      const existing = await this.mediaModel.findOne({
        userId: new Types.ObjectId(uId),
        checksum: dto.checksum,
        overallStatus: 'completed',
      });
      if (existing) {
        return this.formatBackupMediaResponse(existing);
      }
    }

    // Provider 1: Server Filesystem
    let fsStatus = 'failed';
    try {
      if (file.buffer) {
        fs.writeFileSync(fileAbsPath, file.buffer);
      } else if (file.path && fs.existsSync(file.path)) {
        fs.copyFileSync(file.path, fileAbsPath);
      }
      fsStatus = 'completed';
    } catch (err: any) {
      console.error('Filesystem backup failed:', err?.message);
    }

    // Provider 2: Cloudinary
    let cloudStatus = 'failed';
    let cloudRes: any = null;
    try {
      const cloudinaryFolder = `ichat/users/${uId}/${subfolder}`;
      let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
      if (file.mimetype.startsWith('image/')) resourceType = 'image';
      else if (file.mimetype.startsWith('video/')) resourceType = 'video';
      else resourceType = 'raw';

      cloudRes = await this.cloudinaryService.uploadFile(file, cloudinaryFolder, resourceType);
      if (cloudRes && cloudRes.public_id && !cloudRes.public_id.includes('fallback')) {
        cloudStatus = 'completed';
      }
    } catch (err: any) {
      console.warn('Cloudinary backup notice:', err?.message);
    }

    // Determine overallStatus
    let overallStatus: 'completed' | 'partial' | 'failed' = 'failed';
    if (fsStatus === 'completed' && cloudStatus === 'completed') {
      overallStatus = 'completed';
    } else if (fsStatus === 'completed' || cloudStatus === 'completed') {
      overallStatus = 'partial';
    }

    const storageProvider = fsStatus === 'completed' && cloudStatus === 'completed'
      ? 'both'
      : fsStatus === 'completed'
      ? 'filesystem'
      : 'cloudinary';

    const mediaDoc = new this.mediaModel({
      userId: new Types.ObjectId(uId),
      mediaId: dto.mediaId || `media_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      originalName: file.originalname || safeOriginal,
      storedName,
      mimeType: file.mimetype,
      mediaType,
      size: file.size,
      checksum: dto.checksum || null,
      source: dto.source || 'automatic-backup',
      storageProvider,
      storagePath: storagePathRel,
      filesystem: {
        storageKey: storagePathRel,
        status: fsStatus,
      },
      cloudinary: {
        publicId: cloudRes?.public_id || '',
        secureUrl: cloudRes?.secure_url || '',
        resourceType: cloudRes?.resource_type || mediaType,
        format: ext.replace('.', ''),
        status: cloudStatus,
      },
      overallStatus,
      cloudinaryPublicId: cloudRes?.public_id || null,
      cloudinaryUrl: cloudRes?.secure_url || null,
      category,
      resourceType: cloudRes?.resource_type || mediaType,
      format: ext.replace('.', ''),
      bytes: file.size,
      width: cloudRes?.width || null,
      height: cloudRes?.height || null,
      publicId: cloudRes?.public_id || storedName,
      secureUrl: `/api/media/file/${storedName}`,
      backedUpAt: new Date(),
    });

    await mediaDoc.save();

    // Update settings lastBackupAt
    await this.backupSettingsModel.updateOne(
      { userId: new Types.ObjectId(uId) },
      { $set: { lastBackupAt: new Date() } },
    );

    return this.formatBackupMediaResponse(mediaDoc);
  }

  async retryPartialBackup(userId: string, mediaId: string) {
    let mediaDoc: MediaDocument | null = null;
    if (Types.ObjectId.isValid(mediaId)) {
      mediaDoc = await this.mediaModel.findById(mediaId);
    }
    if (!mediaDoc) {
      mediaDoc = await this.mediaModel.findOne({ mediaId });
    }

    if (!mediaDoc) {
      throw new NotFoundException('Media backup record not found');
    }

    if (mediaDoc.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('Unauthorized');
    }

    const uId = userId.toString();
    const diskPath = path.resolve(this.uploadRoot, mediaDoc.storagePath);

    // If Cloudinary failed, retry Cloudinary from disk file
    if (mediaDoc.cloudinary?.status !== 'completed' && fs.existsSync(diskPath)) {
      try {
        const fileBuffer = fs.readFileSync(diskPath);
        const fileObj = {
          originalname: mediaDoc.originalName,
          mimetype: mediaDoc.mimeType,
          buffer: fileBuffer,
          size: mediaDoc.size,
        } as Express.Multer.File;

        const subfolder = this.getSubfolderForCategory(mediaDoc.mimeType, mediaDoc.category);
        const folder = `ichat/users/${uId}/${subfolder}`;
        let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
        if (mediaDoc.mimeType.startsWith('image/')) resourceType = 'image';
        else if (mediaDoc.mimeType.startsWith('video/')) resourceType = 'video';
        else resourceType = 'raw';

        const cloudRes = await this.cloudinaryService.uploadFile(fileObj, folder, resourceType);
        if (cloudRes && cloudRes.public_id && !cloudRes.public_id.includes('fallback')) {
          mediaDoc.cloudinary = {
            publicId: cloudRes.public_id,
            secureUrl: cloudRes.secure_url,
            resourceType: cloudRes.resource_type || mediaDoc.mediaType,
            format: mediaDoc.format || '',
            status: 'completed',
          };
          mediaDoc.cloudinaryPublicId = cloudRes.public_id;
          mediaDoc.cloudinaryUrl = cloudRes.secure_url;
        }
      } catch (err: any) {
        console.warn('Retry Cloudinary upload failed:', err?.message);
      }
    }

    if (mediaDoc.filesystem?.status === 'completed' && mediaDoc.cloudinary?.status === 'completed') {
      mediaDoc.overallStatus = 'completed';
      mediaDoc.storageProvider = 'both';
    }

    await mediaDoc.save();
    return this.formatBackupMediaResponse(mediaDoc);
  }

  async reconcileMedia(userId: string, checksums: string[] = [], mediaIds: string[] = []) {
    const uId = new Types.ObjectId(userId);
    const filter: any = { userId: uId, overallStatus: 'completed' };

    const queryOr: any[] = [];
    if (checksums.length > 0) queryOr.push({ checksum: { $in: checksums } });
    if (mediaIds.length > 0) queryOr.push({ mediaId: { $in: mediaIds } });

    if (queryOr.length > 0) filter.$or = queryOr;

    const existingDocs = await this.mediaModel.find(filter).exec();
    const existingChecksums = existingDocs.map((d) => d.checksum).filter(Boolean);
    const existingMediaIds = existingDocs.map((d) => d.mediaId).filter(Boolean);

    return {
      completedChecksums: existingChecksums,
      completedMediaIds: existingMediaIds,
    };
  }

  async getBackedUpMedia(userId: string, mediaType?: string, status?: string) {
    const uId = new Types.ObjectId(userId);
    const filter: any = { userId: uId };
    if (mediaType && mediaType !== 'all') filter.mediaType = mediaType;
    if (status && status !== 'all') filter.overallStatus = status;

    const items = await this.mediaModel.find(filter).sort({ createdAt: -1 }).exec();
    return items.map((doc) => this.formatBackupMediaResponse(doc));
  }

  async deleteBackedUpMedia(userId: string, mediaId: string) {
    let mediaDoc: MediaDocument | null = null;
    if (Types.ObjectId.isValid(mediaId)) {
      mediaDoc = await this.mediaModel.findById(mediaId);
    }
    if (!mediaDoc) {
      mediaDoc = await this.mediaModel.findOne({ mediaId });
    }

    if (!mediaDoc) {
      throw new NotFoundException('Media item not found');
    }

    if (mediaDoc.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('Unauthorized');
    }

    const diskPath = path.resolve(this.uploadRoot, mediaDoc.storagePath);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (e) {
        // Handled
      }
    }

    await this.mediaModel.deleteOne({ _id: mediaDoc._id });
    return { success: true, message: 'Backup item deleted successfully' };
  }

  private formatBackupMediaResponse(doc: MediaDocument) {
    const fileUrl = `/api/media/file/${doc._id}`;

    return {
      _id: doc._id.toString(),
      id: doc._id.toString(),
      mediaId: doc.mediaId || doc._id.toString(),
      userId: doc.userId.toString(),
      originalName: doc.originalName,
      storedName: doc.storedName,
      mimeType: doc.mimeType,
      mediaType: doc.mediaType,
      size: doc.size,
      checksum: doc.checksum || null,
      source: doc.source || 'automatic-backup',
      filesystem: doc.filesystem || { storageKey: doc.storagePath, status: 'completed' },
      cloudinary: doc.cloudinary || {
        publicId: doc.cloudinaryPublicId || '',
        secureUrl: doc.cloudinaryUrl || '',
        resourceType: doc.resourceType || 'auto',
        format: doc.format || '',
        status: doc.cloudinaryUrl ? 'completed' : 'failed',
      },
      overallStatus: doc.overallStatus || 'completed',
      url: fileUrl,
      secureUrl: fileUrl,
      backedUpAt: doc.backedUpAt || (doc as any).createdAt,
      createdAt: (doc as any).createdAt,
    };
  }
}
