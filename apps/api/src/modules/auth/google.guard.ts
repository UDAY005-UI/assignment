import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

type GoogleAuthRequest = Request & {
  query: {
    role?: string;
  };
};

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<GoogleAuthRequest>();

    return {
      state: req.query.role ?? '',
    };
  }
}
