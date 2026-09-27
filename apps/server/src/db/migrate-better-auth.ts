import postgres from 'postgres';
import { env } from '../config/env.js';

const sql = postgres(env.DATABASE_URL, { prepare: false });

async function migrateBetterAuthColumns() {
  console.log('Migrating Supabase database to match Better Auth schema...');

  // 1. Add missing columns to users
  await sql`
    ALTER TABLE "public"."users" 
      ADD COLUMN IF NOT EXISTS "name" text,
      ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "image" text;
  `;
  console.log('✓ Updated users table columns');

  // Copy displayName to name where name is null
  await sql`
    UPDATE "public"."users" 
    SET "name" = "display_name" 
    WHERE "name" IS NULL AND "display_name" IS NOT NULL;
  `;

  // 2. Add missing columns to accounts and drop NOT NULL on legacy columns
  await sql`
    ALTER TABLE "public"."accounts" 
      ALTER COLUMN "provider" DROP NOT NULL,
      ALTER COLUMN "provider_account_id" DROP NOT NULL;
  `;
  await sql`
    ALTER TABLE "public"."accounts" 
      ADD COLUMN IF NOT EXISTS "provider_id" text,
      ADD COLUMN IF NOT EXISTS "account_id" text,
      ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp,
      ADD COLUMN IF NOT EXISTS "refresh_token_expires_at" timestamp,
      ADD COLUMN IF NOT EXISTS "password" text,
      ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL,
      ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
  `;
  console.log('✓ Updated accounts table columns');

  // Copy provider to provider_id, provider_account_id to account_id
  await sql`
    UPDATE "public"."accounts" 
    SET "provider_id" = "provider" 
    WHERE "provider_id" IS NULL AND "provider" IS NOT NULL;
  `;
  await sql`
    UPDATE "public"."accounts" 
    SET "account_id" = "provider_account_id" 
    WHERE "account_id" IS NULL AND "provider_account_id" IS NOT NULL;
  `;

  // Update unique constraint
  try {
    await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'accounts_provider_id_account_id_unique'
        ) THEN 
          ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_provider_id_account_id_unique" UNIQUE ("provider_id", "account_id");
        END IF; 
      END $$;
    `;
    console.log('✓ Updated accounts unique constraint');
  } catch (e: any) {
    console.warn('Constraint note:', e.message);
  }

  console.log('Migration completed successfully!');
  process.exit(0);
}

migrateBetterAuthColumns().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
