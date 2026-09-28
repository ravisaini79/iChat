import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private profilesService: ProfilesService,
  ) {}

  async findOrCreateOneToOneConversation(userId: string, targetUserId: string) {
    if (!targetUserId) {
      throw new BadRequestException('Target user ID is required');
    }

    const uIdStr = userId.toString();
    const tIdStr = targetUserId.toString();
    const uId = new Types.ObjectId(uIdStr);
    const tId = new Types.ObjectId(tIdStr);
    const isSelf = uIdStr === tIdStr;

    const targetUser = await this.userModel.findById(tId);
    if (!targetUser) {
      throw new NotFoundException('Target user does not exist');
    }

    // Find existing 1-to-1 conversation
    let conv = isSelf
      ? await this.conversationModel.findOne({
          isGroup: false,
          $or: [
            { participants: [uId] },
            { participants: [uId, uId] },
          ],
        })
      : await this.conversationModel.findOne({
          isGroup: false,
          participants: { $all: [uId, tId] },
        });

    if (!conv) {
      conv = new this.conversationModel({
        participants: isSelf ? [uId] : [uId, tId],
        isGroup: false,
        unreadCounts: new Map<string, number>(),
        lastMessageAt: new Date(),
      });
      await conv.save();
    }

    return this.getConversationFormatted(conv._id.toString(), userId);
  }

  async findOrCreateByPhoneNumber(userId: string, phoneNumber: string) {
    let normalized = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
    const currentUser = await this.userModel.findById(userId);
    if (!normalized.startsWith('+') && currentUser?.countryCode) {
      normalized = `${currentUser.countryCode}${normalized}`;
    }

    // Try matching full or regex ending
    let matchedUser = await this.userModel.findOne({ phoneNumber: normalized });
    if (!matchedUser) {
      // Clean digits only for partial match fallback
      const digitsOnly = normalized.replace(/\+/g, '');
      matchedUser = await this.userModel.findOne({
        phoneNumber: { $regex: `${digitsOnly}$` },
      });
    }

    if (!matchedUser) {
      throw new NotFoundException(`No registered IChat user found with phone number "${phoneNumber}"`);
    }

    return this.findOrCreateOneToOneConversation(userId, matchedUser._id.toString());
  }

  async getUserConversations(userId: string) {
    const uId = new Types.ObjectId(userId);
    const convs = await this.conversationModel
      .find({ participants: uId })
      .sort({ lastMessageAt: -1 })
      .populate('lastMessageId')
      .exec();

    const results = [];
    for (const conv of convs) {
      const formatted = await this.formatConversation(conv, userId);
      results.push(formatted);
    }
    return results;
  }

  async getConversationFormatted(conversationId: string, currentUserId: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new BadRequestException('Invalid conversation ID format');
    }

    const conv = await this.conversationModel
      .findById(conversationId)
      .populate('lastMessageId')
      .exec();

    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    const cId = currentUserId.toString();
    const isParticipant = conv.participants.some((p) => p.toString() === cId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not authorized to view this conversation');
    }

    return this.formatConversation(conv, currentUserId);
  }

  async formatConversation(conv: ConversationDocument, currentUserId: string) {
    const cId = currentUserId.toString();
    const opponentId = conv.participants.find((p) => p.toString() !== cId);
    const targetId = opponentId || conv.participants[0];

    let opponentInfo = null;
    if (targetId) {
      const user = await this.userModel.findById(targetId);
      if (user) {
        const profile = await this.profilesService.findByUserId(user._id);
        const isSelf = user._id.toString() === cId;
        opponentInfo = {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          displayName: isSelf ? `${profile?.displayName || 'You'} (You)` : (profile?.displayName || user.phoneNumber),
          about: isSelf ? 'Message yourself' : (profile?.about || ''),
          avatarUrl: profile?.avatarUrl || null,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          isSelf,
        };
      }
    }

    const unreadMap = conv.unreadCounts || new Map();
    const unreadCount = unreadMap.get ? (unreadMap.get(cId) || 0) : (unreadMap[cId] || 0);

    return {
      _id: conv._id,
      isGroup: conv.isGroup,
      groupName: conv.groupName,
      groupAvatarUrl: conv.groupAvatarUrl,
      lastMessage: conv.lastMessageId || null,
      lastMessageAt: conv.lastMessageAt,
      unreadCount,
      opponent: opponentInfo,
    };
  }

  async updateLastMessage(conversationId: string, messageId: Types.ObjectId, senderId: string) {
    const conv = await this.conversationModel.findById(conversationId);
    if (conv) {
      conv.lastMessageId = messageId as any;
      conv.lastMessageAt = new Date();

      // Increment unread count for other participants
      const unreadMap = conv.unreadCounts || new Map();
      conv.participants.forEach((p) => {
        const pId = p.toString();
        if (pId !== senderId) {
          const currentCount = unreadMap.get ? (unreadMap.get(pId) || 0) : (unreadMap[pId] || 0);
          if (unreadMap.set) {
            unreadMap.set(pId, currentCount + 1);
          } else {
            unreadMap[pId] = currentCount + 1;
          }
        }
      });
      conv.unreadCounts = unreadMap;
      await conv.save();
    }
  }

  async resetUnreadCount(conversationId: string, userId: string) {
    const conv = await this.conversationModel.findById(conversationId);
    if (conv) {
      const unreadMap = conv.unreadCounts || new Map();
      if (unreadMap.set) {
        unreadMap.set(userId, 0);
      } else {
        unreadMap[userId] = 0;
      }
      conv.unreadCounts = unreadMap;
      await conv.save();
    }
  }
}
