CREATE TYPE "public"."CommentPermission" AS ENUM ('ANYONE', 'FOLLOWING', 'SELF');

ALTER TABLE "public"."users"
ADD COLUMN "commentPermission" "public"."CommentPermission" NOT NULL DEFAULT 'FOLLOWING';

CREATE TABLE "public"."list_comments" (
  "id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "listId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,

  CONSTRAINT "list_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "list_comments_listId_createdAt_idx"
ON "public"."list_comments"("listId", "createdAt");

ALTER TABLE "public"."list_comments"
ADD CONSTRAINT "list_comments_listId_fkey"
FOREIGN KEY ("listId") REFERENCES "public"."lists"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."list_comments"
ADD CONSTRAINT "list_comments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
