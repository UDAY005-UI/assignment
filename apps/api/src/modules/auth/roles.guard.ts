import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    role?: string;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles =
      this.reflector.get<string[]>('roles', context.getHandler()) ?? [];

    if (roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userRole = request.user?.role;

    if (!userRole) return false;

    return roles.includes(userRole);
  }
}
