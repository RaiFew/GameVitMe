CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "game_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"game_type" text NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "game_invitations_inviter_invitee_check" CHECK ("inviter_id" <> "invitee_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "game_invitations_pending_unq" ON "game_invitations" USING btree ("room_id","invitee_id") WHERE "status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "game_invitations_invitee_idx" ON "game_invitations" USING btree ("invitee_id");--> statement-breakpoint
CREATE INDEX "game_invitations_inviter_idx" ON "game_invitations" USING btree ("inviter_id");--> statement-breakpoint
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_invitations" ADD CONSTRAINT "game_invitations_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
