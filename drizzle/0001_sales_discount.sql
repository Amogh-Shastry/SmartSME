ALTER TABLE "sales" ADD COLUMN "discount_type" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "discount_value" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "discount_amount" double precision DEFAULT 0 NOT NULL;