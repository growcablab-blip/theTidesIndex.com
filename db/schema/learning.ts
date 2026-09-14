import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Foundational teaching — what a receptor is, what an agonist does.
 *
 * Neither a compound record nor a quality topic, and still owed a page in a
 * source. Claims and gaps may take a learning topic as their subject, so a
 * chapter of Understanding Peptides rests on located claims exactly as a
 * compound page does.
 */
export const learningTopics = pgTable('learning_topics', {
  id: uuid().primaryKey().defaultRandom(),
  topicKey: text().notNull().unique(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  /** Which publication chapter this topic serves. */
  publicationChapter: text(),
  summary: text(),
  notes: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
