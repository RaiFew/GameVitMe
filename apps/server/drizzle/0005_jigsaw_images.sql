-- Jigsaw pictures: one row per upload, the data URL alongside the decoded
-- dimensions the engine lays the grid out from. Every statement is guarded so a
-- partially-applied run can be repeated.
CREATE TABLE IF NOT EXISTS "jigsaw_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"mime_type" text NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jigsaw_images_owner_id_idx" ON "jigsaw_images" ("owner_id");