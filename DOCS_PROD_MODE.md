# Guide: Running in Production/Live Mode

This guide explains how to transition NovaContent from a prototype to a **Live Automated Content Factory**.

## 1. Environment Configuration (The "Real" Keys)
Update your `.env` with production-grade credentials. 

**CRITICAL:** Ensure `SKIP_AI` is set to `false`.

```env
# 1. API Keys (External Providers)
GEMINI_API_KEY=your_google_gemini_api_key
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key

# 2. Platform Credentials (OAuth2)
YOUTUBE_CLIENT_ID=your_google_app_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_google_app_secret
YOUTUBE_REDIRECT_URI=https://your-domain.com/auth/callback

# 3. Security (MUST be unique and 32+ chars)
ENCRYPTION_KEY=a_very_long_random_string_generator_for_tokens

# 4. Mode Flags
SKIP_AI=false
SKIP_DB=false
NODE_ENV=production
```

## 2. Database Preparation
Production uses **Drizzle Migrations** to ensure the schema is stable.

```bash
# 1. Generate migration files
bun run db:generate

# 2. Push schema to production database
bun run db:push
```

## 3. The OAuth2 Connection Flow (Pre-Flight)
Before the factory can publish automatically, you must link your social accounts once.

1.  **Start the Server:** `bun start`.
2.  **Authorize YouTube:** Navigate to `http://localhost:3000/auth/connect?platform=youtube`.
3.  **Login:** Follow the Google/TikTok login prompts.
4.  **Confirm:** Upon return, you will see "Successfully connected!". Your tokens are now encrypted in your DB.

## 4. Production Deployment Strategy
In production, it is highly recommended to run the **API** and the **Queue Worker** as separate processes to prevent CPU contention during video rendering.

### Process 1: The API (Web & Dashboard)
```bash
# Runs the Express server and scheduler
bun run src/index.ts
```

### Process 2: The Worker (Rendering & AI)
```bash
# Runs the BullMQ worker that processes the renders
bun run src/workers/render-worker.ts
```

## 5. Setting Up Automation
Once your accounts are linked, you can set the factory to "Autopilot" via the Dashboard:

1.  Navigate to `/admin/dashboard`.
2.  In the **Automation Sidebar**, enter a niche slug (e.g., `crazy-animal-facts`).
3.  Click **Activate Automation**.
4.  The system will now automatically trigger a new video generation every day (default: 6:00 PM).

## 6. Monitoring & Business Metrics
- **Success Rate:** Monitor the Dashboard for any 429 (Rate Limit) errors from Gemini.
- **Unit Cost:** Check the "Unit Cost" column in the dashboard to ensure production remains profitable.
- **Worker Health:** Check the BullMQ dashboard at `/admin/queues` to see if any jobs are stuck in "stalled" or "failed" states.
