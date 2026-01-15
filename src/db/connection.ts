import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * ==================================================================================
 * DATABASE CONNECTION
 * ==================================================================================
 * This file sets up the connection to the PostgreSQL database using 'postgres-js'
 * and initializes the Drizzle ORM client. The exported 'db' object can be used
 * throughout the application to interact with the database in a type-safe manner.
 *
 * The connection string should be stored in an environment variable for security.
 * ==================================================================================
 */

// Ensure the DATABASE_URL is set in your environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// For query purposes, you can use the singleton instance of the client.
const queryClient = postgres(connectionString);

// The 'db' object is the main entry point for all database operations.
// It is fully typed based on the schema defined in './schema.ts'.
export const db = drizzle(queryClient, { schema });

console.log('Database connection initialized.');
