/*
  Warnings:

  - You are about to drop the column `userId` on the `OrganizationMembership` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[agentId,orgId]` on the table `OrganizationMembership` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_userId_fkey";

-- DropIndex
DROP INDEX "OrganizationMembership_agentId_idx";

-- DropIndex
DROP INDEX "OrganizationMembership_userId_orgId_key";

-- AlterTable
ALTER TABLE "OrganizationMembership" DROP COLUMN "userId";

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_agentId_orgId_key" ON "OrganizationMembership"("agentId", "orgId");
