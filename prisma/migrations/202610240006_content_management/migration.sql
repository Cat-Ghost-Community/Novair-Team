-- Additive editorial fields only; original publication flags, identifiers and relations are retained.
ALTER TABLE `Service` ADD COLUMN `category` VARCHAR(48) NULL,
  ADD COLUMN `highlights` JSON NULL, ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `PortfolioItem` ADD COLUMN `technologies` JSON NULL,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `Faq` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `SiteSetting` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `ContentOperation` (
  `id` VARCHAR(36) NOT NULL, `actorId` VARCHAR(36) NOT NULL,
  `operationKey` VARCHAR(36) NOT NULL, `payloadHash` VARCHAR(64) NOT NULL,
  `result` JSON NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ContentOperation_actorId_operationKey_key` (`actorId`, `operationKey`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ContentOperation_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContentAudit` (
  `id` VARCHAR(36) NOT NULL, `actorId` VARCHAR(36) NOT NULL,
  `kind` VARCHAR(20) NOT NULL, `targetId` VARCHAR(100) NOT NULL,
  `action` VARCHAR(24) NOT NULL, `version` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ContentAudit_kind_targetId_createdAt_id_idx` (`kind`, `targetId`, `createdAt`, `id`),
  INDEX `ContentAudit_actorId_idx` (`actorId`), PRIMARY KEY (`id`),
  CONSTRAINT `ContentAudit_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
