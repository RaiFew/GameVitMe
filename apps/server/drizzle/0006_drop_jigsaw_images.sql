-- The jigsaw game is gone. Its only table held the uploaded pictures, so it goes
-- with it — the rows are the pictures themselves and nothing else reads them.
DROP INDEX IF EXISTS "jigsaw_images_owner_id_idx";--> statement-breakpoint
DROP TABLE IF EXISTS "jigsaw_images";