import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Call, CallDocument } from './schemas/call.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ProfilesService } from '../profiles/profiles.service';

import { DeviceCallLog, DeviceCallLogDocument } from './schemas/device-call-log.schema';

@Injectable()
export class CallsService {
  constructor(
    @InjectModel(Call.name) private callModel: Model<CallDocument>,
    @InjectModel(DeviceCallLog.name) private deviceCallLogModel: Model<DeviceCallLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private profilesService: ProfilesService,
  ) {}

  async syncDeviceCallLogs(userId: string, logs: Array<{ phoneNumber: string; callerName?: string; callType: string; duration?: number; timestamp?: string | number | Date }>) {
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return { syncedCount: 0 };
    }

    const uId = new Types.ObjectId(userId);
    const docs = logs.map((item) => ({
      userId: uId,
      phoneNumber: (item.phoneNumber || '').trim(),
      callerName: item.callerName || '',
      callType: (item.callType || 'UNKNOWN').toUpperCase(),
      duration: Number(item.duration || 0),
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
    }));

    await this.deviceCallLogModel.insertMany(docs, { ordered: false }).catch(() => {});
    return { syncedCount: docs.length };
  }

  async logCall(
    callerId: string,
    receiverId: string,
    type: 'AUDIO' | 'VIDEO',
    status: 'MISSED' | 'COMPLETED' | 'REJECTED' | 'BUSY',
    duration = 0,
  ) {
    const callDoc = new this.callModel({
      callerId: new Types.ObjectId(callerId),
      receiverId: new Types.ObjectId(receiverId),
      type,
      status,
      duration,
      endedAt: new Date(),
    });
    return callDoc.save();
  }

  async getUserCallHistory(userId: string) {
    const uId = new Types.ObjectId(userId);
    const calls = await this.callModel
      .find({ $or: [{ callerId: uId }, { receiverId: uId }] })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    const history = [];
    for (const c of calls) {
      const isOutgoing = c.callerId.toString() === userId;
      const targetId = isOutgoing ? c.receiverId : c.callerId;

      const targetUser = await this.userModel.findById(targetId);
      const profile = targetUser ? await this.profilesService.findByUserId(targetUser._id) : null;

      history.push({
        _id: c._id,
        type: c.type,
        status: c.status,
        isOutgoing,
        duration: c.duration,
        createdAt: (c as any).createdAt || c.startedAt,
        contact: {
          _id: targetUser?._id,
          displayName: profile?.displayName || targetUser?.phoneNumber || 'IChat User',
          avatarUrl: profile?.avatarUrl || null,
          phoneNumber: targetUser?.phoneNumber,
        },
      });
    }

    return history;
  }
}
