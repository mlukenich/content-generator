# Guide: Running in Mock/Development Mode

This guide explains how to run the NovaContent factory in **"Fast-Mock" mode**. This is ideal for UI development, dashboard testing, and checking the automation logic without spending money on AI APIs or waiting for 60-second video renders.

## 1. Prerequisites
- **Bun Runtime:** [Install Bun](https://bun.sh)
- **Redis:** Required for the BullMQ queue.
  - *Quick Start:* `docker run -d -p 6379:6379 redis`

## 2. Environment Configuration
Create a `.env` file in the root directory. For mock mode, we disable the "heavy" integrations:

```env
# Server Config
PORT=3000
NODE_ENV=development

# Database & Cache (Use local or docker instances)
DATABASE_URL=postgres://user:pass@localhost:5432/novacontent
REDIS_URL=redis://localhost:6379

# THE "MAGIC" MOCK FLAGS
SKIP_AI=true
SKIP_DB=false  # Set to true if you don't even want to run Postgres
DEBUG_MODE=true

# Security (Required even in dev)
ENCRYPTION_KEY=dev_secret_key_at_least_32_characters_long
```

## 3. Installation & Startup
```bash
# 1. Install dependencies
bun install

# 2. Sync the database schema (If SKIP_DB=false)
bun run db:push

# 3. Start the engine
bun start
```

## 4. Testing the Pipeline
Once the server is running (`Server started on port 3000`):

1.  **Open the Dashboard:** Go to [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard).
2.  **Trigger a Mock Video:**
    - Call: `http://localhost:3000/trigger?niche=science`
    - The API will immediately return a `202 Accepted`.
    - Because `SKIP_AI` is true, the system will generate a dummy script and "simulate" a render.
3.  **Monitor Progress:**
    - Refresh the Dashboard to see the "Recent Jobs" table update.
    - Check the BullMQ Board at [http://localhost:3000/admin/queues](http://localhost:3000/admin/queues) to see the worker activity.

## 5. Mock Mode Capabilities
- **Scripting:** Returns a fixed JSON script about "Crazy Animal Facts."
- **Audio:** Returns a dummy MP3 duration (5 seconds).
- **Visuals:** Returns high-quality static images from Unsplash based on keywords.
- **Publishing:** Simulates a 2-second upload delay and returns a fake URL.
