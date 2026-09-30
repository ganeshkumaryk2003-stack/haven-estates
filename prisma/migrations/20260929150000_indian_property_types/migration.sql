-- Move PropertyType to Indian market categories.
--   removed: CONDO (existing rows become APARTMENT), LAND (existing rows become PLOT_RESIDENTIAL)
--   added:   PLOT_RESIDENTIAL, PLOT_COMMERCIAL, PLOT_SEMI_COMMERCIAL, PLOT_INDUSTRIAL

-- Postgres cannot drop a single enum value, so rebuild the type. Rows are remapped inside the
-- cast; without that the cast of a row still holding 'CONDO' or 'LAND' would abort the migration.
-- The composite index on (listingType, propertyType, status) is rebuilt automatically.
CREATE TYPE "PropertyType_new" AS ENUM ('HOUSE', 'APARTMENT', 'TOWNHOUSE', 'PLOT_RESIDENTIAL', 'PLOT_COMMERCIAL', 'PLOT_SEMI_COMMERCIAL', 'PLOT_INDUSTRIAL', 'COMMERCIAL', 'OTHER');
ALTER TABLE "Property"
  ALTER COLUMN "propertyType" TYPE "PropertyType_new"
  USING (
    CASE "propertyType"::text
      WHEN 'CONDO' THEN 'APARTMENT'
      WHEN 'LAND' THEN 'PLOT_RESIDENTIAL'
      ELSE "propertyType"::text
    END
  )::"PropertyType_new";
ALTER TYPE "PropertyType" RENAME TO "PropertyType_old";
ALTER TYPE "PropertyType_new" RENAME TO "PropertyType";
DROP TYPE "PropertyType_old";
