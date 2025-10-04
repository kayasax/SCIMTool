/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `ScimUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userName]` on the table `ScimUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ScimUser_externalId_key" ON "ScimUser"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ScimUser_userName_key" ON "ScimUser"("userName");
