import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { StatusService } from './status.service';
import { CreateStatusDto } from './dto/create-status.dto';

@Controller('status')
@UseGuards(JwtAuthGuard)
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  async getFeed(@GetUser('_id') userId: string) {
    return this.statusService.getFeedForUser(userId);
  }

  @Get('feed')
  async getFeedAlias(@GetUser('_id') userId: string) {
    const feed = await this.statusService.getFeedForUser(userId);
    return feed.contactUpdates;
  }

  @Get('my')
  async getMyStatuses(@GetUser('_id') userId: string) {
    const feed = await this.statusService.getFeedForUser(userId);
    return feed.myStatus;
  }

  @Post()
  async createStatus(
    @GetUser('_id') userId: string,
    @Body() dto: CreateStatusDto,
  ) {
    return this.statusService.createStatus(userId, dto);
  }

  @Post(':id/view')
  async recordView(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
  ) {
    return this.statusService.recordView(id, userId);
  }

  @Delete(':id')
  async deleteStatus(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
  ) {
    return this.statusService.deleteStatus(id, userId);
  }
}
