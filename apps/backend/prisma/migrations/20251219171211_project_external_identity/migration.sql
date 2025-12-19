-- CreateEnum
CREATE TYPE "ActionKind" AS ENUM ('AUTO_SAFE', 'NEEDS_APPROVAL', 'MANUAL_ONLY');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "externalType" TEXT,
    "name" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "bufferDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dueDate" TIMESTAMP(3),
    "nominalEstimateMin" INTEGER,
    "effectiveEstimateMin" INTEGER,
    "pfUsed" DOUBLE PRECISION,
    "pfScopeUsed" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "source" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotTask" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "nominalEstimateMin" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnapshotTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueTaskLink" (
    "id" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "githubIssueNumber" INTEGER NOT NULL,
    "githubIssueNodeId" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionProposed" (
    "id" TEXT NOT NULL,
    "kind" "ActionKind" NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PROPOSED',
    "payload" JSONB NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionProposed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionExecuted" (
    "id" TEXT NOT NULL,
    "proposedId" TEXT,
    "status" "ActionStatus" NOT NULL DEFAULT 'EXECUTED',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionExecuted_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDaily" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "pfGlobal" DOUBLE PRECISION,
    "pfByProject" JSONB,
    "pfByTag" JSONB,
    "pfByDow" JSONB,
    "sampleCounts" JSONB,
    "confidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_externalId_key" ON "Project"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_externalType_externalId_key" ON "Project"("externalType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_externalId_key" ON "Task"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SnapshotTask_snapshotId_taskId_key" ON "SnapshotTask"("snapshotId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueTaskLink_githubRepo_githubIssueNumber_key" ON "IssueTaskLink"("githubRepo", "githubIssueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ActionExecuted_proposedId_key" ON "ActionExecuted"("proposedId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDaily_day_key" ON "MetricDaily"("day");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotTask" ADD CONSTRAINT "SnapshotTask_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotTask" ADD CONSTRAINT "SnapshotTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueTaskLink" ADD CONSTRAINT "IssueTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionProposed" ADD CONSTRAINT "ActionProposed_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionProposed" ADD CONSTRAINT "ActionProposed_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionExecuted" ADD CONSTRAINT "ActionExecuted_proposedId_fkey" FOREIGN KEY ("proposedId") REFERENCES "ActionProposed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
