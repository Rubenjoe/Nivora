CREATE TYPE "public"."interface_mode" AS ENUM('simple', 'pro');--> statement-breakpoint
CREATE TYPE "public"."transaction_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"icon" varchar(48) DEFAULT 'circle-help' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_profile_id_id_unique" UNIQUE("profile_id","id"),
	CONSTRAINT "categories_profile_name_kind_unique" UNIQUE("profile_id","name","kind")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appwrite_user_id" varchar(128) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"mode" "interface_mode" DEFAULT 'simple' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_appwrite_user_id_unique" UNIQUE("appwrite_user_id"),
	CONSTRAINT "profiles_currency_check" CHECK ("profiles"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"amount" numeric(19, 4) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"occurred_on" date NOT NULL,
	"merchant" varchar(120),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_currency_check" CHECK ("transactions"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_profile_category_fk" FOREIGN KEY ("profile_id","category_id") REFERENCES "public"."categories"("profile_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_profile_kind_idx" ON "categories" USING btree ("profile_id","kind");--> statement-breakpoint
CREATE INDEX "transactions_profile_date_idx" ON "transactions" USING btree ("profile_id","occurred_on");--> statement-breakpoint
CREATE INDEX "transactions_profile_kind_date_idx" ON "transactions" USING btree ("profile_id","kind","occurred_on");