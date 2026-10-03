-- Shareable invitation links: a row with an unguessable token and no invitee.
-- Every statement is guarded so a partially-applied run can be repeated.
ALTER TABLE "game_invitations" ALTER COLUMN "invitee_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_invitations" ADD COLUMN IF NOT EXISTS "token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "game_invitations_token_unq" ON "game_invitations" ("token") WHERE "token" IS NOT NULL;