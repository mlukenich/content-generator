import { db } from '../db/connection';
import { niches } from '../db/schema';

async function seed() {
  console.log('Seeding niches...');
  try {
    await db.insert(niches).values({
      name: 'Tech News',
      tone: 'Informative and Enthusiastic',
      targetAudience: 'Tech enthusiasts',
      visualStyle: 'Modern, sleek, cyber',
      promptTemplate: 'Create a script about latest tech trends.',
    }).onConflictDoNothing();
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
  process.exit(0);
}

seed();
