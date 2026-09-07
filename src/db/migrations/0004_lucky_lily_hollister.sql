ALTER TABLE "show" ADD COLUMN "genres" text[];--> statement-breakpoint
ALTER TABLE "show" ADD COLUMN "runtime_minutes" integer;--> statement-breakpoint
ALTER TABLE "thumbnail" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "thumbnail" ADD COLUMN "network" text;--> statement-breakpoint
ALTER TABLE "thumbnail" ADD COLUMN "airs_days" text[];--> statement-breakpoint
ALTER TABLE "thumbnail" ADD COLUMN "airs_time" text;