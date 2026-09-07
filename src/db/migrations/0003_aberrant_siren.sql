CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"email" varchar(254),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thumbnail" (
	"imdb_id" varchar(10) PRIMARY KEY NOT NULL,
	"object_key" text,
	"content_type" text,
	"width" integer,
	"height" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "thumbnail" ADD CONSTRAINT "thumbnail_show_imdb_id_fk" FOREIGN KEY ("imdb_id") REFERENCES "public"."show"("imdb_id") ON DELETE no action ON UPDATE no action;