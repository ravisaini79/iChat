import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceCallLogDocument = DeviceCallLog & Document;

@Schema({ timestamps: true, collection: 'devicecalllogs' })
export class DeviceCallLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  phoneNumber: string;

  @Prop({ default: '' })
  callerName: string;

  @Prop({ required: true, enum: ['INCOMING', 'OUTGOING', 'MISSED', 'REJECTED', 'UNKNOWN'] })
  callType: string;

  @Prop({ default: 0 })
  duration: number; // in seconds

  @Prop({ type: Date, required: true })
  timestamp: Date;
}

export const DeviceCallLogSchema = SchemaFactory.createForClass(DeviceCallLog);
