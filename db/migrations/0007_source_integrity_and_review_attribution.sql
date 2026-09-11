CREATE TYPE "public"."review_performer" AS ENUM('human', 'automated');--> statement-breakpoint
ALTER TYPE "public"."review_state" ADD VALUE 'ready_for_scientific_review' BEFORE 'scientific_reviewed';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_demonstration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "canonical_filename" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "local_file_bytes" integer;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "page_count" integer;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "title_page_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "bibliographic_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "title_page_title" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "title_page_authors" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "verified_at" date;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "integrity_notes" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "is_demonstration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "peptides" ADD COLUMN "is_demonstration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quality_topics" ADD COLUMN "is_demonstration" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "performed_by" "review_performer" DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "automated_tool" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_attribution" CHECK ((performed_by = 'human' and reviewer_user_id is not null and automated_tool is null)
          or (performed_by = 'automated' and automated_tool is not null and reviewer_user_id is null));