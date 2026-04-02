CREATE TYPE "FavoriteReleaseSection" AS ENUM ('ALBUMS', 'SONGS');

ALTER TABLE "favorites"
ADD COLUMN "section" "FavoriteReleaseSection";

UPDATE "favorites" AS f
SET "section" = CASE
  WHEN r."type" = 'SINGLE' THEN 'SONGS'::"FavoriteReleaseSection"
  ELSE 'ALBUMS'::"FavoriteReleaseSection"
END
FROM "releases" AS r
WHERE r."id" = f."releaseId";

ALTER TABLE "favorites"
ALTER COLUMN "section" SET NOT NULL;

DROP INDEX IF EXISTS "favorites_userId_position_key";

CREATE UNIQUE INDEX "favorites_userId_section_position_key"
ON "favorites"("userId", "section", "position");

CREATE TABLE "favorite_artists" (
  "id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,

  CONSTRAINT "favorite_artists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorite_artists_userId_position_key"
ON "favorite_artists"("userId", "position");

CREATE UNIQUE INDEX "favorite_artists_userId_artistId_key"
ON "favorite_artists"("userId", "artistId");

CREATE TABLE "release_likes" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "releaseId" TEXT NOT NULL,

  CONSTRAINT "release_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "release_likes_userId_releaseId_key"
ON "release_likes"("userId", "releaseId");

ALTER TABLE "favorite_artists"
ADD CONSTRAINT "favorite_artists_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorite_artists"
ADD CONSTRAINT "favorite_artists_artistId_fkey"
FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "release_likes"
ADD CONSTRAINT "release_likes_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "release_likes"
ADD CONSTRAINT "release_likes_releaseId_fkey"
FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
