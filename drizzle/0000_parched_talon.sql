CREATE TABLE `ballots` (
	`room_code` text NOT NULL,
	`round` integer NOT NULL,
	`member_id` text NOT NULL,
	`rankings` text NOT NULL,
	`abstained` integer DEFAULT 0 NOT NULL,
	`submitted_at` integer NOT NULL,
	PRIMARY KEY(`room_code`, `round`, `member_id`),
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ballots_member` ON `ballots` (`member_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`profile_id` text,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`avatar` integer NOT NULL,
	`state` text DEFAULT 'joined' NOT NULL,
	`last_seen` integer NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_room_profile` ON `members` (`room_code`,`profile_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_room_name` ON `members` (`room_code`,`name_key`);--> statement-breakpoint
CREATE INDEX `idx_members_profile` ON `members` (`profile_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_subject` text,
	`name` text NOT NULL,
	`avatar` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_auth_subject` ON `profiles` (`auth_subject`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`round` integer NOT NULL,
	`member_id` text NOT NULL,
	`question` text NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_proposals_room_round_member` ON `proposals` (`room_code`,`round`,`member_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_expires` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `question_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`round` integer NOT NULL,
	`member_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_room_round_member` ON `question_reports` (`room_code`,`round`,`member_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`status` text DEFAULT 'lobby' NOT NULL,
	`pack` text NOT NULL,
	`round_count` integer NOT NULL,
	`current_round` integer DEFAULT 0 NOT NULL,
	`duration` integer NOT NULL,
	`mode` text DEFAULT 'players' NOT NULL,
	`theme_mode` text DEFAULT 'pack' NOT NULL,
	`set_name` text DEFAULT 'Les joueurs' NOT NULL,
	`targets` text DEFAULT '[]' NOT NULL,
	`roster` text DEFAULT '[]' NOT NULL,
	`deadline` integer,
	`created_at` integer NOT NULL,
	`finished_at` integer,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rooms_host_status` ON `rooms` (`host_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_rooms_expires` ON `rooms` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`room_code` text NOT NULL,
	`number` integer NOT NULL,
	`question` text,
	`skipped` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`room_code`, `number`),
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guest_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `guest_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_sessions_profile` ON `guest_sessions` (`profile_id`);--> statement-breakpoint
CREATE TABLE `saved_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`items` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sets_owner` ON `saved_sets` (`owner_id`);