-- Add REJECTED and OCCUPIED to reservation_status enum
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'OCCUPIED';