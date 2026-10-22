CREATE TABLE `ai_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ts` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_requests_user_time` ON `ai_requests` (`user_id`,`ts`);--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`day` text PRIMARY KEY NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`name` text NOT NULL,
	`ts` integer NOT NULL,
	`properties` text DEFAULT '{}' NOT NULL,
	`duration_ms` integer
);
--> statement-breakpoint
CREATE INDEX `events_time` ON `analytics_events` (`ts`);--> statement-breakpoint
CREATE INDEX `events_session` ON `analytics_events` (`session_id`);--> statement-breakpoint
CREATE TABLE `analytics_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`channel` text NOT NULL,
	`campaign` text DEFAULT '' NOT NULL,
	`country` text NOT NULL,
	`device` text NOT NULL,
	`os` text NOT NULL,
	`browser` text NOT NULL,
	`returning` integer DEFAULT 0 NOT NULL,
	`rate_window` integer NOT NULL,
	`rate_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_visitor` ON `analytics_sessions` (`visitor_id`);--> statement-breakpoint
CREATE INDEX `sessions_last_seen` ON `analytics_sessions` (`last_seen`);