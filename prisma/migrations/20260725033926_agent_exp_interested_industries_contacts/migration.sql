-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('REGISTERED', 'PENDING_VERIFICATION', 'PENDING_ORGANIZATION_APPROVAL', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "civilStatus" TEXT,
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "experienceLevel" TEXT NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "interestedIndustries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "province" TEXT,
ADD COLUMN     "status" "AgentStatus" NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "zipCode" TEXT;

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");
