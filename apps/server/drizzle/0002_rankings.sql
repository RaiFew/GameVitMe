CREATE TYPE "public"."leaderboard_direction" AS ENUM('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');--> statement-breakpoint
CREATE TYPE "public"."ranked_run_status" AS ENUM('COMPLETED', 'DIED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "leaderboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"game_type" text,
	"mode" text,
	"metric" text,
	"direction" "leaderboard_direction" NOT NULL,
	"season" text DEFAULT 'all-time' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboards_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leaderboard_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score" numeric(20,4) NOT NULL,
	"rank" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranked_game_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_type" text NOT NULL,
	"mode" text NOT NULL,
	"leaderboard_key" text,
	"ranking_value" numeric(20,4) NOT NULL,
	"total_time_ms" integer NOT NULL,
	"highest_floor" integer NOT NULL,
	"mistakes" integer NOT NULL,
	"status" "ranked_run_status" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_leaderboard_id_user_id_unique" ON "leaderboard_entries" USING btree ("leaderboard_id","user_id");--> statement-breakpoint
CREATE INDEX "ranked_results_user_idx" ON "ranked_game_results" USING btree ("user_id","leaderboard_key");--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_leaderboard_id_leaderboards_id_fk" FOREIGN KEY ("leaderboard_id") REFERENCES "public"."leaderboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranked_game_results" ADD CONSTRAINT "ranked_game_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
