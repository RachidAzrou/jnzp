
-- Verwijder alle user_roles zonder organization_id (oude test users)
DELETE FROM user_roles 
WHERE organization_id IS NULL;
