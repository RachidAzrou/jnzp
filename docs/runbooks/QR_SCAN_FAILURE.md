# Runbook: QR Scan Faalt

**Status**: Production Ready  
**Eigenaar**: Platform Admin / Support  
**Laatste Update**: 2025-10-03

---

## Overzicht

Dit runbook beschrijft hoe te handelen wanneer QR code scanning faalt of tokens niet (meer) werken.

---

## Symptomen

- ⚠️ QR scan geeft error "Invalid or expired token"
- ⚠️ QR code niet scanbaar (visueel onleesbaar)
- ⚠️ Access denied ondanks geldige token
- ⚠️ Token maximum scan limit bereikt

---

## Diagnose

### Stap 1: Verify Token Status
```sql
-- Check token details
SELECT 
  id,
  dossier_id,
  created_at,
  expires_at,
  revoked,
  scan_count,
  max_scans,
  scopes
FROM qr_tokens
WHERE token = '[TOKEN_FROM_QR]';
```

**Expected Output**:
- `expires_at` > NOW()
- `revoked` = FALSE
- `scan_count` < `max_scans` (or `max_scans` IS NULL)

### Stap 2: Check Recent Scan Events
```sql
-- Bekijk scan geschiedenis
SELECT 
  created_at,
  scanned_by,
  access_granted,
  denial_reason,
  ip_address
FROM qr_scan_events
WHERE qr_token_id = '[TOKEN_ID]'
ORDER BY created_at DESC
LIMIT 10;
```

### Stap 3: Verify Dossier Access
```sql
-- Check of dossier nog bestaat en toegankelijk is
SELECT 
  d.id,
  d.display_id,
  d.status,
  d.legal_hold
FROM dossiers d
JOIN qr_tokens qt ON d.id = qt.dossier_id
WHERE qt.token = '[TOKEN_FROM_QR]';
```

---

## Oplossing

### Scenario 1: Token Expired
**Symptoom**: "Token has expired"

**Oplossing**:
1. **Generate new token**:
   ```sql
   -- Revoke old token
   UPDATE qr_tokens
   SET revoked = TRUE,
       revoke_reason = 'Token expired - replaced with new token'
   WHERE token = '[OLD_TOKEN]';
   
   -- Generate new token via UI
   -- Navigate to: /dossiers/[DOSSIER_ID] → QR Token Generator
   ```

2. **Send new QR code**:
   - Download nieuwe QR code van dossier detail pagina
   - Email naar familie/contactpersoon
   - Instructies: "Uw vorige QR code is verlopen. Gebruik deze nieuwe code."

**Prevention**:
- Standaard expiry: 30 dagen (aanpasbaar per token)
- Setup auto-renewal email 5 dagen voor expiry

---

### Scenario 2: Max Scans Reached
**Symptoom**: "Maximum scan limit reached"

**Oplossing**:
1. **Verify legitimacy**:
   ```sql
   -- Check wie token heeft gescand
   SELECT 
     scanned_by,
     COUNT(*) as scan_count,
     array_agg(DISTINCT ip_address::TEXT) as ip_addresses
   FROM qr_scan_events
   WHERE qr_token_id = '[TOKEN_ID]'
   GROUP BY scanned_by;
   ```

2. **Options**:
   - **Verhoog limit** (als legitiem gebruik):
     ```sql
     UPDATE qr_tokens
     SET max_scans = [NEW_LIMIT]
     WHERE id = '[TOKEN_ID]';
     ```
   
   - **Generate new token** (bij misbruik):
     ```sql
     -- Revoke compromised token
     UPDATE qr_tokens
     SET revoked = TRUE,
         revoke_reason = 'Max scans bereikt - mogelijk misbruik'
     WHERE id = '[TOKEN_ID]';
     
     -- Log security incident
     INSERT INTO audit_events (
       user_id,
       event_type,
       target_type,
       target_id,
       description
     ) VALUES (
       NULL,
       'QR_TOKEN_SUSPICIOUS_ACTIVITY',
       'QRToken',
       '[TOKEN_ID]',
       'Token max scans bereikt - mogelijk misbruik gedetecteerd'
     );
     ```

**Prevention**:
- Default max_scans = 10 (voor normale tokens)
- Unlimited scans alleen voor internal gebruik (funeral directors)

---

### Scenario 3: Token Revoked
**Symptoom**: "Token has been revoked"

**Oplossing**:
1. **Check revoke reason**:
   ```sql
   SELECT 
     revoked_at,
     revoked_by,
     revoke_reason
   FROM qr_tokens
   WHERE token = '[TOKEN]';
   ```

2. **Determine action**:
   - **Security revoke**: Generate nieuwe token met strengere scopes
   - **Accidental revoke**: Un-revoke (alleen als <1 uur geleden):
     ```sql
     UPDATE qr_tokens
     SET revoked = FALSE,
         revoke_reason = NULL,
         revoked_at = NULL
     WHERE id = '[TOKEN_ID]'
       AND revoked_at > NOW() - INTERVAL '1 hour';
     ```
   - **Intentional revoke**: Explain naar user waarom (legal hold, dossier closed, etc.)

---

### Scenario 4: QR Code Visueel Onleesbaar

**Symptoom**: Scanner kan QR code niet lezen (blur, damage, low contrast)

**Oplossing**:
1. **Regenerate QR code** (zelfde token, nieuwe afbeelding):
   - Ga naar `/dossiers/[DOSSIER_ID]`
   - Klik "Download QR Code" (regenerates met hogere kwaliteit)

2. **Adjust QR settings**:
   ```typescript
   // In QRTokenGenerator component
   <QRCodeCanvas
     value={token}
     size={300}              // verhoog van 256 naar 300
     level="H"               // High error correction
     includeMargin={true}
     imageSettings={{
       excavate: true        // better contrast
     }}
   />
   ```

3. **Alternative access**:
   - Familie kan inloggen via portal (geen QR nodig)
   - Funeral director kan manueel toegang verlenen

---

### Scenario 5: Access Denied (Scopes Issue)

**Symptoom**: Token scan succesvol, maar geen toegang tot gevraagde data

**Oplossing**:
1. **Check token scopes**:
   ```sql
   SELECT scopes FROM qr_tokens WHERE token = '[TOKEN]';
   -- Expected: {"basic_info": true, "documents": true, ...}
   ```

2. **Update scopes** (indien nodig):
   ```sql
   UPDATE qr_tokens
   SET scopes = jsonb_set(
     scopes,
     '{documents}',
     'true'::jsonb
   )
   WHERE id = '[TOKEN_ID]';
   ```

3. **Regenerate with correct scopes**:
   - Revoke oude token
   - Generate nieuwe token via UI met juiste scopes

---

## Escalatie

### Severity Levels

| Severity | Impact | Response Time |
|----------|--------|---------------|
| **P1 - Critical** | Alle QR scans falen | <15 min |
| **P2 - High** | Meerdere gebruikers kunnen niet scannen | <30 min |
| **P3 - Medium** | Individuele token issue | <2 uur |
| **P4 - Low** | Expired token, easy fix | <4 uur |

### Escalation Path
1. **Support team**: Diagnose + basic troubleshooting
2. **Platform Admin** (na 30 min): Database fixes, token regeneration
3. **Dev team** (na 1 uur): Code fixes, system-wide issues

---

## Prevention

### Best Practices
- **Token expiry**: Default 30 dagen, verlengen indien nodig
- **Max scans**: Stel realistisch in (10 voor families, unlimited voor FD)
- **Scope management**: Altijd minimale scopes (least privilege)
- **Regular cleanup**: Verwijder expired tokens na 30 dagen

### Monitoring
```sql
-- Daily check: tokens expiring within 5 days
SELECT 
  COUNT(*) as expiring_soon,
  array_agg(dossier_id) as dossier_ids
FROM qr_tokens
WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '5 days'
  AND NOT revoked;

-- Alert setup
CREATE OR REPLACE FUNCTION notify_expiring_tokens()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Send notification to admins
  -- Implementation: email or in-app notification
END;
$$;
```

---

## Testing

### Manual Test Scenarios
1. **Expired token**: Set `expires_at` to past, attempt scan
2. **Max scans**: Create token with `max_scans = 1`, scan twice
3. **Revoked token**: Revoke token, attempt scan
4. **Scope restriction**: Create token with `documents = false`, try to access docs

### Automated Tests
```typescript
// Playwright E2E test
test('QR scan with expired token shows error', async ({ page }) => {
  await page.goto('/qr-scan/[EXPIRED_TOKEN]');
  await expect(page.locator('text=Invalid or expired token')).toBeVisible();
});
```

---

## Appendix

### QR Token Schema
```sql
CREATE TABLE qr_tokens (
  id UUID PRIMARY KEY,
  dossier_id UUID NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  scan_count INTEGER DEFAULT 0,
  max_scans INTEGER,
  scopes JSONB NOT NULL DEFAULT '{"basic_info": true}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Useful Queries
```sql
-- Find all active tokens for dossier
SELECT * FROM qr_tokens
WHERE dossier_id = '[DOSSIER_ID]'
  AND NOT revoked
  AND expires_at > NOW();

-- Recent scan failures
SELECT * FROM qr_scan_events
WHERE NOT access_granted
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Token usage stats
SELECT 
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE revoked) as revoked_tokens,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_tokens,
  AVG(scan_count) as avg_scans
FROM qr_tokens;
```

---

**Last Reviewed**: 2025-10-03  
**Next Review**: 2026-01-03  
**Version**: 1.0
