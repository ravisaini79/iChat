import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid E.164 format (e.g. +919876543210)',
  })
  phoneNumber: string;

  @IsNotEmpty({ message: 'Country code is required' })
  @IsString()
  countryCode: string;
}
