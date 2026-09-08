import { sql } from 'drizzle-orm'
import {
	char,
	doublePrecision,
	foreignKey,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from 'drizzle-orm/pg-core'

export const episode = pgTable(
	'episode',
	{
		showId: varchar('show_id', { length: 10 }).notNull(),
		episodeId: varchar('episode_id', { length: 10 }).primaryKey().notNull(),
		title: text().notNull(),
		seasonNum: integer('season_num').notNull(),
		episodeNum: integer('episode_num').notNull(),
		rating: doublePrecision().notNull(),
		numVotes: integer('num_votes').notNull(),
	},
	(table) => [
		index().using('btree', table.showId),
		foreignKey({
			columns: [table.showId],
			foreignColumns: [show.imdbId],
			name: 'episode_show_imdb_id_fk',
		}),
	],
)

export const show = pgTable(
	'show',
	{
		imdbId: varchar('imdb_id', { length: 10 }).primaryKey().notNull(),
		title: text().notNull(),
		startYear: char('start_year', { length: 4 }).notNull(),
		endYear: char('end_year', { length: 4 }),
		genres: text().array(),
		runtimeMinutes: integer('runtime_minutes'),
		rating: doublePrecision().default(0).notNull(),
		numVotes: integer('num_votes').default(0).notNull(),
	},
	(table) => [
		index('show_title_trigram_index').using('gin', sql`title gin_trgm_ops`),
		index().using('btree', table.rating.desc().nullsLast().op('float8_ops')),
	],
)

export const thumbnail = pgTable(
	'thumbnail',
	{
		imdbId: varchar('imdb_id', { length: 10 }).primaryKey().notNull(),
		// Null marks a known-missing image, so the upstream API is not re-queried.
		objectKey: text('object_key'),
		contentType: text('content_type'),
		width: integer(),
		height: integer(),
		status: text(),
		network: text(),
		airsDays: text('airs_days').array(),
		airsTime: text('airs_time'),
		fetchedAt: timestamp('fetched_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.imdbId],
			foreignColumns: [show.imdbId],
			name: 'thumbnail_show_imdb_id_fk',
		}),
	],
)

export const scrapeRun = pgTable('scrape_run', {
	id: serial().primaryKey().notNull(),
	completedAt: timestamp('completed_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const feedback = pgTable('feedback', {
	id: serial().primaryKey().notNull(),
	message: text().notNull(),
	email: varchar('email', { length: 254 }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})
