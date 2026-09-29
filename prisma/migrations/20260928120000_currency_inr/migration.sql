-- Switch the platform currency from USD to INR.

-- New rows default to INR.
ALTER TABLE "Property" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Offer" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Reservation" ALTER COLUMN "currency" SET DEFAULT 'INR';
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- Back-fill rows written before the switch. Without this, existing listings keep
-- handing "USD" to formatMoney and would still render with a $ sign.
UPDATE "Property" SET "currency" = 'INR' WHERE "currency" = 'USD';
UPDATE "Offer" SET "currency" = 'INR' WHERE "currency" = 'USD';
UPDATE "Reservation" SET "currency" = 'INR' WHERE "currency" = 'USD';
UPDATE "Payment" SET "currency" = 'INR' WHERE "currency" = 'USD';
