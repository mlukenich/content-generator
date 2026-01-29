import { pgTable, serial, text, varchar, timestamp, uniqueIndex, integer, date, json, index } from 'drizzle-orm/pg-core';
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
export const videoStatus = ['idle', 'scripting', 'rendering', 'published', 'error'] as const;

/**
 * Videos Table
 */
export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  nicheId: integer('niche_id').notNull().references(() => niches.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  hashtags: text('hashtags'), // Stored as a comma-separated string
  status: text('status', { enum: videoStatus }).default('idle').notNull(),
  videoUrl: text('video_url'), // URL after rendering and storage
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // JSON columns for storing structured data
  scriptJson: json('script_json'),
  renderManifestJson: json('render_manifest_json'),
}, (table) => {
  return {
    nicheIdIndex: index('niche_id_idx').on(table.nicheId),
  };
});

export const videosRelations = relations(videos, ({ one }) => ({
  niche: one(niches, {
    fields: [videos.nicheId],
    references: [niches.id],
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
