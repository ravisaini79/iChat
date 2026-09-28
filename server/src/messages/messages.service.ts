import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument, MessageStatus, MessageType } from './schemas/message.schema';
import { ConversationsService } from '../conversations/conversations.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private conversationsService: ConversationsService,
  ) {}

  async createMessage(senderId: string, dto: SendMessageDto): Promise<MessageDocument> {
    const cId = new Types.ObjectId(dto.conversationId);
    const sId = new Types.ObjectId(senderId);

    // Verify sender is participant in conversation
    const conv = await this.conversationsService.getConversationFormatted(dto.conversationId, senderId);

    // Idempotency check
    if (dto.clientMessageId) {
      const existing = await this.messageModel.findOne({ clientMessageId: dto.clientMessageId });
      if (existing) {
        return existing.populate([
          { path: 'senderId', select: 'phoneNumber' },
          { path: 'replyTo', select: 'text senderId type media' },
        ]);
      }
    }

    const receiverId = conv.opponent?._id ? new Types.ObjectId(conv.opponent._id) : sId;

    const message = new this.messageModel({
      conversationId: cId,
      senderId: sId,
      receiverId,
      clientMessageId: dto.clientMessageId || null,
      type: dto.type || MessageType.TEXT,
      text: dto.text || '',
      media: dto.media || null,
      location: dto.location || null,
      replyTo: dto.replyTo ? new Types.ObjectId(dto.replyTo) : null,
      status: dto.status || MessageStatus.SENT,
    });

    const saved = await message.save();

    // Update conversation last message & unread count
    await this.conversationsService.updateLastMessage(
      dto.conversationId,
      saved._id as Types.ObjectId,
      senderId,
    );

    return saved.populate([
      { path: 'senderId', select: 'phoneNumber' },
      { path: 'replyTo', select: 'text senderId type media' },
    ]);
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    before?: string,
  ) {
    // Participant authorization check
    await this.conversationsService.getConversationFormatted(conversationId, userId);

    const cId = new Types.ObjectId(conversationId);
    const query: any = { conversationId: cId };

    if (before) {
      query._id = { $lt: new Types.ObjectId(before) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: 1 }) // Chronological order
      .limit(limit)
      .populate('replyTo', 'text senderId type media')
      .exec();

    return messages;
  }

  async editMessage(messageId: string, senderId: string, newText: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== senderId) {
      throw new ForbiddenException('You can only edit messages sent by you');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted message');
    }

    message.text = newText;
    message.isEdited = true;
    message.editedAt = new Date();

    const saved = await message.save();
    return saved.populate('replyTo', 'text senderId type media');
  }

  async deleteMessage(messageId: string, userId: string, forEveryone = false) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (forEveryone) {
      if (message.senderId.toString() !== userId) {
        throw new ForbiddenException('Only the sender can delete a message for everyone');
      }
      message.text = 'This message was deleted';
      message.isDeleted = true;
      message.deletedForEveryone = true;
      message.media = null;
    } else {
      message.isDeleted = true;
    }

    return message.save();
  }

  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const uId = new Types.ObjectId(userId);
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId,
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId: uId as any, emoji });
    }

    const saved = await message.save();
    return saved.populate('replyTo', 'text senderId type media');
  }

  async togglePinMessage(messageId: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.isPinned = !message.isPinned;
    return message.save();
  }

  async toggleStarMessage(messageId: string, userId: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const uId = new Types.ObjectId(userId);
    const index = message.starredBy.findIndex((id) => id.toString() === userId);

    if (index > -1) {
      message.starredBy.splice(index, 1);
    } else {
      message.starredBy.push(uId as any);
    }

    return message.save();
  }

  async searchMessagesInConversation(conversationId: string, textQuery: string) {
    const cId = new Types.ObjectId(conversationId);
    return this.messageModel
      .find({
        conversationId: cId,
        text: { $regex: textQuery, $options: 'i' },
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getPinnedMessages(conversationId: string) {
    const cId = new Types.ObjectId(conversationId);
    return this.messageModel
      .find({ conversationId: cId, isPinned: true, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(conversationId: string, currentUserId: string) {
    const cId = new Types.ObjectId(conversationId);
    const uId = new Types.ObjectId(currentUserId);

    await this.messageModel.updateMany(
      { conversationId: cId, senderId: { $ne: uId }, status: { $ne: MessageStatus.READ } },
      { $set: { status: MessageStatus.READ } },
    );

    await this.conversationsService.resetUnreadCount(conversationId, currentUserId);
    return { success: true };
  }

  async markAsDeliveredForUser(userId: string) {
    const uId = new Types.ObjectId(userId);
    await this.messageModel.updateMany(
      { receiverId: uId, status: MessageStatus.SENT },
      { $set: { status: MessageStatus.DELIVERED } },
    );
    return { success: true };
  }

  async updateStatus(messageId: string, status: MessageStatus) {
    return this.messageModel.findByIdAndUpdate(
      messageId,
      { status },
      { new: true },
    );
  }
}
