/*
  Warnings:

  - You are about to drop the column `fullName` on the `Agent` table. All the data in the column will be lost.
  - Added the required column `fullname` to the `Agent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "fullName",
ADD COLUMN     "fullname" TEXT NOT NULL;
