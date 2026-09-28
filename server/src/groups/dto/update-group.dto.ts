import { IsOptional, IsString, MaxLength, IsObject } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  settings?: {
    editGroupInfo?: 'ALL' | 'ADMINS';
    sendMessages?: 'ALL' | 'ADMINS';
  };
}
