import { db } from '../db/connection';
import { niches } from '../db/schema';
import { availableNiches } from '../config/NicheDefinitions';

/**
 * Seed Script - Populates the niches table from NicheDefinitions.ts
 * 
 * Run with: bun run src/scripts/seed-niches.ts
 */
async function seedNiches() {
    console.log('Seeding niches table...');

    for (const niche of availableNiches) {
        try {
            await db.insert(niches).values({
                name: niche.name,
                tone: niche.tone,
                targetAudience: niche.targetAudience,
                visualStyle: niche.visualStyle,
                promptTemplate: niche.promptTemplate,
            }).onConflictDoNothing();

            console.log(`✓ Inserted niche: ${niche.name}`);
        } catch (error: any) {
            if (error.code === '23505') {
                console.log(`⏭ Skipped (already exists): ${niche.name}`);
            } else {
                console.error(`✗ Failed to insert ${niche.name}:`, error.message);
            }
        }
    }

    console.log('\nSeeding complete! Verifying...');

    const allNiches = await db.select().from(niches);
    console.log(`\nNiches in database (${allNiches.length} total):`);
    allNiches.forEach(n => console.log(`  [${n.id}] ${n.name}`));

    process.exit(0);
}

seedNiches().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
