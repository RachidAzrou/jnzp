-- Step 1: Remove default values that reference WHATSAPP
ALTER TABLE chat_messages ALTER COLUMN channel DROP DEFAULT;

-- Step 2: Update existing WHATSAPP values to PORTAL
UPDATE chat_messages SET channel = 'PORTAL' WHERE channel = 'WHATSAPP';
UPDATE dossier_communication_preferences SET last_channel_used = 'PORTAL' WHERE last_channel_used = 'WHATSAPP';

-- Step 3: Create new enum without WHATSAPP
ALTER TYPE communication_channel RENAME TO communication_channel_old;
CREATE TYPE communication_channel AS ENUM ('PORTAL');

-- Step 4: Update columns to use new enum
ALTER TABLE dossier_communication_preferences 
  ALTER COLUMN last_channel_used TYPE communication_channel USING last_channel_used::text::communication_channel;

ALTER TABLE chat_messages 
  ALTER COLUMN channel TYPE communication_channel USING channel::text::communication_channel;

-- Step 5: Set new default
ALTER TABLE chat_messages ALTER COLUMN channel SET DEFAULT 'PORTAL'::communication_channel;

-- Step 6: Drop WhatsApp-related columns
ALTER TABLE dossier_communication_preferences DROP COLUMN IF EXISTS whatsapp_phone;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS whatsapp_message_id;
ALTER TABLE family_contacts DROP COLUMN IF EXISTS whatsapp_phone;
ALTER TABLE fd_reviews DROP COLUMN IF EXISTS whatsapp_phone;
ALTER TABLE organizations DROP COLUMN IF EXISTS whatsapp;

-- Step 7: Drop old enum
DROP TYPE communication_channel_old;