import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OTPDocument = OTP & Document;

@Schema({ timestamps: true })
export class OTP {
  @Prop({ required: true, index: true })
  phoneNumber: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  isVerified: boolean;
}

export const OTPSchema = SchemaFactory.createForClass(OTP);
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-expire documents after expiration
