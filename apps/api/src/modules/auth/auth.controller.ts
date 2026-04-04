/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google.guard';
import { Role } from '@repo/database';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private jwt: JwtService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any) {
    const role = req.query.state as Role;

    if (!role || !['VIEWER', 'ANALYST', 'ADMIN'].includes(role)) {
      throw new BadRequestException(
        'Valid role required: VIEWER | ANALYST | ADMIN',
      );
    }

    return this.authService.googleLogin(req.user, role);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body('token') token: string,
    @Body('otp') otp: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!otp || !token) {
      throw new BadRequestException('Token and OTP required');
    }

    const payload = this.jwt.verify(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const { accessToken, refreshToken } = await this.authService.verifyOtp(
      payload.sub,
      otp,
    );

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }

  @Post('refresh')
  async refreshAccessToken(@Req() req: any) {
    const token = req.cookies?.refreshToken;

    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }

    return this.authService.refreshToken(token);
  }
}
