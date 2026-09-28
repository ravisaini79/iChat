import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private profilesService: ProfilesService,
  ) {}

  async globalSearch(userId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return { users: [], messages: [], conversations: [] };
    }

    const safeEscaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeEscaped, 'i');
    const uId = new Types.ObjectId(userId);

    // 1. Search Users
    const matchedUsers = await this.userModel.find({
      _id: { $ne: uId },
      phoneNumber: regex,
    });

    const userResults = [];
    for (const u of matchedUsers) {
      const profile = await this.profilesService.findByUserId(u._id);
      if (profile && (regex.test(profile.displayName) || regex.test(u.phoneNumber))) {
        userResults.push({
          userId: u._id,
          displayName: profile.displayName,
          phoneNumber: u.phoneNumber,
          about: profile.about,
          avatarUrl: profile.avatarUrl,
        });
      }
    }

    // 2. Search Conversations (User's active conversations)
    const userConvs = await this.conversationModel.find({ participants: uId });
    const convIds = userConvs.map((c) => c._id);

    // 3. Search Messages
    const matchedMessages = await this.messageModel
      .find({
        conversationId: { $in: convIds },
        text: regex,
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('senderId', 'phoneNumber')
      .exec();

    return {
      users: userResults,
      messages: matchedMessages,
    };
  }
}
