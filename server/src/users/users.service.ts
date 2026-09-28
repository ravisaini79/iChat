import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { ProfilesService } from '../profiles/profiles.service';
import { ProfileSetupDto } from './dto/profile-setup.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private profilesService: ProfilesService,
  ) {}

  async findById(userId: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber });
  }

  async getUserWithProfile(userId: string | Types.ObjectId) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const profile = await this.profilesService.findByUserId(user._id);
    return {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      countryCode: user.countryCode,
      isProfileComplete: user.isProfileComplete,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      profile: profile ? {
        displayName: profile.displayName,
        about: profile.about,
        avatarUrl: profile.avatarUrl,
      } : null,
    };
  }

  async setupProfile(userId: string, dto: ProfileSetupDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.profilesService.createOrUpdateProfile(
      user._id,
      dto.displayName,
      dto.about,
      dto.avatarUrl,
    );

    user.isProfileComplete = true;
    await user.save();

    return {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      isProfileComplete: user.isProfileComplete,
      profile: {
        displayName: profile.displayName,
        about: profile.about,
        avatarUrl: profile.avatarUrl,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.profilesService.createOrUpdateProfile(
      user._id,
      dto.displayName || 'User',
      dto.about,
      dto.avatarUrl,
    );

    return {
      _id: user._id,
      phoneNumber: user.phoneNumber,
      isProfileComplete: user.isProfileComplete,
      profile: {
        displayName: profile.displayName,
        about: profile.about,
        avatarUrl: profile.avatarUrl,
      },
    };
  }

  async searchUsers(currentUserId: string, query: string) {
    const currentId = new Types.ObjectId(currentUserId);
    const q = (query || '').trim();
    if (!q) {
      return this.getAllRegisteredUsers(currentUserId);
    }

    const safeEscaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeEscaped, 'i');
    const normalizedPhone = q.replace(/[\s\-\(\)\+]/g, '');
    const phoneRegex = normalizedPhone ? new RegExp(normalizedPhone, 'i') : regex;

    // 1. Search by phone number or regex on phone
    const phoneUsers = await this.userModel.find({
      _id: { $ne: currentId },
      $or: [
        { phoneNumber: regex },
        { phoneNumber: phoneRegex },
      ],
    }).exec();

    // 2. Search by display name in Profile schema
    const profiles = await this.profilesService.searchByDisplayName(q);
    const profileUserIds = profiles
      .map((p) => p.userId)
      .filter((id) => id.toString() !== currentUserId);

    const nameUsers = await this.userModel.find({
      _id: { $in: profileUserIds },
    }).exec();

    // Deduplicate matching users
    const userMap = new Map<string, UserDocument>();
    for (const u of [...phoneUsers, ...nameUsers]) {
      userMap.set(u._id.toString(), u);
    }

    const results = [];
    for (const u of userMap.values()) {
      const profile = await this.profilesService.findByUserId(u._id);
      results.push({
        _id: u._id.toString(),
        userId: u._id.toString(),
        name: profile?.displayName || u.phoneNumber,
        displayName: profile?.displayName || u.phoneNumber,
        phoneNumber: u.phoneNumber,
        profileImage: profile?.avatarUrl || null,
        avatarUrl: profile?.avatarUrl || null,
        about: profile?.about || 'Hey there! I am using IChat.',
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
      });
    }

    return results;
  }

  async getAllRegisteredUsers(currentUserId: string) {
    const currentId = new Types.ObjectId(currentUserId);
    const users = await this.userModel.find({ _id: { $ne: currentId } }).exec();

    const results = [];
    for (const u of users) {
      const profile = await this.profilesService.findByUserId(u._id);
      results.push({
        _id: u._id.toString(),
        userId: u._id.toString(),
        name: profile?.displayName || u.phoneNumber,
        displayName: profile?.displayName || u.phoneNumber,
        phoneNumber: u.phoneNumber,
        profileImage: profile?.avatarUrl || null,
        avatarUrl: profile?.avatarUrl || null,
        about: profile?.about || 'Hey there! I am using IChat.',
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
      });
    }
    return results;
  }
}
