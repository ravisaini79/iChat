import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(
    @GetUser('_id') userId: string,
    @Body() dto: CreateGroupDto,
  ) {
    const data = await this.groupsService.createGroup(userId, dto);
    return {
      message: 'Group created successfully',
      data,
    };
  }

  @Get(':id')
  async getGroup(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
  ) {
    const data = await this.groupsService.getGroupDetails(id, userId);
    return {
      message: 'Group details retrieved',
      data,
    };
  }

  @Patch(':id')
  async updateGroup(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    const data = await this.groupsService.updateGroup(id, userId, dto);
    return {
      message: 'Group updated successfully',
      data,
    };
  }

  @Post(':id/members')
  async addMembers(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @Body('memberIds') memberIds: string[],
  ) {
    const data = await this.groupsService.addMembers(id, userId, memberIds);
    return {
      message: 'Members added successfully',
      data,
    };
  }

  @Delete(':id/members/:targetUserId')
  async removeMember(
    @Param('id') id: string,
    @Param('targetUserId') targetUserId: string,
    @GetUser('_id') userId: string,
  ) {
    const data = await this.groupsService.removeMember(id, userId, targetUserId);
    return {
      message: 'Member removed successfully',
      data,
    };
  }

  @Post(':id/admins')
  async toggleAdmin(
    @Param('id') id: string,
    @Param('targetUserId') targetUserId: string,
    @GetUser('_id') userId: string,
  ) {
    const data = await this.groupsService.toggleAdminRole(id, userId, targetUserId);
    return {
      message: 'Admin status toggled',
      data,
    };
  }

  @Post(':id/leave')
  async leaveGroup(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
  ) {
    const data = await this.groupsService.leaveGroup(id, userId);
    return {
      message: 'Left group successfully',
      data,
    };
  }

  @Get(':id/media')
  async getGroupMedia(@Param('id') id: string) {
    const data = await this.groupsService.getGroupMedia(id);
    return {
      message: 'Group media retrieved',
      data,
    };
  }
}
