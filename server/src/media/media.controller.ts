import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB max limit
      },
    }),
  )
  async uploadMedia(
    @GetUser('_id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('category') category?: string,
    @Body('conversationId') conversationId?: string,
    @Body('messageId') messageId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Please select a file to upload');
    }

    const media = await this.mediaService.uploadUserMedia(
      userId,
      file,
      category || 'chat-media',
      conversationId,
      messageId,
    );
    return {
      success: true,
      data: media,
      ...media,
    };
  }

  @Post('import')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  async importMediaBulk(
    @GetUser('_id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('category') category?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please select one or more files to import');
    }

    return this.mediaService.importUserMediaBulk(
      userId,
      files,
      category || 'imported',
    );
  }

  @Get('mine')
  async getMyMedia(
    @GetUser('_id') userId: string,
    @Query('category') category?: string,
    @Query('mediaType') mediaType?: string,
  ) {
    return this.mediaService.getUserMedia(userId, category, mediaType);
  }

  @Public()
  @Get('file/:identifier')
  async streamMediaFile(
    @GetUser('_id') userId: string,
    @Param('identifier') identifier: string,
    @Res() res: Response,
  ) {
    const fileInfo = await this.mediaService.getMediaFileStream(identifier, userId);

    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fileInfo.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const stream = fs.createReadStream(fileInfo.filePath);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ statusCode: 500, message: 'Error reading media file' });
      }
    });
    stream.pipe(res);
  }

  @Get(':id')
  async getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Public()
  @Get(':id/download')
  async downloadMediaFile(
    @GetUser('_id') userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const fileInfo = await this.mediaService.getMediaFileStream(id, userId);

    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', fileInfo.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileInfo.originalName)}"`,
    );

    const stream = fs.createReadStream(fileInfo.filePath);
    stream.pipe(res);
  }

  @Delete(':id')
  async deleteMedia(
    @GetUser('_id') userId: string,
    @Param('id') id: string,
  ) {
    return this.mediaService.deleteUserMedia(id, userId);
  }
}
