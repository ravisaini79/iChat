import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type StatusDocument = Status & Document;

@Schema({ timestamps: true })
export class Status {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ['TEXT', 'IMAGE', 'VIDEO'], default: 'TEXT' })
  type: string;

  @Prop({ default: '' })
  text: string;

  @Prop({ default: '#00A884' })
  backgroundColor: string;

  @Prop({ type: Object, default: null })
  media: any;

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  viewers: Array<{ userId: Types.ObjectId; viewedAt: Date }>;

  @Prop({ required: true, index: true })
  expiresAt: Date;
}

export const StatusSchema = SchemaFactory.createForClass(Status);
StatusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // 24 hour TTL auto cleanup
