-- AlterTable
ALTER TABLE "users" ADD COLUMN "spotifyAccountId" TEXT;

-- CreateTable
CREATE TABLE "track_ratings" (
    "id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "track_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_spotifyAccountId_key" ON "users"("spotifyAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "track_ratings_userId_trackId_key" ON "track_ratings"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "track_ratings" ADD CONSTRAINT "track_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_ratings" ADD CONSTRAINT "track_ratings_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
