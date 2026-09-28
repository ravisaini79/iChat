import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  phoneNumber: string;

  @Prop({ required: true, default: '+91' })
  countryCode: string;

  @Prop({ default: false })
  isProfileComplete: boolean;

  @Prop({ default: null })
  refreshToken: string;

  @Prop({ default: true })
  isOnline: boolean;

  @Prop({ default: Date.now })
  lastSeen: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
