import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type CallDocument = Call & Document;

@Schema({ timestamps: true })
export class Call {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  callerId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  receiverId: Types.ObjectId;

  @Prop({ type: String, enum: ['AUDIO', 'VIDEO'], default: 'AUDIO' })
  type: string;

  @Prop({ type: String, enum: ['MISSED', 'COMPLETED', 'REJECTED', 'BUSY'], default: 'COMPLETED' })
  status: string;

  @Prop({ default: Date.now })
  startedAt: Date;

  @Prop({ default: Date.now })
  endedAt: Date;

  @Prop({ default: 0 })
  duration: number; // in seconds
}

export const CallSchema = SchemaFactory.createForClass(Call);
CallSchema.index({ callerId: 1, receiverId: 1 });
