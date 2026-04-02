ALTER TABLE "ratings"
ALTER COLUMN "value" TYPE DOUBLE PRECISION
USING "value"::double precision;
