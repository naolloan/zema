CREATE TABLE "public"."want_to_hear" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,

    CONSTRAINT "want_to_hear_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "want_to_hear_userId_releaseId_key" ON "public"."want_to_hear"("userId", "releaseId");

ALTER TABLE "public"."want_to_hear"
ADD CONSTRAINT "want_to_hear_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."want_to_hear"
ADD CONSTRAINT "want_to_hear_releaseId_fkey"
FOREIGN KEY ("releaseId") REFERENCES "public"."releases"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
