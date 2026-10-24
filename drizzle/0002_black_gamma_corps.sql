CREATE TYPE "public"."budget_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'paused', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."recurrence_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"category_id" uuid,
	"amount" numeric(19, 4) NOT NULL,
	"period_month" date NOT NULL,
	"warning_threshold_percent" integer DEFAULT 80 NOT NULL,
	"status" "budget_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_profile_name_period_unique" UNIQUE("profile_id","name","period_month"),
	CONSTRAINT "budgets_amount_positive" CHECK ("budgets"."amount" > 0),
	CONSTRAINT "budgets_warning_threshold_check" CHECK ("budgets"."warning_threshold_percent" between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"contributed_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_contributions_amount_positive" CHECK ("goal_contributions"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_occurrences_schedule_due_unique" UNIQUE("schedule_id","due_date")
);
--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"merchant" varchar(120),
	"description" text,
	"frequency" "recurrence_frequency" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_due_date" date NOT NULL,
	"status" "recurrence_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_schedules_amount_positive" CHECK ("recurring_schedules"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "recurring_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"target_amount" numeric(19, 4) NOT NULL,
	"target_date" date,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goals_profile_name_unique" UNIQUE("profile_id","name"),
	CONSTRAINT "savings_goals_target_positive" CHECK ("savings_goals"."target_amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "savings_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "date_format" varchar(32) DEFAULT 'en-IN' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "appearance" varchar(16) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "budget_alerts_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "goal_alerts_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_savings_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_schedule_id_recurring_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."recurring_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_occurrences" ADD CONSTRAINT "recurring_occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budgets_profile_period_idx" ON "budgets" USING btree ("profile_id","period_month");--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_idx" ON "goal_contributions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "recurring_schedules_profile_due_idx" ON "recurring_schedules" USING btree ("profile_id","next_due_date");--> statement-breakpoint
CREATE POLICY "budgets_select_own" ON "budgets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "budgets"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "budgets_insert_own" ON "budgets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "budgets"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "budgets_update_own" ON "budgets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "budgets"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid()))) WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "budgets"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "budgets_delete_own" ON "budgets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "budgets"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "goal_contributions_select_own" ON "goal_contributions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "goal_contributions"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "goal_contributions_insert_own" ON "goal_contributions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "goal_contributions"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "goal_contributions_update_own" ON "goal_contributions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "goal_contributions"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid()))) WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "goal_contributions"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "goal_contributions_delete_own" ON "goal_contributions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "goal_contributions"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recurring_occurrences_select_own" ON "recurring_occurrences" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "recurring_occurrences"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recurring_occurrences_insert_own" ON "recurring_occurrences" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "recurring_occurrences"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recurring_occurrences_delete_own" ON "recurring_occurrences" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "recurring_occurrences"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recurring_schedules_select_own" ON "recurring_schedules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "recurring_schedules"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recurring_schedules_insert_own" ON "recurring_schedules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "recurring_schedules"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recurring_schedules_update_own" ON "recurring_schedules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "recurring_schedules"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid()))) WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "recurring_schedules"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "recurring_schedules_delete_own" ON "recurring_schedules" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "recurring_schedules"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "savings_goals_select_own" ON "savings_goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "savings_goals"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "savings_goals_insert_own" ON "savings_goals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "savings_goals"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "savings_goals_update_own" ON "savings_goals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "savings_goals"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid()))) WITH CHECK (exists (select 1 from "profiles" where "profiles"."id" = "savings_goals"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "savings_goals_delete_own" ON "savings_goals" AS PERMISSIVE FOR DELETE TO "authenticated" USING (exists (select 1 from "profiles" where "profiles"."id" = "savings_goals"."profile_id" and "profiles"."supabase_user_id" = (select auth.uid())));--> statement-breakpoint
REVOKE ALL ON TABLE public.budgets FROM anon;
REVOKE ALL ON TABLE public.savings_goals FROM anon;
REVOKE ALL ON TABLE public.goal_contributions FROM anon;
REVOKE ALL ON TABLE public.recurring_schedules FROM anon;
REVOKE ALL ON TABLE public.recurring_occurrences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.savings_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.goal_contributions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recurring_schedules TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.recurring_occurrences TO authenticated;