import { pgTable, serial, text, varchar, timestamp, uniqueIndex, integer, date, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * ==================================================================================
 * DATABASE SCHEMA
 * ==================================================================================
 * Defines the structure of the application's PostgreSQL database using Drizzle ORM.
 *
 * - `niches`: Stores the configurations for different content niches.
 * - `videos`: Tracks the state and metadata of each video generated.
 * - `geminiApiUsage`: Logs daily API requests for quota management.
 * ==================================================================================
 */

/**
 * Niche Configuration Table
 */
export const niches = pgTable('niches', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull().unique(),
  tone: text('tone').notNull(),
  targetAudience: text('target_audience').notNull(),
  visualStyle: text('visual_style').notNull(),
  promptTemplate: text('prompt_template').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const nichesRelations = relations(niches, ({ many }) => ({
  videos: many(videos),
}));

/**
 * Video Status Enum
 */
export const videoStatus = ['idle', 'scripting', 'rendering', 'completed', 'published', 'error'] as const;

/**
 * Videos Table
 */
export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  requestId: varchar('request_id', { length: 256 }).notNull().unique(), // Link to the API trigger request
  logicalRequestId: varchar('logical_request_id', { length: 512 }).notNull().unique(), // For idempotency
  nicheId: integer('niche_id').notNull().references(() => niches.id, { onDelete: 'cascade' }),
  nicheSlug: varchar('niche_slug', { length: 128 }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  status: text('status', { enum: videoStatus }).default('idle').notNull(),
  errorMessage: text('error_message'),
  videoUrl: text('video_url'), 
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  platformAccountId: integer('platform_account_id').references(() => platformAccounts.id),
  estimatedCostCents: integer('estimated_cost_cents').default(0).notNull(),
  // JSON columns
  scriptJson: json('script_json'),
  renderManifestJson: json('render_manifest_json'),
}, (table) => {
  return {
    requestIdIndex: uniqueIndex('request_id_idx').on(table.requestId),
    logicalRequestIdIndex: uniqueIndex('logical_request_id_idx').on(table.logicalRequestId),
  };
});

export const videosRelations = relations(videos, ({ one }) => ({
  niche: one(niches, {
    fields: [videos.nicheId],
    references: [niches.id],
  }),
  platformAccount: one(platformAccounts, {
    fields: [videos.platformAccountId],
    references: [platformAccounts.id],
  }),
}));

/**
 * Gemini API Usage Table
 *
 * Tracks the number of requests made to the Gemini API on a daily basis
 * to enforce rate limits and manage costs.
 */
export const geminiApiUsage = pgTable('gemini_api_usage', {
  id: serial('id').primaryKey(),
  date: date('date').notNull().unique(),
  requestCount: integer('request_count').notNull().default(0),
});

/**
 * Platform Accounts Table (OAuth2 Storage)
 */
export const platformAccounts = pgTable('platform_accounts', {
  id: serial('id').primaryKey(),
  platform: text('platform', { enum: ['youtube', 'tiktok', 'instagram'] }).notNull(),
  externalAccountId: varchar('external_account_id', { length: 256 }),
  accountName: varchar('account_name', { length: 256 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    platformIdx: uniqueIndex('platform_account_idx').on(table.platform, table.externalAccountId),
  };
});

export const platformAccountsRelations = relations(platformAccounts, ({ many }) => ({
  videos: many(videos),
}));
