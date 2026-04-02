-- AlterTable
ALTER TABLE "artists" ADD COLUMN "spotifyId" TEXT;

-- AlterTable
ALTER TABLE "releases" ADD COLUMN "spotifyId" TEXT;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN "spotifyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "artists_spotifyId_key" ON "artists"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "releases_spotifyId_key" ON "releases"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_spotifyId_key" ON "tracks"("spotifyId");
