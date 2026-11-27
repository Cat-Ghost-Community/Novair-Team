-- Additive review metadata; original customer submissions/idempotency remain unchanged.
ALTER TABLE `ProjectRequest` ADD COLUMN `reviewVersion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `ProjectRequestStatusHistory` ADD COLUMN `publicExplanation` VARCHAR(2000) NULL;
ALTER TABLE `Project`
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `plannedStart` DATE NULL,
  ADD COLUMN `targetCompletion` DATE NULL;

CREATE TABLE `AdminNote` (
  `id` VARCHAR(36) NOT NULL,
  `requestId` VARCHAR(36) NULL,
  `projectId` VARCHAR(36) NULL,
  `authorId` VARCHAR(36) NOT NULL,
  `body` VARCHAR(4000) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `AdminNote_requestId_createdAt_id_idx` (`requestId`, `createdAt`, `id`),
  INDEX `AdminNote_projectId_createdAt_id_idx` (`projectId`, `createdAt`, `id`),
  INDEX `AdminNote_authorId_idx` (`authorId`),
  CONSTRAINT `AdminNote_one_target_check` CHECK ((`requestId` IS NOT NULL AND `projectId` IS NULL) OR (`requestId` IS NULL AND `projectId` IS NOT NULL)),
  CONSTRAINT `AdminNote_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ProjectRequest` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `AdminNote_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `AdminNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AdminOperation` (
  `id` VARCHAR(36) NOT NULL,
  `actorId` VARCHAR(36) NOT NULL,
  `operationKey` VARCHAR(36) NOT NULL,
  `kind` VARCHAR(32) NOT NULL,
  `targetId` VARCHAR(36) NOT NULL,
  `payloadHash` VARCHAR(64) NOT NULL,
  `result` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AdminOperation_actorId_operationKey_key` (`actorId`, `operationKey`),
  INDEX `AdminOperation_kind_targetId_createdAt_idx` (`kind`, `targetId`, `createdAt`),
  CONSTRAINT `AdminOperation_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProjectAuditEvent` (
  `id` VARCHAR(36) NOT NULL,
  `projectId` VARCHAR(36) NOT NULL,
  `actorId` VARCHAR(36) NOT NULL,
  `changes` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ProjectAuditEvent_projectId_createdAt_id_idx` (`projectId`, `createdAt`, `id`),
  INDEX `ProjectAuditEvent_actorId_idx` (`actorId`),
  CONSTRAINT `ProjectAuditEvent_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ProjectAuditEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
