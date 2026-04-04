import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { MailService } from './services/mail.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [AuthService, GoogleStrategy, JwtStrategy, MailService],
  controllers: [AuthController],
})
export class AuthModule {}
