ALTER TABLE "users"
  ADD COLUMN "googleId" TEXT,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "users"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt");

CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

CREATE TYPE "AuthTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

CREATE TABLE "auth_tokens" (
  "id" TEXT NOT NULL,
  "type" "AuthTokenType" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");
CREATE INDEX "auth_tokens_userId_type_idx" ON "auth_tokens"("userId", "type");
CREATE INDEX "auth_tokens_expiresAt_idx" ON "auth_tokens"("expiresAt");

ALTER TABLE "auth_tokens"
  ADD CONSTRAINT "auth_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
