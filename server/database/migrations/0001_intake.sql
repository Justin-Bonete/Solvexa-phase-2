CREATE TYPE "public"."access_state" AS ENUM('yes', 'no', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY');--> statement-breakpoint
CREATE TYPE "public"."online_status" AS ENUM('online', 'offline', 'partially', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('new_website', 'new_web_application', 'business_system', 'e_commerce', 'pos', 'inventory', 'management_system', 'system_maintenance', 'bug_fixing', 'system_enhancement', 'system_modernization', 'database_work', 'api_integration', 'deployment', 'technical_consultation', 'other');--> statement-breakpoint
CREATE TYPE "public"."request_kind" AS ENUM('inquiry', 'assessment');--> statement-breakpoint
CREATE TYPE "public"."request_path" AS ENUM('new', 'existing', 'idea');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('new', 'reviewing', 'contacted', 'qualified', 'converted', 'declined', 'spam');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('not_scanned', 'clean', 'infected');--> statement-breakpoint
CREATE TYPE "public"."timeline" AS ENUM('asap', 'within_1_month', 'one_to_three_months', 'three_to_six_months', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."user_band" AS ENUM('under_10', 'ten_to_50', 'fifty_to_200', 'two_hundred_to_1000', 'over_1000', 'unknown');--> statement-breakpoint
CREATE SEQUENCE "public"."request_reference_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"scan_status" "scan_status" DEFAULT 'not_scanned' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"kind" "request_kind" DEFAULT 'inquiry' NOT NULL,
	"client_id" uuid,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"organization" text,
	"phone" text,
	"country" text,
	"industry" text,
	"path" "request_path" NOT NULL,
	"project_type" "project_type" NOT NULL,
	"has_existing_system" boolean DEFAULT false NOT NULL,
	"current_technology" text,
	"system_url" text,
	"description" text NOT NULL,
	"main_problems" text,
	"required_features" text,
	"expected_users" "user_band",
	"budget_amount" integer,
	"budget_currency" "currency",
	"timeline" timeline,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"additional_info" text,
	"status" "request_status" DEFAULT 'new' NOT NULL,
	"internal_notes" text,
	"consent_at" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "project_requests_budget_nonneg" CHECK ("project_requests"."budget_amount" is null or "project_requests"."budget_amount" >= 0),
	CONSTRAINT "project_requests_budget_currency" CHECK ("project_requests"."budget_amount" is null or "project_requests"."budget_currency" is not null)
);
--> statement-breakpoint
CREATE TABLE "system_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"current_system" text NOT NULL,
	"technology" text,
	"original_developer" text,
	"problems" text NOT NULL,
	"is_online" "online_status" NOT NULL,
	"features_to_improve" text,
	"errors_observed" text,
	"user_count" "user_band",
	"database_type" text,
	"has_source_access" "access_state" NOT NULL,
	"has_server_access" "access_state" NOT NULL,
	"has_db_access" "access_state" NOT NULL,
	"desired_improvements" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_project_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."project_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_requests" ADD CONSTRAINT "project_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_assessments" ADD CONSTRAINT "system_assessments_request_id_project_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."project_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_key_uq" ON "attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "attachments_request_idx" ON "attachments" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_requests_reference_uq" ON "project_requests" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "project_requests_idem_uq" ON "project_requests" USING btree ("idempotency_key") WHERE "project_requests"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "project_requests_status_idx" ON "project_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "project_requests_email_idx" ON "project_requests" USING btree ("contact_email");--> statement-breakpoint
CREATE UNIQUE INDEX "system_assessments_request_uq" ON "system_assessments" USING btree ("request_id");