-- Additive: preserve legacy requests, budgets/deadlines and existing status values.
ALTER TABLE `ProjectRequest`
  ADD COLUMN `category` VARCHAR(48) NULL,
  ADD COLUMN `budgetPreference` VARCHAR(32) NULL,
  ADD COLUMN `timelinePreference` VARCHAR(32) NULL,
  ADD COLUMN `relevantUrl` VARCHAR(1000) NULL,
  ADD COLUMN `submissionKey` VARCHAR(36) NULL,
  ADD COLUMN `submissionHash` VARCHAR(64) NULL;

CREATE UNIQUE INDEX `ProjectRequest_ownerId_submissionKey_key` ON `ProjectRequest`(`ownerId`, `submissionKey`);
CREATE INDEX `ProjectRequest_ownerId_status_createdAt_id_idx` ON `ProjectRequest`(`ownerId`, `status`, `createdAt`, `id`);

CREATE TABLE `ProjectRequestStatusHistory` (
  `id` VARCHAR(36) NOT NULL,
  `requestId` VARCHAR(36) NOT NULL,
  `actorId` VARCHAR(36) NOT NULL,
  `fromStatus` ENUM('NEW', 'REVIEWING', 'ACCEPTED', 'DECLINED', 'CANCELLED') NULL,
  `toStatus` ENUM('NEW', 'REVIEWING', 'ACCEPTED', 'DECLINED', 'CANCELLED') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProjectRequestStatusHistory_requestId_createdAt_id_idx` (`requestId`, `createdAt`, `id`),
  INDEX `ProjectRequestStatusHistory_actorId_idx` (`actorId`),
  CONSTRAINT `ProjectRequestStatusHistory_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ProjectRequest` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ProjectRequestStatusHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
