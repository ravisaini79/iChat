import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProfileDocument = Profile & Document;

@Schema({ timestamps: true })
export class Profile {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  displayName: string;

  @Prop({ default: 'Hey there! I am using IChat.', trim: true })
  about: string;

  @Prop({ default: null })
  avatarUrl: string;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
