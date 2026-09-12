ALTER TABLE "thumbnail" RENAME TO "show_image";--> statement-breakpoint
ALTER TABLE "show_image" DROP CONSTRAINT "thumbnail_show_imdb_id_fk";--> statement-breakpoint
ALTER TABLE "show_image" ADD CONSTRAINT "show_image_show_imdb_id_fk" FOREIGN KEY ("imdb_id") REFERENCES "show"("imdb_id");