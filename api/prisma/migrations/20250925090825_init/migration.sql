-- CreateTable
CREATE TABLE "ScimUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scimId" TEXT NOT NULL,
    "externalId" TEXT,
    "userName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rawPayload" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScimGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scimId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,
    "value" TEXT NOT NULL,
    "type" TEXT,
    "display" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScimGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ScimUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" INTEGER,
    "durationMs" INTEGER,
    "requestHeaders" TEXT NOT NULL,
    "requestBody" TEXT,
    "responseHeaders" TEXT,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ScimUser_scimId_key" ON "ScimUser"("scimId");

-- CreateIndex
CREATE UNIQUE INDEX "ScimGroup_scimId_key" ON "ScimGroup"("scimId");
