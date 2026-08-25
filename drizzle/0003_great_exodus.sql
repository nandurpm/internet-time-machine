CREATE TABLE `portfolio_validation_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`application` varchar(120) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`status` enum('healthy','degraded','unavailable') NOT NULL,
	`httpStatus` int,
	`responseTimeMs` int,
	`attemptCount` int NOT NULL,
	`pageTitle` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_validation_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_validation_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskUid` varchar(65) NOT NULL,
	`recordedAt` timestamp NOT NULL,
	`healthyCount` int NOT NULL,
	`degradedCount` int NOT NULL,
	`unavailableCount` int NOT NULL,
	`checkedLinkCount` int NOT NULL,
	`meanResponseMs` int,
	`medianResponseMs` int,
	`slowestResponseMs` int,
	`source` varchar(255) NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_validation_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `portfolio_validation_results_run_id_idx` ON `portfolio_validation_results` (`runId`);--> statement-breakpoint
CREATE INDEX `portfolio_validation_results_status_idx` ON `portfolio_validation_results` (`status`);--> statement-breakpoint
CREATE INDEX `portfolio_validation_runs_recorded_at_idx` ON `portfolio_validation_runs` (`recordedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_validation_runs_task_uid_idx` ON `portfolio_validation_runs` (`taskUid`);