import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProfileSetupDto {
  @IsNotEmpty({ message: 'Display name is required' })
  @IsString()
  @MaxLength(50, { message: 'Display name cannot exceed 50 characters' })
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(140, { message: 'About status cannot exceed 140 characters' })
  about?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
