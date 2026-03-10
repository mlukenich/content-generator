import { renderQueue } from './core/queue';
import { createApp } from './app';
import { env } from './config/env-config';
import { logInfo } from './core/logging';

const app = createApp({ queueForBoard: renderQueue });
const port = env.PORT;

app.listen(port, () => {
  logInfo('Server started.', { phase: 'startup', port });
  logInfo('Bull-Board available.', { phase: 'startup', path: '/admin/queues', port });
});
