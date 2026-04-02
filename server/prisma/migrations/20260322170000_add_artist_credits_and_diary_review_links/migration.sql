-- CreateEnum
CREATE TYPE "ArtistRole" AS ENUM ('MAIN_ARTIST', 'FEATURED_ARTIST', 'PRODUCER', 'COMPOSER', 'SONGWRITER', 'LYRICIST', 'ENGINEER', 'REMIXER');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "diaryEntryId" TEXT;

-- AlterTable
ALTER TABLE "tracks" ALTER COLUMN "releaseId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "artist_credits" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "releaseId" TEXT,
    "trackId" TEXT,
    "role" "ArtistRole" NOT NULL,
    "joinPhrase" TEXT,
    "position" INTEGER,

    CONSTRAINT "artist_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artist_credits_releaseId_position_idx" ON "artist_credits"("releaseId", "position");

-- CreateIndex
CREATE INDEX "artist_credits_trackId_position_idx" ON "artist_credits"("trackId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_diaryEntryId_key" ON "reviews"("diaryEntryId");

-- AddForeignKey
ALTER TABLE "artist_credits" ADD CONSTRAINT "artist_credits_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_credits" ADD CONSTRAINT "artist_credits_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_credits" ADD CONSTRAINT "artist_credits_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_diaryEntryId_fkey" FOREIGN KEY ("diaryEntryId") REFERENCES "diary_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
