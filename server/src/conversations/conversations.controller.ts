import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async getConversations(@GetUser('_id') userId: string) {
    return this.conversationsService.getUserConversations(userId);
  }

  @Post()
  async createOneToOne(
    @GetUser('_id') userId: string,
    @Body('targetUserId') targetUserId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const target = targetUserId || bodyUserId;
    return this.conversationsService.findOrCreateOneToOneConversation(
      userId,
      target,
    );
  }

  @Post('direct')
  async createDirect(
    @GetUser('_id') userId: string,
    @Body('targetUserId') targetUserId?: string,
    @Body('userId') bodyUserId?: string,
  ) {
    const target = targetUserId || bodyUserId;
    return this.conversationsService.findOrCreateOneToOneConversation(
      userId,
      target,
    );
  }

  @Post('by-phone')
  async createByPhone(
    @GetUser('_id') userId: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    return this.conversationsService.findOrCreateByPhoneNumber(
      userId,
      phoneNumber,
    );
  }

  @Get(':id')
  async getConversation(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
  ) {
    return this.conversationsService.getConversationFormatted(id, userId);
  }
}
