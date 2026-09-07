import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const lessonProgress = sqliteTable('lesson_progress', {
  keyHash: text('key_hash').primaryKey(),
  state: text('state').notNull().default('{}'),
  revision: integer('revision').notNull().default(0),
  recentMutations: text('recent_mutations').notNull().default('[]'),
  updatedAt: integer('updated_at').notNull(),
});
