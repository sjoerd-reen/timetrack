-- TimeTrack initial schema
-- Copy/paste this into Neon console → SQL Editor → Run

CREATE TABLE "Project" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "startDate" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Person" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'Medewerker',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProjectMember" (
  "id" SERIAL PRIMARY KEY,
  "projectId" INTEGER NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "personId" INTEGER NOT NULL REFERENCES "Person"("id") ON DELETE CASCADE,
  "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
  UNIQUE ("projectId", "personId")
);

CREATE TABLE "TimeEntry" (
  "id" SERIAL PRIMARY KEY,
  "projectMemberId" INTEGER NOT NULL REFERENCES "ProjectMember"("id") ON DELETE CASCADE,
  "weekNumber" INTEGER NOT NULL,
  "hours" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'Realisatie',
  UNIQUE ("projectMemberId", "weekNumber", "type")
);
