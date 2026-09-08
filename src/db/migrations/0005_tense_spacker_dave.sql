CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"email" varchar(254),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
