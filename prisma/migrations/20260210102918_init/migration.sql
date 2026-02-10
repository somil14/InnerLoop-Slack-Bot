-- CreateTable
CREATE TABLE "SlackWorkspace" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlackWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricQuery" (
    "id" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "sqlKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlackWorkspace_teamId_key" ON "SlackWorkspace"("teamId");
