CREATE TABLE `billing_customers` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`mode` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_billing_customer_id` ON `billing_customers` (`customer_id`);--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`sku` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`session_id` text,
	`payment_id` text,
	`subscription_id` text,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_billing_session` ON `billing_orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_billing_orders_profile` ON `billing_orders` (`profile_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_billing_payment` ON `billing_orders` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_billing_subscription` ON `billing_orders` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `billing_payments` (
	`payment_id` text PRIMARY KEY NOT NULL,
	`subscription_id` text,
	`order_id` text,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_payments_subscription` ON `billing_payments` (`subscription_id`);--> statement-breakpoint
CREATE TABLE `billing_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`status` text NOT NULL,
	`period_end` integer NOT NULL,
	`cancel_at_period_end` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`blocked_at` integer,
	`mode` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_profile` ON `billing_subscriptions` (`profile_id`);--> statement-breakpoint
CREATE TABLE `question_decks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`questions` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_decks_owner` ON `question_decks` (`owner_id`);--> statement-breakpoint
CREATE TABLE `entitlements` (
	`source_id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`pack_id` text,
	`expires_at` integer,
	`revoked_at` integer,
	`updated_at` integer NOT NULL,
	`mode` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_entitlements_profile` ON `entitlements` (`profile_id`);--> statement-breakpoint
CREATE TABLE `operation_locks` (
	`key` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `squad_invites` (
	`squad_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_squad_invites_token` ON `squad_invites` (`token_hash`);--> statement-breakpoint
CREATE TABLE `squad_members` (
	`squad_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`squad_id`, `profile_id`),
	FOREIGN KEY (`squad_id`) REFERENCES `squads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_squad_members_profile` ON `squad_members` (`profile_id`,`state`);--> statement-breakpoint
CREATE TABLE `squads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_squads_owner` ON `squads` (`owner_id`);--> statement-breakpoint
ALTER TABLE `members` ADD `squad_consent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `squad_id` text REFERENCES squads(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `deck_name` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `visual_theme` text DEFAULT 'neon' NOT NULL;