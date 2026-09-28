import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { BackupService } from './backup.service';

@Controller('backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('settings')
  async getSettings(@GetUser('_id') userId: string) {
    return this.backupService.getSettings(userId);
  }

  @Patch('settings')
  async updateSettings(
    @GetUser('_id') userId: string,
    @Body() dto: any,
  ) {
    return this.backupService.updateSettings(userId, dto);
  }

  @Get('status')
  async getStatus(@GetUser('_id') userId: string) {
    return this.backupService.getStatus(userId);
  }

  @Post('media/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB max limit
      },
    }),
  )
  async uploadDualMedia(
    @GetUser('_id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('mediaId') mediaId?: string,
    @Body('checksum') checksum?: string,
    @Body('source') source?: string,
    @Body('category') category?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file for backup upload');
    }

    return this.backupService.uploadDualMedia(userId, file, {
      mediaId,
      checksum,
      source: source || 'automatic-backup',
      category: category || 'automatic-backup',
    });
  }

  @Post('media/retry')
  async retryPartialBackup(
    @GetUser('_id') userId: string,
    @Body('mediaId') mediaId: string,
  ) {
    if (!mediaId) {
      throw new BadRequestException('mediaId is required for retry');
    }
    return this.backupService.retryPartialBackup(userId, mediaId);
  }

  @Post('media/reconcile')
  async reconcileMedia(
    @GetUser('_id') userId: string,
    @Body('checksums') checksums: string[],
    @Body('mediaIds') mediaIds: string[],
  ) {
    return this.backupService.reconcileMedia(userId, checksums || [], mediaIds || []);
  }

  @Get('media')
  async getBackedUpMedia(
    @GetUser('_id') userId: string,
    @Query('mediaType') mediaType?: string,
    @Query('status') status?: string,
  ) {
    return this.backupService.getBackedUpMedia(userId, mediaType, status);
  }

  @Delete('media/:mediaId')
  async deleteBackedUpMedia(
    @GetUser('_id') userId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.backupService.deleteBackedUpMedia(userId, mediaId);
  }
}
