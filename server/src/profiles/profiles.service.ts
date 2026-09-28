import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile, ProfileDocument } from './schemas/profile.schema';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
  ) {}

  async createOrUpdateProfile(
    userId: string | Types.ObjectId,
    displayName: string,
    about?: string,
    avatarUrl?: string,
  ): Promise<ProfileDocument> {
    const uId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    
    let profile = await this.profileModel.findOne({ userId: uId });
    if (!profile) {
      profile = new this.profileModel({
        userId: uId,
        displayName,
        about: about || 'Hey there! I am using IChat.',
        avatarUrl: avatarUrl || null,
      });
    } else {
      if (displayName) profile.displayName = displayName;
      if (about !== undefined) profile.about = about;
      if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;
    }
    return profile.save();
  }

  async findByUserId(userId: string | Types.ObjectId): Promise<ProfileDocument | null> {
    const uId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return this.profileModel.findOne({ userId: uId });
  }

  async searchByDisplayName(query: string): Promise<ProfileDocument[]> {
    const regex = new RegExp(query, 'i');
    return this.profileModel.find({ displayName: regex }).exec();
  }
}
