CREATE TABLE `lesson_progress` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`state` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`recent_mutations` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
