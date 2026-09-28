import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateStatusDto {
  @IsNotEmpty()
  @IsEnum(['TEXT', 'IMAGE', 'VIDEO'])
  type: 'TEXT' | 'IMAGE' | 'VIDEO';

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  media?: any;
}
