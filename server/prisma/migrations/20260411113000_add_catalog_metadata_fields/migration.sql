ALTER TABLE "artists"
ADD COLUMN "spotifyPopularity" INTEGER,
ADD COLUMN "spotifyFollowers" INTEGER,
ADD COLUMN "spotifyGenres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "wikidataId" TEXT,
ADD COLUMN "wikipediaUrl" TEXT;

ALTER TABLE "releases"
ADD COLUMN "description" TEXT,
ADD COLUMN "label" TEXT,
ADD COLUMN "copyrights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "spotifyPopularity" INTEGER,
ADD COLUMN "wikidataId" TEXT,
ADD COLUMN "wikipediaUrl" TEXT;
