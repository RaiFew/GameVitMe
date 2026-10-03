CREATE TABLE "spyfall_location_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"format" text NOT NULL,
	"locations" jsonb NOT NULL,
	"location_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
