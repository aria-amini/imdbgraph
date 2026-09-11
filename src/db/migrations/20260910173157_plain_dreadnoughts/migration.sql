CREATE TABLE "episode" (
	"show_id" varchar(10) NOT NULL,
	"episode_id" varchar(10) PRIMARY KEY,
	"title" text NOT NULL,
	"season_num" integer NOT NULL,
	"episode_num" integer NOT NULL,
	"rating" double precision NOT NULL,
	"num_votes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scrape_run" (
	"id" serial PRIMARY KEY,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show" (
	"imdb_id" varchar(10) PRIMARY KEY,
	"title" text NOT NULL,
	"start_year" char(4) NOT NULL,
	"end_year" char(4),
	"genres" text[],
	"runtime_minutes" integer,
	"rating" double precision DEFAULT 0 NOT NULL,
	"num_votes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thumbnail" (
	"imdb_id" varchar(10) PRIMARY KEY,
	"object_key" text,
	"content_type" text,
	"width" integer,
	"height" integer,
	"status" text,
	"network" text,
	"airs_days" text[],
	"airs_time" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "episode_show_id_index" ON "episode" ("show_id");--> statement-breakpoint
CREATE INDEX "show_title_trigram_index" ON "show" USING gin (title gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "show_rating_index" ON "show" ("rating" float8_ops DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "episode" ADD CONSTRAINT "episode_show_imdb_id_fk" FOREIGN KEY ("show_id") REFERENCES "show"("imdb_id");--> statement-breakpoint
ALTER TABLE "thumbnail" ADD CONSTRAINT "thumbnail_show_imdb_id_fk" FOREIGN KEY ("imdb_id") REFERENCES "show"("imdb_id");