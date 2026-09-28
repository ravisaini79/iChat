import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, index: true })
  contactPhoneNumber: string;

  @Prop({ required: true })
  contactName: string;

  @Prop({ default: false })
  isIChatUser: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  targetUserId: MongooseSchema.Types.ObjectId;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.index({ userId: 1, contactPhoneNumber: 1 }, { unique: true });
