-- Add slug column to organizations table for public screen URLs
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- Generate slugs for existing organizations (lowercase, hyphenated name)
UPDATE public.organizations
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Add comment
COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly identifier for public screens and links';
