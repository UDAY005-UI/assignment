import { ThrottlerModule } from '@nestjs/throttler';

export const ThrottlerConfig = ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,
    limit: 5,
  },
  {
    name: 'long',
    ttl: 60000,
    limit: 100,
  },
]);
