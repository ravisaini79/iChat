import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema({ timestamps: true })
export class GroupSettings {
  @Prop({ default: 'ADMINS' })
  editGroupInfo: 'ALL' | 'ADMINS';

  @Prop({ default: 'ALL' })
  sendMessages: 'ALL' | 'ADMINS';
}

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ default: null })
  avatarUrl: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  admins: Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  members: Types.ObjectId[];

  @Prop({ type: GroupSettings, default: () => ({ editGroupInfo: 'ADMINS', sendMessages: 'ALL' }) })
  settings: GroupSettings;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', default: null })
  conversationId: Types.ObjectId;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
GroupSchema.index({ members: 1 });
