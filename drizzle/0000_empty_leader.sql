CREATE TYPE "public"."action_type" AS ENUM('ENTER', 'EXIT', 'RESET');--> statement-breakpoint
CREATE TYPE "public"."triggered_by_type" AS ENUM('self', 'kiosk', 'discord', 'system');--> statement-breakpoint
CREATE TABLE "presence_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "action_type" NOT NULL,
	"triggered_by" "triggered_by_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"student_id" text,
	"discord_id" text,
	"is_present" boolean DEFAULT false NOT NULL,
	"is_kiosk" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_sub_unique" UNIQUE("sub")
);
--> statement-breakpoint
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;