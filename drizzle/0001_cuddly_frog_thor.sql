CREATE TABLE `dependency_audit_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordedAt` timestamp NOT NULL,
	`total` int NOT NULL,
	`critical` int NOT NULL,
	`high` int NOT NULL,
	`moderate` int NOT NULL,
	`low` int NOT NULL,
	`directPackages` int NOT NULL,
	`transitivePackages` int NOT NULL,
	`source` varchar(255) NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dependency_audit_snapshots_id` PRIMARY KEY(`id`)
);
