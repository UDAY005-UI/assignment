import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { prisma, Prisma } from '@repo/database';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const idempotencyKeyHeader = req.headers['idempotency-key'];

    const idempotencyKey =
      typeof idempotencyKeyHeader === 'string'
        ? idempotencyKeyHeader
        : Array.isArray(idempotencyKeyHeader)
          ? idempotencyKeyHeader[0]
          : undefined;

    if (!['POST', 'PATCH', 'DELETE'].includes(req.method) || !idempotencyKey) {
      return next();
    }

    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      res.status(existing.statusCode).json(existing.response);
      return;
    }

    const originalJson = res.json.bind(res) as Response['json'];

    res.json = ((body: unknown) => {
      void prisma.idempotencyKey
        .create({
          data: {
            key: idempotencyKey,
            response: body as Prisma.InputJsonValue,
            statusCode: res.statusCode,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
        .catch((err: unknown) => {
          console.error('Idempotency save failed:', err);
        });

      return originalJson(body);
    }) as Response['json'];

    next();
  }
}
