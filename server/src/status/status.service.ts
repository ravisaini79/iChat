import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Status, StatusDocument } from './schemas/status.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateStatusDto } from './dto/create-status.dto';

@Injectable()
export class StatusService {
  constructor(
    @InjectModel(Status.name) private statusModel: Model<StatusDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private profilesService: ProfilesService,
  ) {}

  async createStatus(userId: string, dto: CreateStatusDto) {
    const uId = new Types.ObjectId(userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours TTL

    const statusDoc = new this.statusModel({
      userId: uId,
      type: dto.type,
      text: dto.text || '',
      backgroundColor: dto.backgroundColor || '#00A884',
      media: dto.media || null,
      expiresAt,
    });

    await statusDoc.save();
    return this.getFeedForUser(userId);
  }

  async getFeedForUser(currentUserId: string) {
    const now = new Date();
    const cId = new Types.ObjectId(currentUserId);

    // 1. My Active Statuses
    const myStatuses = await this.statusModel
      .find({ userId: cId, expiresAt: { $gt: now } })
      .sort({ createdAt: 1 })
      .exec();

    // 2. All Active Statuses from other users
    const otherStatuses = await this.statusModel
      .find({ userId: { $ne: cId }, expiresAt: { $gt: now } })
      .sort({ createdAt: 1 })
      .exec();

    // Group other statuses by user
    const groupedMap = new Map<string, StatusDocument[]>();
    for (const st of otherStatuses) {
      const uStr = st.userId.toString();
      if (!groupedMap.has(uStr)) {
        groupedMap.set(uStr, []);
      }
      groupedMap.get(uStr).push(st);
    }

    const contactUpdates = [];
    for (const [uStr, statusArray] of groupedMap.entries()) {
      const user = await this.userModel.findById(uStr);
      if (user) {
        const profile = await this.profilesService.findByUserId(user._id);
        const hasUnseen = statusArray.some(
          (s) => !s.viewers.some((v) => v.userId.toString() === currentUserId),
        );

        contactUpdates.push({
          user: {
            _id: user._id,
            displayName: profile?.displayName || user.phoneNumber,
            avatarUrl: profile?.avatarUrl || null,
          },
          hasUnseen,
          latestStatusAt: (statusArray[statusArray.length - 1] as any).createdAt || new Date(),
          statuses: statusArray,
        });
      }
    }

    return {
      myStatus: myStatuses,
      contactUpdates,
    };
  }

  async recordView(statusId: string, viewerUserId: string) {
    const statusDoc = await this.statusModel.findById(statusId);
    if (!statusDoc) throw new NotFoundException('Status not found');

    const vId = new Types.ObjectId(viewerUserId);
    const alreadyViewed = statusDoc.viewers.some((v) => v.userId.toString() === viewerUserId);

    if (!alreadyViewed) {
      statusDoc.viewers.push({ userId: vId as any, viewedAt: new Date() });
      await statusDoc.save();
    }

    return { success: true };
  }

  async deleteStatus(statusId: string, userId: string) {
    const statusDoc = await this.statusModel.findById(statusId);
    if (!statusDoc) throw new NotFoundException('Status not found');

    if (statusDoc.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own status');
    }

    await this.statusModel.deleteOne({ _id: statusDoc._id });
    return { success: true };
  }
}
