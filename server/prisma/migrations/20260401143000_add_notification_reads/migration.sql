CREATE TABLE "public"."notification_reads" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "notificationKey" TEXT NOT NULL,

  CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_reads_userId_notificationKey_key"
ON "public"."notification_reads"("userId", "notificationKey");

CREATE INDEX "notification_reads_userId_createdAt_idx"
ON "public"."notification_reads"("userId", "createdAt");

ALTER TABLE "public"."notification_reads"
ADD CONSTRAINT "notification_reads_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
