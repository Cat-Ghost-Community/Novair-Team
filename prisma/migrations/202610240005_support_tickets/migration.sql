-- AlterTable
ALTER TABLE `Ticket` ADD COLUMN `category` VARCHAR(32) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN `customerReadSequence` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lastCustomerSequence` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastSupportSequence` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `messageSequence` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `supportReadSequence` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('OPEN', 'WAITING', 'WAITING_CUSTOMER', 'WAITING_SUPPORT', 'CLOSED') NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE `TicketMessage` ADD COLUMN `authorRole` ENUM('ADMIN', 'USER') NULL,
    ADD COLUMN `sequence` INTEGER NULL;

-- Preserve the last known activity of legacy tickets without inventing events or authorship.
UPDATE `Ticket` SET `lastActivityAt` = `updatedAt`;

CREATE INDEX `Ticket_ownerId_lastActivityAt_id_idx` ON `Ticket`(`ownerId`, `lastActivityAt`, `id`);
CREATE INDEX `Ticket_lastActivityAt_id_idx` ON `Ticket`(`lastActivityAt`, `id`);

-- CreateTable
CREATE TABLE `TicketNote` (
    `id` VARCHAR(36) NOT NULL,
    `ticketId` VARCHAR(36) NOT NULL,
    `authorId` VARCHAR(36) NOT NULL,
    `body` VARCHAR(4000) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketNote_ticketId_createdAt_id_idx`(`ticketId`, `createdAt`, `id`),
    INDEX `TicketNote_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketStatusHistory` (
    `id` VARCHAR(36) NOT NULL,
    `ticketId` VARCHAR(36) NOT NULL,
    `actorId` VARCHAR(36) NOT NULL,
    `actorRole` ENUM('ADMIN', 'USER') NOT NULL,
    `fromStatus` ENUM('OPEN', 'WAITING', 'WAITING_CUSTOMER', 'WAITING_SUPPORT', 'CLOSED') NULL,
    `toStatus` ENUM('OPEN', 'WAITING', 'WAITING_CUSTOMER', 'WAITING_SUPPORT', 'CLOSED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketStatusHistory_ticketId_createdAt_id_idx`(`ticketId`, `createdAt`, `id`),
    INDEX `TicketStatusHistory_actorId_idx`(`actorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketOperation` (
    `id` VARCHAR(36) NOT NULL,
    `actorId` VARCHAR(36) NOT NULL,
    `operationKey` VARCHAR(36) NOT NULL,
    `kind` VARCHAR(32) NOT NULL,
    `payloadHash` VARCHAR(64) NOT NULL,
    `result` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TicketOperation_actorId_operationKey_key`(`actorId`, `operationKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Ticket_ownerId_status_lastActivityAt_id_idx` ON `Ticket`(`ownerId`, `status`, `lastActivityAt`, `id`);

-- CreateIndex
CREATE INDEX `Ticket_status_lastActivityAt_id_idx` ON `Ticket`(`status`, `lastActivityAt`, `id`);

-- CreateIndex
CREATE INDEX `TicketMessage_ticketId_createdAt_id_idx` ON `TicketMessage`(`ticketId`, `createdAt`, `id`);

-- CreateIndex
CREATE UNIQUE INDEX `TicketMessage_ticketId_sequence_key` ON `TicketMessage`(`ticketId`, `sequence`);

-- AddForeignKey
ALTER TABLE `TicketNote` ADD CONSTRAINT `TicketNote_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketNote` ADD CONSTRAINT `TicketNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketStatusHistory` ADD CONSTRAINT `TicketStatusHistory_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketStatusHistory` ADD CONSTRAINT `TicketStatusHistory_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketOperation` ADD CONSTRAINT `TicketOperation_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
