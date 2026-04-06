import { Queue } from 'bullmq';
import { getRedisClient } from '@repo/queue';

export const auditQueue = new Queue('audit-log', {
  connection: getRedisClient(),
});
