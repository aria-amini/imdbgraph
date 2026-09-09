CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY,
	"message" text NOT NULL,
	"email" varchar(254),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
