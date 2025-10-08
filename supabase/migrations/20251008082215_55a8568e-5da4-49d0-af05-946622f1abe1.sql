-- 1. Update org_type enum (voor organizations table)
ALTER TYPE org_type RENAME VALUE 'WASPLAATS' TO 'MORTUARIUM';

-- 2. Update app_role enum (voor user roles)
ALTER TYPE app_role RENAME VALUE 'wasplaats' TO 'mortuarium';

-- 3. Update invoice_type enum als die bestaat
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type') THEN
    ALTER TYPE invoice_type RENAME VALUE 'WASPLAATS' TO 'MORTUARIUM';
  END IF;
END $$;

-- 4. Update catalog_item_type enum als die bestaat
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catalog_item_type') THEN
    ALTER TYPE catalog_item_type RENAME VALUE 'WASPLAATS' TO 'MORTUARIUM';
  END IF;
END $$;