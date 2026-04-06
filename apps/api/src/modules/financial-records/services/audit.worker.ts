/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Worker } from 'bullmq';
import { prisma } from '@repo/database';
import { getRedisClient } from '@repo/queue';

export const auditWorker = new Worker(
  'audit-log',
  async (job) => {
    const { userId, recordId, action, snapshot } = job.data;

    await prisma.auditLog.create({
      data: {
        userId,
        recordId,
        action,
        snapshot,
      },
    });
  },
  {
    connection: getRedisClient(),
  },
);
