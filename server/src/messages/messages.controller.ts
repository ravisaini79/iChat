import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @GetUser('_id') userId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    return this.messagesService.getConversationMessages(
      conversationId,
      userId,
      limit ? Number(limit) : 50,
      before,
    );
  }

  @Post()
  async sendMessage(
    @GetUser('_id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.createMessage(userId, dto);
  }

  @Patch(':id')
  async editMessage(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @Body('text') text: string,
  ) {
    return this.messagesService.editMessage(id, userId, text);
  }

  @Delete(':id')
  async deleteMessage(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @Query('everyone') everyone?: string,
  ) {
    const forEveryone = everyone === 'true';
    return this.messagesService.deleteMessage(id, userId, forEveryone);
  }

  @Post(':id/react')
  async reactToMessage(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
    @Body('emoji') emoji: string,
  ) {
    return this.messagesService.toggleReaction(id, userId, emoji);
  }

  @Post(':id/pin')
  async pinMessage(@Param('id') id: string) {
    return this.messagesService.togglePinMessage(id);
  }

  @Post(':id/star')
  async starMessage(
    @Param('id') id: string,
    @GetUser('_id') userId: string,
  ) {
    return this.messagesService.toggleStarMessage(id, userId);
  }

  @Get('search/:conversationId')
  async searchInChat(
    @Param('conversationId') conversationId: string,
    @Query('q') query: string,
  ) {
    return this.messagesService.searchMessagesInConversation(
      conversationId,
      query || '',
    );
  }

  @Get('pinned/:conversationId')
  async getPinnedMessages(@Param('conversationId') conversationId: string) {
    return this.messagesService.getPinnedMessages(conversationId);
  }

  @Patch(':conversationId/read')
  async markRead(
    @Param('conversationId') conversationId: string,
    @GetUser('_id') userId: string,
  ) {
    return this.messagesService.markAsRead(conversationId, userId);
  }
}
