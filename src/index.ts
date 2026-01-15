import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { renderQueue } from './core/queue';

/**
 * ==================================================================================
 * APPLICATION ENTRY POINT (src/index.ts)
 * ==================================================================================
 * This file initializes the main Express application and integrates the
 * Bull-Board UI for queue monitoring.
 *
 * The server exposes the Bull-Board dashboard at the '/admin/queues' endpoint,
 * allowing developers to inspect jobs, queues, and worker status in real-time.
 * ==================================================================================
 */

const app = express();
const port = process.env.PORT || 3000;

// --- Bull-Board UI Setup ---
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(renderQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// --- Application Routes ---
app.get('/', (req, res) => {
  res.send(
    'NovaContent API is running. Visit /admin/queues to monitor render jobs.'
  );
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Bull-Board UI available at http://localhost:${port}/admin/queues`);
});
