import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { OTP, OTPDocument } from './schemas/otp.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ProfilesService } from '../profiles/profiles.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(OTP.name) private otpModel: Model<OTPDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private profilesService: ProfilesService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const { phoneNumber, countryCode } = dto;
    
    // Generate 6-digit OTP code (Default '123456' for predictable dev testing, or random in prod)
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const code = nodeEnv === 'development' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();

    // 5 minutes expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const hashedCode = await bcrypt.hash(code, 10);

    await this.otpModel.deleteMany({ phoneNumber });
    await this.otpModel.create({
      phoneNumber,
      code: hashedCode,
      expiresAt,
    });

    this.logger.log(`[OTP SENT] Phone: ${phoneNumber} | Dev Code: ${code}`);

    return {
      message: `OTP sent successfully to ${phoneNumber}`,
      devOtp: nodeEnv === 'development' ? code : undefined,
      expiresInSeconds: 300,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { phoneNumber, code } = dto;

    const otpRecord = await this.otpModel.findOne({
      phoneNumber,
      isVerified: false,
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP expired or not requested. Please request a new OTP.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await this.otpModel.deleteOne({ _id: otpRecord._id });
      throw new BadRequestException('OTP expired. Please request a new OTP.');
    }

    const isValid = await bcrypt.compare(code, otpRecord.code);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestException('Invalid OTP code. Please try again.');
    }

    // Mark verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    // Find or create User
    let user = await this.userModel.findOne({ phoneNumber });
    if (!user) {
      user = new this.userModel({
        phoneNumber,
        isProfileComplete: false,
      });
      await user.save();
    }

    const tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);
    
    // Save hashed refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    const profile = await this.profilesService.findByUserId(user._id);

    return {
      message: 'OTP verified successfully',
      tokens,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        isProfileComplete: user.isProfileComplete,
        profile: profile ? {
          displayName: profile.displayName,
          about: profile.about,
          avatarUrl: profile.avatarUrl,
        } : null,
      },
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'ichat_super_secret_refresh_key_2026_key_change_me';
      const payload = this.jwtService.verify(dto.refreshToken, { secret: refreshSecret });

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isMatch = await bcrypt.compare(dto.refreshToken, user.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid or revoked refresh token');
      }

      const tokens = await this.generateTokens(user._id.toString(), user.phoneNumber);
      user.refreshToken = await bcrypt.hash(tokens.refreshToken, 10);
      await user.save();

      return {
        message: 'Tokens refreshed successfully',
        tokens,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: string, phoneNumber: string) {
    const accessSecret = this.configService.get<string>('JWT_SECRET') || 'ichat_super_secret_access_key_2026_key_change_me';
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'ichat_super_secret_refresh_key_2026_key_change_me';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, phoneNumber },
        { secret: accessSecret, expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, phoneNumber },
        { secret: refreshSecret, expiresIn: '30d' },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
