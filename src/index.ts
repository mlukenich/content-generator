import { renderQueue } from './core/queue';
import { createApp } from './app';
import { validateRuntimeEnv } from './config/env';
import { logInfo } from './core/logging';

validateRuntimeEnv('app');

const app = createApp({ queueForBoard: renderQueue });
const port = process.env.PORT || 3000;

app.listen(port, () => {
  logInfo('Server started.', { phase: 'startup', port: Number(port) });
  logInfo('Bull-Board available.', { phase: 'startup', path: '/admin/queues', port: Number(port) });
});
