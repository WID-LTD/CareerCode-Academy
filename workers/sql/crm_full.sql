-- CareerCode CRM: people, accounts, pipeline, activities, tasks, segments,
-- campaigns, inbox, success plans, referrals, surveys and settings.
-- Additive only. Safe to re-run.

CREATE TABLE IF NOT EXISTS "crm_profiles" (
  "user_id" TEXT PRIMARY KEY,
  "lifecycle_stage" TEXT NOT NULL DEFAULT 'lead',
  "owner_id" TEXT,
  "account_id" TEXT,
  "lead_source" TEXT DEFAULT 'organic',
  "phone" TEXT,
  "country" TEXT,
  "timezone" TEXT,
  "company" TEXT,
  "job_title" TEXT,
  "lead_score" INTEGER NOT NULL DEFAULT 0,
  "engagement_score" INTEGER NOT NULL DEFAULT 0,
  "risk_score" INTEGER NOT NULL DEFAULT 0,
  "health_score" INTEGER NOT NULL DEFAULT 100,
  "lifetime_value" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "tags" TEXT NOT NULL DEFAULT '[]',
  "custom_fields" TEXT NOT NULL DEFAULT '{}',
  "email_opt_in" INTEGER NOT NULL DEFAULT 1,
  "sms_opt_in" INTEGER NOT NULL DEFAULT 0,
  "push_opt_in" INTEGER NOT NULL DEFAULT 1,
  "whatsapp_opt_in" INTEGER NOT NULL DEFAULT 0,
  "do_not_contact" INTEGER NOT NULL DEFAULT 0,
  "last_activity_at" TEXT,
  "last_contacted_at" TEXT,
  "next_follow_up_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("user_id") REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_crm_profiles_stage" ON "crm_profiles" ("lifecycle_stage", "last_activity_at");
CREATE INDEX IF NOT EXISTS "idx_crm_profiles_owner" ON "crm_profiles" ("owner_id", "lifecycle_stage");
CREATE INDEX IF NOT EXISTS "idx_crm_profiles_risk" ON "crm_profiles" ("risk_score");
CREATE INDEX IF NOT EXISTS "idx_crm_profiles_ltv" ON "crm_profiles" ("lifetime_value");

CREATE TABLE IF NOT EXISTS "crm_accounts" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "type" TEXT NOT NULL DEFAULT 'school',
  "website" TEXT,
  "industry" TEXT,
  "size" TEXT,
  "region" TEXT,
  "country" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "owner_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'prospect',
  "health_score" INTEGER NOT NULL DEFAULT 70,
  "annual_value" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "notes" TEXT,
  "custom_fields" TEXT NOT NULL DEFAULT '{}',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_accounts_slug" ON "crm_accounts" ("slug");
CREATE INDEX IF NOT EXISTS "idx_crm_accounts_type" ON "crm_accounts" ("type", "status");

CREATE TABLE IF NOT EXISTS "crm_account_contacts" (
  "id" TEXT PRIMARY KEY,
  "account_id" TEXT NOT NULL,
  "user_id" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "role" TEXT DEFAULT 'contact',
  "title" TEXT,
  "is_primary" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("account_id") REFERENCES "crm_accounts"(id) ON DELETE CASCADE,
  FOREIGN KEY ("user_id") REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_crm_account_contacts_account" ON "crm_account_contacts" ("account_id");

CREATE TABLE IF NOT EXISTS "crm_leads" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT DEFAULT 'organic',
  "interest" TEXT,
  "stage" TEXT NOT NULL DEFAULT 'new',
  "owner_id" TEXT,
  "account_id" TEXT,
  "score" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "consent_email" INTEGER NOT NULL DEFAULT 1,
  "consent_sms" INTEGER NOT NULL DEFAULT 0,
  "converted_user_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("converted_user_id") REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY ("account_id") REFERENCES "crm_accounts"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_crm_leads_stage" ON "crm_leads" ("stage", "created_at");
CREATE INDEX IF NOT EXISTS "idx_crm_leads_email" ON "crm_leads" ("email");

CREATE TABLE IF NOT EXISTS "crm_pipeline_stages" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'opportunity',
  "position" INTEGER NOT NULL DEFAULT 0,
  "color" TEXT DEFAULT 'blue',
  "is_won" INTEGER NOT NULL DEFAULT 0,
  "is_lost" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_opportunities" (
  "id" TEXT PRIMARY KEY,
  "person_id" TEXT,
  "lead_id" TEXT,
  "account_id" TEXT,
  "course_id" TEXT,
  "program_id" TEXT,
  "title" TEXT NOT NULL,
  "stage_id" TEXT NOT NULL,
  "value" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "probability" INTEGER NOT NULL DEFAULT 20,
  "owner_id" TEXT,
  "source" TEXT DEFAULT 'organic',
  "expected_close_at" TEXT,
  "won_at" TEXT,
  "lost_at" TEXT,
  "lost_reason" TEXT,
  "next_step" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY ("lead_id") REFERENCES "crm_leads"(id) ON DELETE CASCADE,
  FOREIGN KEY ("account_id") REFERENCES "crm_accounts"(id) ON DELETE SET NULL,
  FOREIGN KEY ("stage_id") REFERENCES "crm_pipeline_stages"(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "idx_crm_opportunities_stage" ON "crm_opportunities" ("stage_id", "owner_id");
CREATE INDEX IF NOT EXISTS "idx_crm_opportunities_person" ON "crm_opportunities" ("person_id");

CREATE TABLE IF NOT EXISTS "crm_activities" (
  "id" TEXT PRIMARY KEY,
  "person_id" TEXT,
  "lead_id" TEXT,
  "account_id" TEXT,
  "opportunity_id" TEXT,
  "type" TEXT NOT NULL DEFAULT 'note',
  "subject" TEXT,
  "body" TEXT,
  "direction" TEXT DEFAULT 'internal',
  "channel" TEXT DEFAULT 'crm',
  "due_at" TEXT,
  "completed_at" TEXT,
  "owner_id" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY ("lead_id") REFERENCES "crm_leads"(id) ON DELETE CASCADE,
  FOREIGN KEY ("account_id") REFERENCES "crm_accounts"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_crm_activities_person" ON "crm_activities" ("person_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_account" ON "crm_activities" ("account_id", "created_at");

CREATE TABLE IF NOT EXISTS "crm_tasks" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "person_id" TEXT,
  "lead_id" TEXT,
  "account_id" TEXT,
  "opportunity_id" TEXT,
  "assignee_id" TEXT,
  "due_at" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "completed_at" TEXT,
  "created_by" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE,
  FOREIGN KEY ("lead_id") REFERENCES "crm_leads"(id) ON DELETE CASCADE,
  FOREIGN KEY ("account_id") REFERENCES "crm_accounts"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_crm_tasks_assignee" ON "crm_tasks" ("assignee_id", "status", "due_at");
CREATE INDEX IF NOT EXISTS "idx_crm_tasks_person" ON "crm_tasks" ("person_id", "status");

CREATE TABLE IF NOT EXISTS "crm_tags" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "color" TEXT DEFAULT 'gray',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_profile_tags" (
  "profile_user_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("profile_user_id", "tag_id"),
  FOREIGN KEY ("profile_user_id") REFERENCES "crm_profiles"(user_id) ON DELETE CASCADE,
  FOREIGN KEY ("tag_id") REFERENCES "crm_tags"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_segments" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "definition" TEXT NOT NULL DEFAULT '{"match":"all","rules":[]}',
  "owner_id" TEXT,
  "is_shared" INTEGER NOT NULL DEFAULT 1,
  "last_count" INTEGER NOT NULL DEFAULT 0,
  "last_run_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_segment_members" (
  "segment_id" TEXT NOT NULL,
  "person_id" TEXT NOT NULL,
  "added_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY ("segment_id", "person_id"),
  FOREIGN KEY ("segment_id") REFERENCES "crm_segments"(id) ON DELETE CASCADE,
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_saved_views" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "entity" TEXT NOT NULL DEFAULT 'people',
  "filters" TEXT NOT NULL DEFAULT '{}',
  "sort" TEXT NOT NULL DEFAULT '{}',
  "owner_id" TEXT,
  "is_shared" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_templates" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "category" TEXT DEFAULT 'general',
  "created_by" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_campaigns" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "template_id" TEXT,
  "segment_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduled_at" TEXT,
  "sent_at" TEXT,
  "created_by" TEXT,
  "audience_count" INTEGER NOT NULL DEFAULT 0,
  "sent_count" INTEGER NOT NULL DEFAULT 0,
  "delivered_count" INTEGER NOT NULL DEFAULT 0,
  "opened_count" INTEGER NOT NULL DEFAULT 0,
  "clicked_count" INTEGER NOT NULL DEFAULT 0,
  "converted_count" INTEGER NOT NULL DEFAULT 0,
  "goal" TEXT,
  "course_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("template_id") REFERENCES "crm_templates"(id) ON DELETE SET NULL,
  FOREIGN KEY ("segment_id") REFERENCES "crm_segments"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_crm_campaigns_status" ON "crm_campaigns" ("status", "created_at");

CREATE TABLE IF NOT EXISTS "crm_campaign_recipients" (
  "id" TEXT PRIMARY KEY,
  "campaign_id" TEXT NOT NULL,
  "person_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "sent_at" TEXT,
  "delivered_at" TEXT,
  "opened_at" TEXT,
  "clicked_at" TEXT,
  "converted_at" TEXT,
  "error" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("campaign_id") REFERENCES "crm_campaigns"(id) ON DELETE CASCADE,
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_campaign_recipient" ON "crm_campaign_recipients" ("campaign_id", "person_id");

CREATE TABLE IF NOT EXISTS "crm_conversations" (
  "id" TEXT PRIMARY KEY,
  "person_id" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'support',
  "subject" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "assignee_id" TEXT,
  "sla_due_at" TEXT,
  "last_message_at" TEXT,
  "unread_count" INTEGER NOT NULL DEFAULT 0,
  "related_type" TEXT,
  "related_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_conversations_related" ON "crm_conversations" ("related_type", "related_id") WHERE "related_type" IS NOT NULL AND "related_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_crm_conversations_status" ON "crm_conversations" ("status", "assignee_id", "last_message_at");

CREATE TABLE IF NOT EXISTS "crm_messages" (
  "id" TEXT PRIMARY KEY,
  "conversation_id" TEXT NOT NULL,
  "direction" TEXT NOT NULL DEFAULT 'inbound',
  "channel" TEXT DEFAULT 'support',
  "body" TEXT NOT NULL,
  "author_id" TEXT,
  "is_internal" INTEGER NOT NULL DEFAULT 0,
  "read_at" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("conversation_id") REFERENCES "crm_conversations"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_crm_messages_conversation" ON "crm_messages" ("conversation_id", "created_at");

CREATE TABLE IF NOT EXISTS "crm_automations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "conditions" TEXT NOT NULL DEFAULT '{"match":"all","rules":[]}',
  "actions" TEXT NOT NULL DEFAULT '[]',
  "enabled" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT,
  "last_run_at" TEXT,
  "run_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_automation_runs" (
  "id" TEXT PRIMARY KEY,
  "automation_id" TEXT NOT NULL,
  "person_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'success',
  "log" TEXT,
  "started_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "finished_at" TEXT,
  FOREIGN KEY ("automation_id") REFERENCES "crm_automations"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_consents" (
  "id" TEXT PRIMARY KEY,
  "person_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" INTEGER NOT NULL DEFAULT 1,
  "source" TEXT DEFAULT 'crm',
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_crm_consents_person" ON "crm_consents" ("person_id", "channel", "created_at");

CREATE TABLE IF NOT EXISTS "crm_health_snapshots" (
  "id" TEXT PRIMARY KEY,
  "person_id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "engagement_score" INTEGER NOT NULL DEFAULT 0,
  "risk_score" INTEGER NOT NULL DEFAULT 0,
  "health_score" INTEGER NOT NULL DEFAULT 100,
  "lifetime_value" REAL NOT NULL DEFAULT 0,
  "courses_active" INTEGER NOT NULL DEFAULT 0,
  "last_activity_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_crm_health_person_day" ON "crm_health_snapshots" ("person_id", "day");

CREATE TABLE IF NOT EXISTS "crm_success_plans" (
  "id" TEXT PRIMARY KEY,
  "person_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "goal" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "owner_id" TEXT,
  "start_date" TEXT,
  "target_date" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_success_milestones" (
  "id" TEXT PRIMARY KEY,
  "plan_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_at" TEXT,
  "completed_at" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("plan_id") REFERENCES "crm_success_plans"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_referrals" (
  "id" TEXT PRIMARY KEY,
  "referrer_id" TEXT,
  "referred_name" TEXT,
  "referred_email" TEXT,
  "referred_user_id" TEXT,
  "code" TEXT,
  "status" TEXT NOT NULL DEFAULT 'invited',
  "reward_amount" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "converted_at" TEXT,
  FOREIGN KEY ("referrer_id") REFERENCES "users"(id) ON DELETE SET NULL,
  FOREIGN KEY ("referred_user_id") REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_crm_referrals_referrer" ON "crm_referrals" ("referrer_id", "status");

CREATE TABLE IF NOT EXISTS "crm_surveys" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'nps',
  "questions" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_survey_responses" (
  "id" TEXT PRIMARY KEY,
  "survey_id" TEXT NOT NULL,
  "person_id" TEXT,
  "score" INTEGER,
  "answers" TEXT NOT NULL DEFAULT '{}',
  "comment" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("survey_id") REFERENCES "crm_surveys"(id) ON DELETE CASCADE,
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_crm_survey_responses_survey" ON "crm_survey_responses" ("survey_id", "created_at");

CREATE TABLE IF NOT EXISTS "crm_custom_fields" (
  "id" TEXT PRIMARY KEY,
  "entity" TEXT NOT NULL DEFAULT 'person',
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "options" TEXT NOT NULL DEFAULT '[]',
  "required" INTEGER NOT NULL DEFAULT 0,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE ("entity", "key")
);

CREATE TABLE IF NOT EXISTS "crm_contracts" (
  "id" TEXT PRIMARY KEY,
  "account_id" TEXT,
  "person_id" TEXT,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'training',
  "value" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "start_date" TEXT,
  "end_date" TEXT,
  "renewal_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY ("account_id") REFERENCES "crm_accounts"(id) ON DELETE CASCADE,
  FOREIGN KEY ("person_id") REFERENCES "users"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "crm_playbooks" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "trigger" TEXT,
  "steps" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_approvals" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "requested_by" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "reviewed_by" TEXT,
  "reviewed_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS "crm_targets" (
  "id" TEXT PRIMARY KEY,
  "owner_id" TEXT,
  "period" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "target_value" REAL NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Default pipeline stages.
INSERT OR IGNORE INTO "crm_pipeline_stages" (id,key,label,kind,position,color,is_won,is_lost) VALUES
  ('stage-opp-new','opp_new','New','opportunity',1,'blue',0,0),
  ('stage-opp-contacted','opp_contacted','Contacted','opportunity',2,'cyan',0,0),
  ('stage-opp-qualified','opp_qualified','Qualified','opportunity',3,'indigo',0,0),
  ('stage-opp-trial','opp_trial','Trial started','opportunity',4,'amber',0,0),
  ('stage-opp-checkout','opp_checkout','Checkout started','opportunity',5,'orange',0,0),
  ('stage-opp-paid','opp_paid','Paid','opportunity',6,'green',1,0),
  ('stage-opp-lost','opp_lost','Lost','opportunity',7,'red',0,1),
  ('stage-learner-new','learner_new','New enrolment','learner',1,'blue',0,0),
  ('stage-learner-onboarding','learner_onboarding','Onboarding','learner',2,'cyan',0,0),
  ('stage-learner-active','learner_active','Active','learner',3,'green',0,0),
  ('stage-learner-risk','learner_risk','At risk','learner',4,'red',0,0),
  ('stage-learner-completed','learner_completed','Completed','learner',5,'emerald',1,0),
  ('stage-learner-alumni','learner_alumni','Alumni','learner',6,'purple',1,0);

-- Default tags.
INSERT OR IGNORE INTO "crm_tags" (id,name,color) VALUES
  ('tag-high-value','high-value','gold'),
  ('tag-at-risk','at-risk','red'),
  ('tag-referral','referral','green'),
  ('tag-corporate','corporate','blue'),
  ('tag-school-partner','school-partner','indigo'),
  ('tag-alumni','alumni','purple'),
  ('tag-ambassador','ambassador','pink'),
  ('tag-trial','trial','amber'),
  ('tag-paid','paid','green'),
  ('tag-vip','vip','gold');

-- Default segments.
INSERT OR IGNORE INTO "crm_segments" (id,name,description,definition,is_shared,last_count) VALUES
  ('seg-new-leads','New leads','People who signed up but have not started a course.','{"match":"all","rules":[{"field":"lifecycle_stage","op":"eq","value":"lead"}]}',1,0),
  ('seg-trial-active','Active trials','Trial learners with access still running.','{"match":"all","rules":[{"field":"lifecycle_stage","op":"eq","value":"trial"},{"field":"trial_days_left","op":"gte","value":0}]}',1,0),
  ('seg-trial-ending','Trials ending soon','Trials ending in the next 3 days.','{"match":"all","rules":[{"field":"trial_days_left","op":"lte","value":3},{"field":"trial_days_left","op":"gte","value":0}]}',1,0),
  ('seg-paid-inactive','Paid and inactive','Paid learners with no activity for 7 days.','{"match":"all","rules":[{"field":"lifecycle_stage","op":"eq","value":"paid"},{"field":"last_activity_days","op":"gte","value":7}]}',1,0),
  ('seg-at-risk','At-risk learners','Risk score of 60 or higher.','{"match":"all","rules":[{"field":"risk_score","op":"gte","value":60}]}',1,0),
  ('seg-high-value','High-value learners','Lifetime value of 100,000 or more.','{"match":"all","rules":[{"field":"lifetime_value","op":"gte","value":100000}]}',1,0),
  ('seg-completed-no-cert','Completed without certificate','Completed a course but no certificate issued.','{"match":"all","rules":[{"field":"completed_courses","op":"gte","value":1},{"field":"certificate_count","op":"eq","value":0}]}',1,0),
  ('seg-alumni','Alumni','Learners marked as alumni.','{"match":"all","rules":[{"field":"lifecycle_stage","op":"eq","value":"alumni"}]}',1,0),
  ('seg-failed-payments','Failed payments','People with at least one failed payment.','{"match":"all","rules":[{"field":"failed_payments","op":"gte","value":1}]}',1,0);

-- Default templates.
INSERT OR IGNORE INTO "crm_templates" (id,name,channel,subject,body,category) VALUES
  ('tpl-trial-ending','Trial ending soon','email','Your CareerCode trial ends in 3 days','<p>Hi {{name}},</p><p>Your trial ends in 3 days. You have completed {{progress}}% of {{course}}. Keep going or purchase the course to keep your access.</p><p><a href="{{checkout_url}}">Continue learning</a></p>','trial'),
  ('tpl-trial-expired','Trial expired','email','Your trial has ended — here is how to continue','<p>Hi {{name}},</p><p>Your trial has ended. You can still keep your progress and unlock the course whenever you are ready.</p><p><a href="{{checkout_url}}">Unlock the course</a></p>','trial'),
  ('tpl-inactive','We saved your progress','email','Your progress is waiting for you','<p>Hi {{name}},</p><p>You have not visited in a while. Your progress in {{course}} is saved. Pick up where you left off.</p><p><a href="{{course_url}}">Resume learning</a></p>','retention'),
  ('tpl-welcome','Welcome to CareerCode','email','Welcome to CareerCode Academy','<p>Hi {{name}},</p><p>Welcome. Your account is ready. Start with your first lesson and ask GiGo whenever you get stuck.</p><p><a href="{{dashboard_url}}">Open your dashboard</a></p>','onboarding'),
  ('tpl-certificate','Your certificate is ready','email','Your CareerCode certificate is ready','<p>Hi {{name}},</p><p>Congratulations. Your certificate for {{course}} is ready. You can download and share it.</p><p><a href="{{certificate_url}}">View certificate</a></p>','success'),
  ('tpl-review','How was your course?','email','Tell us about your experience','<p>Hi {{name}},</p><p>You completed {{course}}. Would you leave a short review? It helps the next learner choose well.</p><p><a href="{{review_url}}">Leave a review</a></p>','feedback'),
  ('tpl-inapp-trial','Trial reminder','in_app','Your trial ends soon','Your trial ends in 3 days. Keep your progress by unlocking the course.','trial');

-- Default playbooks.
INSERT OR IGNORE INTO "crm_playbooks" (id,name,description,trigger,steps,status) VALUES
  ('pb-trial-activation','Trial activation','Move a new trial learner to their first completed lesson.','trial_started','[{"title":"Send welcome message","type":"message"},{"title":"Check first lesson within 48 hours","type":"task"},{"title":"Offer GiGo help","type":"message"}]','active'),
  ('pb-at-risk','At-risk intervention','Re-engage a learner whose progress has stalled.','risk_score_high','[{"title":"Review last activity","type":"task"},{"title":"Send personal check-in","type":"message"},{"title":"Offer a live class or mentor","type":"task"}]','active'),
  ('pb-winback','Win-back','Bring back a learner whose trial or access expired.','trial_expired','[{"title":"Send win-back message","type":"message"},{"title":"Offer a coupon","type":"task"},{"title":"Follow up in 3 days","type":"task"}]','active'),
  ('pb-certificate','Certificate follow-up','Turn a completed learner into an advocate.','certificate_issued','[{"title":"Congratulate and request review","type":"message"},{"title":"Invite to alumni community","type":"task"},{"title":"Ask for referral","type":"task"}]','active'),
  ('pb-employer','Employer outreach','Open a conversation with a hiring partner.','account_created','[{"title":"Research the company","type":"task"},{"title":"Send introduction","type":"message"},{"title":"Book a call","type":"task"}]','active');

-- One profile per existing user.
INSERT OR IGNORE INTO "crm_profiles" (user_id,lifecycle_stage,lead_source,last_activity_at)
SELECT id,
  CASE
    WHEN role = 'instructor' THEN 'active'
    WHEN role IN ('admin','super_admin') THEN 'active'
    WHEN EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = users.id AND e.access_type = 'paid') THEN 'paid'
    WHEN EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = users.id AND e.access_type = 'trial') THEN 'trial'
    ELSE 'lead'
  END,
  'organic',
  COALESCE(last_login, created_at)
FROM users;

-- Lifetime value and last activity for existing profiles.
UPDATE "crm_profiles"
SET lifetime_value = COALESCE((
  SELECT SUM(p.amount) FROM payments p
  WHERE p.user_id = crm_profiles.user_id AND p.status = 'completed'
), 0);

UPDATE "crm_profiles"
SET last_activity_at = COALESCE((
  SELECT MAX(lp.updated_at) FROM lesson_progress lp
  WHERE lp.user_id = crm_profiles.user_id
), last_activity_at);

-- Basic risk and engagement seed. The CRM refresh endpoint recalculates these.
UPDATE "crm_profiles"
SET
  engagement_score = MIN(100,
    10
    + COALESCE((SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = crm_profiles.user_id), 0) * 3
    + COALESCE((SELECT COUNT(*) FROM payments p WHERE p.user_id = crm_profiles.user_id AND p.status = 'completed'), 0) * 8
    + CASE WHEN last_activity_at IS NOT NULL AND julianday('now') - julianday(last_activity_at) < 7 THEN 20 ELSE 0 END
  ),
  risk_score = CASE
    WHEN last_activity_at IS NULL THEN 70
    WHEN julianday('now') - julianday(last_activity_at) > 30 THEN 90
    WHEN julianday('now') - julianday(last_activity_at) > 14 THEN 70
    WHEN julianday('now') - julianday(last_activity_at) > 7 THEN 45
    ELSE 15
  END;

UPDATE "crm_profiles" SET health_score = MAX(0, 100 - risk_score);
