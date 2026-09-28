import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { MessageType } from '../schemas/message.schema';

export class SendMessageDto {
  @IsNotEmpty({ message: 'Conversation ID is required' })
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  media?: any;

  @IsOptional()
  @IsString()
  replyTo?: string;

  @IsOptional()
  @IsString()
  clientMessageId?: string;

  @IsOptional()
  location?: any;

  @IsOptional()
  status?: any;
}
