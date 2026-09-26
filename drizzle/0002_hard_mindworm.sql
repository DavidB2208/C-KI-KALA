CREATE TABLE `question_feedback` (
	`room_code` text NOT NULL,
	`round` integer NOT NULL,
	`member_id` text NOT NULL,
	`rating` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`room_code`, `round`, `member_id`),
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_member` ON `question_feedback` (`member_id`);--> statement-breakpoint
CREATE TABLE `rematches` (
	`source_code` text PRIMARY KEY NOT NULL,
	`target_code` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`source_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rematches_target` ON `rematches` (`target_code`);