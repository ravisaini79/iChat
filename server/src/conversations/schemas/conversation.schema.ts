import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    required: true,
    index: true,
  })
  participants: MongooseSchema.Types.ObjectId[];

  @Prop({ default: false })
  isGroup: boolean;

  @Prop({ type: String, default: null })
  groupName: string;

  @Prop({ type: String, default: null })
  groupAvatarUrl: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message', default: null })
  lastMessageId: MongooseSchema.Types.ObjectId;

  @Prop({ default: Date.now, index: true })
  lastMessageAt: Date;

  @Prop({ type: Map, of: Number, default: {} })
  unreadCounts: Map<string, number>;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
