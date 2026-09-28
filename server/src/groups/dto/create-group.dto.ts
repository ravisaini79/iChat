import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty({ message: 'Group name is required' })
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsArray()
  @IsNotEmpty({ message: 'Select at least one member' })
  memberIds: string[];
}
