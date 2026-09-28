import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from './schemas/group.schema';
import { Conversation, ConversationDocument } from '../conversations/schemas/conversation.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Message, MessageDocument, MessageType } from '../messages/schemas/message.schema';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private profilesService: ProfilesService,
  ) {}

  async createGroup(creatorId: string, dto: CreateGroupDto) {
    const cId = new Types.ObjectId(creatorId);
    const memberObjectIds = dto.memberIds.map((id) => new Types.ObjectId(id));

    // Ensure creator is included in members
    const allMembersSet = new Set([creatorId, ...dto.memberIds]);
    const allMembersList = Array.from(allMembersSet).map((id) => new Types.ObjectId(id));

    // 1. Create Conversation for group
    const conversation = new this.conversationModel({
      participants: allMembersList,
      isGroup: true,
      groupName: dto.name,
      groupAvatarUrl: dto.avatarUrl || null,
      lastMessageAt: new Date(),
    });
    await conversation.save();

    // 2. Create Group record
    const group = new this.groupModel({
      name: dto.name,
      description: dto.description || '',
      avatarUrl: dto.avatarUrl || null,
      creatorId: cId,
      admins: [cId as any],
      members: allMembersList as any,
      conversationId: conversation._id as any,
    });
    await group.save();

    // 3. Create System Message
    const creatorUser = await this.userModel.findById(cId);
    const creatorProfile = creatorUser ? await this.profilesService.findByUserId(cId) : null;
    const creatorName = creatorProfile?.displayName || 'User';

    const systemMsg = new this.messageModel({
      conversationId: conversation._id,
      senderId: cId,
      type: MessageType.SYSTEM,
      text: `${creatorName} created group "${dto.name}"`,
    });
    await systemMsg.save();

    conversation.lastMessageId = systemMsg._id as any;
    await conversation.save();

    return this.getGroupDetails(group._id.toString(), creatorId);
  }

  async getGroupDetails(groupId: string, userId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const memberDetails = [];
    for (const mId of group.members) {
      const u = await this.userModel.findById(mId);
      if (u) {
        const profile = await this.profilesService.findByUserId(u._id);
        const isAdmin = group.admins.some((a) => a.toString() === u._id.toString());
        memberDetails.push({
          userId: u._id,
          phoneNumber: u.phoneNumber,
          displayName: profile?.displayName || u.phoneNumber,
          about: profile?.about || '',
          avatarUrl: profile?.avatarUrl || null,
          isAdmin,
          isOnline: u.isOnline,
          lastSeen: u.lastSeen,
        });
      }
    }

    const currentIsAdmin = group.admins.some((a) => a.toString() === userId);

    return {
      _id: group._id,
      name: group.name,
      description: group.description,
      avatarUrl: group.avatarUrl,
      creatorId: group.creatorId,
      conversationId: group.conversationId,
      settings: group.settings,
      members: memberDetails,
      isAdmin: currentIsAdmin,
    };
  }

  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isAdmin = group.admins.some((a) => a.toString() === userId);
    if (group.settings?.editGroupInfo === 'ADMINS' && !isAdmin) {
      throw new ForbiddenException('Only group admins can edit group info');
    }

    if (dto.name) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description;
    if (dto.avatarUrl !== undefined) group.avatarUrl = dto.avatarUrl;
    if (dto.settings && isAdmin) {
      group.settings = { ...group.settings, ...dto.settings };
    }

    await group.save();

    // Sync with conversation
    await this.conversationModel.findByIdAndUpdate(group.conversationId, {
      groupName: group.name,
      groupAvatarUrl: group.avatarUrl,
    });

    return this.getGroupDetails(groupId, userId);
  }

  async addMembers(groupId: string, adminUserId: string, memberIds: string[]) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    const isAdmin = group.admins.some((a) => a.toString() === adminUserId);
    if (!isAdmin) throw new ForbiddenException('Only admins can add members');

    const currentMemberIds = group.members.map((m) => m.toString());
    const newMembers = memberIds.filter((id) => !currentMemberIds.includes(id));

    newMembers.forEach((id) => group.members.push(new Types.ObjectId(id) as any));
    await group.save();

    // Sync conversation participants
    await this.conversationModel.findByIdAndUpdate(group.conversationId, {
      $addToSet: { participants: { $each: newMembers.map((id) => new Types.ObjectId(id)) } },
    });

    return this.getGroupDetails(groupId, adminUserId);
  }

  async removeMember(groupId: string, adminUserId: string, targetUserId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    const isAdmin = group.admins.some((a) => a.toString() === adminUserId);
    if (!isAdmin) throw new ForbiddenException('Only admins can remove members');

    group.members = group.members.filter((m) => m.toString() !== targetUserId);
    group.admins = group.admins.filter((a) => a.toString() !== targetUserId);
    await group.save();

    await this.conversationModel.findByIdAndUpdate(group.conversationId, {
      $pull: { participants: new Types.ObjectId(targetUserId) },
    });

    return this.getGroupDetails(groupId, adminUserId);
  }

  async toggleAdminRole(groupId: string, adminUserId: string, targetUserId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    const isAdmin = group.admins.some((a) => a.toString() === adminUserId);
    if (!isAdmin) throw new ForbiddenException('Only admins can manage roles');

    const tId = new Types.ObjectId(targetUserId);
    const existingIndex = group.admins.findIndex((a) => a.toString() === targetUserId);

    if (existingIndex > -1) {
      group.admins.splice(existingIndex, 1);
    } else {
      group.admins.push(tId as any);
    }

    await group.save();
    return this.getGroupDetails(groupId, adminUserId);
  }

  async leaveGroup(groupId: string, userId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    group.members = group.members.filter((m) => m.toString() !== userId);
    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    await this.conversationModel.findByIdAndUpdate(group.conversationId, {
      $pull: { participants: new Types.ObjectId(userId) },
    });

    return { success: true, message: 'You have left the group' };
  }

  async getGroupMedia(groupId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    return this.messageModel
      .find({
        conversationId: group.conversationId,
        type: { $in: [MessageType.IMAGE, MessageType.VIDEO, MessageType.DOCUMENT, MessageType.AUDIO] },
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
