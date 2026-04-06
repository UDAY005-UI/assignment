/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { prisma } from '@repo/database';
import { JwtService } from '@nestjs/jwt';
import { generateOtp } from './services/otp.service';
import { MailService } from './services/mail.service';
import { Role } from '@repo/database';
import * as bcrypt from 'bcrypt';
import { addDays } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async googleLogin(profile: any, role: Role) {
    const generatedOtp = await generateOtp();

    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        otpHash: generatedOtp.otpHash,
        otpExpiry: generatedOtp.otpExpiry,
      },
      create: {
        email: profile.email,
        name: profile.name,
        role, // VIEWER | ANALYST | ADMIN
        otpHash: generatedOtp.otpHash,
        otpExpiry: generatedOtp.otpExpiry,
      },
    });

    await this.mail.sendOtpEmail(user.email, generatedOtp.otp);

    const token = this.jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        tokenType: 'temp',
      },
      {
        secret: `${process.env.JWT_ACCESS_SECRET}`,
        expiresIn: '10m',
      },
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    };
  }

  async verifyOtp(userId: string, otp: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.otpHash || !user.otpExpiry) {
      throw new BadRequestException('OTP not set');
    }

    if (user.otpExpiry < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const valid = await bcrypt.compare(otp, user.otpHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpHash: null,
        otpExpiry: null,
      },
    });

    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        isVerified: true,
        tokenType: 'access',
      },
      {
        secret: `${process.env.JWT_ACCESS_SECRET}`,
        expiresIn: '60m',
      },
    );

    const refreshToken = this.jwt.sign(
      {
        sub: user.id,
        tokenType: 'refresh',
      },
      {
        secret: `${process.env.JWT_REFRESH_SECRET}`,
        expiresIn: '30d',
      },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: hashedRefreshToken,
        refreshExpiresAt: addDays(new Date(), 30),
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(token: string) {
    let payload: any;

    try {
      payload = this.jwt.verify(token, {
        secret: `${process.env.JWT_REFRESH_SECRET}`, // fixed: was JWT_REFRESH_TOKEN in your original
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Wrong token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshTokenHash || !user.refreshExpiresAt) {
      throw new UnauthorizedException('Refresh not allowed');
    }

    if (user.refreshExpiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is inactive');
    }

    const match = await bcrypt.compare(token, user.refreshTokenHash);

    if (!match) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const newAccessToken = this.jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
        isVerified: user.isVerified,
        tokenType: 'access',
      },
      {
        secret: `${process.env.JWT_ACCESS_SECRET}`,
        expiresIn: '60m',
      },
    );

    return { accessToken: newAccessToken };
  }
}
