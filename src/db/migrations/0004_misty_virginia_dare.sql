CREATE TABLE "thumbnail" (
	"imdb_id" varchar(10) PRIMARY KEY NOT NULL,
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
ALTER TABLE "thumbnail" ADD CONSTRAINT "thumbnail_show_imdb_id_fk" FOREIGN KEY ("imdb_id") REFERENCES "public"."show"("imdb_id") ON DELETE no action ON UPDATE no action;