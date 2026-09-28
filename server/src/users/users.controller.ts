import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UsersService } from './users.service';
import { MediaService } from '../media/media.service';
import { ProfileSetupDto } from './dto/profile-setup.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
  ) {}

  @Get('me')
  async getMe(@GetUser('_id') userId: string) {
    return this.usersService.getUserWithProfile(userId);
  }

  @Get('search')
  async searchUsers(
    @GetUser('_id') currentUserId: string,
    @Query('q') query: string,
  ) {
    return this.usersService.searchUsers(currentUserId, query);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserWithProfile(id);
  }

  @Post('profile-setup')
  async setupProfile(
    @GetUser('_id') userId: string,
    @Body() dto: ProfileSetupDto,
  ) {
    return this.usersService.setupProfile(userId, dto);
  }

  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @GetUser('_id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const media = await this.mediaService.uploadUserMedia(userId, file, 'profile');
    return this.usersService.updateProfile(userId, {
      avatarUrl: media.secureUrl,
    });
  }

  @Patch('me')
  async updateProfile(
    @GetUser('_id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }
}
