-- Shareable invitation links: a row with an unguessable token and no invitee.
ALTER TABLE "game_invitations" ALTER COLUMN "invitee_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_invitations" ADD COLUMN "token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "game_invitations_token_unq" ON "game_invitations" ("token") WHERE "token" IS NOT NULL;