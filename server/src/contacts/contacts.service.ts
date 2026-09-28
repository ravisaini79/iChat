import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ProfilesService } from '../profiles/profiles.service';
import { SyncContactsDto } from './dto/sync-contacts.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private profilesService: ProfilesService,
  ) {}

  async syncContacts(userId: string, dto: SyncContactsDto) {
    const uId = new Types.ObjectId(userId);
    const currentUser = await this.userModel.findById(uId);

    const syncedContacts = [];

    for (const c of dto.contacts) {
      // Normalize phone number
      let normalized = c.phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
      if (!normalized.startsWith('+') && currentUser?.countryCode) {
        normalized = `${currentUser.countryCode}${normalized}`;
      }

      // Check if user exists in IChat
      const matchedUser = await this.userModel.findOne({ phoneNumber: normalized });

      const isIChatUser = !!matchedUser && matchedUser._id.toString() !== userId;
      const targetUserId = isIChatUser ? matchedUser._id : null;

      const contact = await this.contactModel.findOneAndUpdate(
        { userId: uId, contactPhoneNumber: normalized },
        {
          userId: uId,
          contactPhoneNumber: normalized,
          contactName: c.name,
          isIChatUser,
          targetUserId,
        },
        { upsert: true, new: true },
      );

      syncedContacts.push(contact);
    }

    return this.getContactsForUser(userId);
  }

  async getContactsForUser(userId: string) {
    const uId = new Types.ObjectId(userId);
    const contacts = await this.contactModel.find({ userId: uId }).exec();

    const ichatContacts = [];
    const inviteContacts = [];

    for (const c of contacts) {
      if (c.isIChatUser && c.targetUserId) {
        const targetUser = await this.userModel.findById(c.targetUserId);
        const profile = targetUser ? await this.profilesService.findByUserId(targetUser._id) : null;
        ichatContacts.push({
          contactId: c._id,
          name: c.contactName,
          phoneNumber: c.contactPhoneNumber,
          targetUserId: c.targetUserId,
          isIChatUser: true,
          profile: profile ? {
            displayName: profile.displayName,
            about: profile.about,
            avatarUrl: profile.avatarUrl,
          } : null,
          isOnline: targetUser?.isOnline || false,
          lastSeen: targetUser?.lastSeen || null,
        });
      } else {
        inviteContacts.push({
          contactId: c._id,
          name: c.contactName,
          phoneNumber: c.contactPhoneNumber,
          isIChatUser: false,
        });
      }
    }

    return { ichatContacts, inviteContacts };
  }

  // Fallback to get all registered IChat users except current user (for easy testing & discovery)
  async getAllRegisteredIChatUsers(currentUserId: string) {
    const cId = new Types.ObjectId(currentUserId);
    const users = await this.userModel.find({ _id: { $ne: cId } }).exec();

    const results = [];
    for (const u of users) {
      const profile = await this.profilesService.findByUserId(u._id);
      results.push({
        _id: u._id.toString(),
        userId: u._id.toString(),
        phoneNumber: u.phoneNumber,
        displayName: profile?.displayName || u.phoneNumber,
        about: profile?.about || 'Hey there! I am using IChat.',
        avatarUrl: profile?.avatarUrl || null,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
      });
    }
    return results;
  }

  async purgeContacts(userId: string) {
    const uId = new Types.ObjectId(userId);
    await this.contactModel.deleteMany({ userId: uId });
    return { success: true, message: 'Synced contacts purged successfully' };
  }
}
