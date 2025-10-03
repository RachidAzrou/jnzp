# Runbook: Facturatie Fout

**Status**: Production Ready  
**Eigenaar**: Finance Admin / Platform Admin  
**Laatste Update**: 2025-10-03

---

## Overzicht

Dit runbook beschrijft hoe te handelen bij facturatie fouten, zoals incorrecte bedragen, ontbrekende BTW, dubbele facturen, of synchronisatie issues met verzekeraars.

---

## Symptomen

- ⚠️ Factuur totaal klopt niet met ingevoerde diensten
- ⚠️ BTW berekening incorrect
- ⚠️ Dubbele facturen gegenereerd
- ⚠️ Factuur niet verstuurd naar verzekeraar
- ⚠️ Factuur status blijft hangen op DRAFT

---

## Diagnose

### Stap 1: Verify Invoice Data
```sql
-- Check factuur details
SELECT 
  i.id,
  i.invoice_number,
  i.status,
  i.subtotal,
  i.vat,
  i.total,
  i.created_at,
  i.issued_at,
  d.display_id as dossier_display_id
FROM invoices i
JOIN dossiers d ON i.dossier_id = d.id
WHERE i.invoice_number = '[INVOICE_NUMBER]';
```

### Stap 2: Check Invoice Items
```sql
-- Verify line items
SELECT 
  code,
  description,
  qty,
  unit_price,
  amount
FROM invoice_items
WHERE invoice_id = '[INVOICE_ID]'
ORDER BY created_at;
```

### Stap 3: Manual Calculation
```typescript
// Expected totals
const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
const vat = subtotal * 0.21; // 21% BTW
const total = subtotal + vat;

// Compare with DB values
console.log('Expected:', { subtotal, vat, total });
console.log('Actual:', { subtotal: invoice.subtotal, vat: invoice.vat, total: invoice.total });
```

---

## Oplossing

### Scenario 1: Incorrect Totalen

**Symptoom**: Subtotaal, BTW, of totaal klopt niet

**Oplossing**:
1. **Recalculate totals**:
   ```sql
   -- Fix via manual recalculation
   WITH item_totals AS (
     SELECT 
       invoice_id,
       SUM(amount) as subtotal
     FROM invoice_items
     WHERE invoice_id = '[INVOICE_ID]'
     GROUP BY invoice_id
   )
   UPDATE invoices i
   SET 
     subtotal = it.subtotal,
     vat = ROUND(it.subtotal * 0.21, 2),
     total = ROUND(it.subtotal * 1.21, 2),
     updated_at = NOW()
   FROM item_totals it
   WHERE i.id = it.invoice_id;
   ```

2. **Verify calculation**:
   ```sql
   SELECT 
     invoice_number,
     subtotal,
     vat,
     total,
     ROUND(subtotal * 1.21, 2) as expected_total
   FROM invoices
   WHERE id = '[INVOICE_ID]';
   ```

3. **Log correction**:
   ```sql
   INSERT INTO invoice_actions (
     invoice_id,
     user_id,
     action,
     reason
   ) VALUES (
     '[INVOICE_ID]',
     auth.uid(),
     'TOTALS_CORRECTED',
     'Handmatige correctie: herberekening subtotaal, BTW en totaal'
   );
   ```

---

### Scenario 2: Dubbele Facturen

**Symptoom**: Meerdere facturen voor hetzelfde dossier en periode

**Diagnose**:
```sql
-- Find duplicate invoices
SELECT 
  dossier_id,
  COUNT(*) as invoice_count,
  array_agg(invoice_number) as invoice_numbers
FROM invoices
WHERE dossier_id = '[DOSSIER_ID]'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY dossier_id
HAVING COUNT(*) > 1;
```

**Oplossing**:
1. **Identify correct invoice**:
   - Controleer met funeral director welke factuur correct is
   - Verify tegen wasplaats records (koelcel usage, etc.)

2. **Cancel duplicate**:
   ```sql
   -- Mark as cancelled
   UPDATE invoices
   SET 
     status = 'CANCELLED',
     notes = CONCAT(COALESCE(notes, ''), E'\nGEANNULEERD: Dubbele factuur. Zie correcte factuur: [CORRECT_INVOICE_NUMBER]'),
     updated_at = NOW()
   WHERE id = '[DUPLICATE_INVOICE_ID]';
   ```

3. **Log action**:
   ```sql
   INSERT INTO invoice_actions (
     invoice_id,
     user_id,
     action,
     reason
   ) VALUES (
     '[DUPLICATE_INVOICE_ID]',
     auth.uid(),
     'CANCELLED',
     'Dubbele factuur geannuleerd'
   );
   ```

---

### Scenario 3: Factuur Niet Verstuurd naar Verzekeraar

**Symptoom**: Status = ISSUED, maar claim = API_PENDING of niet aanwezig

**Diagnose**:
```sql
-- Check claim status
SELECT 
  i.invoice_number,
  i.status as invoice_status,
  c.status as claim_status,
  c.api_response
FROM invoices i
LEFT JOIN claims c ON c.dossier_id = i.dossier_id
WHERE i.id = '[INVOICE_ID]';
```

**Oplossing**:

**Option A: API Error**
```sql
-- Check API error details
SELECT 
  api_response->>'error' as error_message,
  api_response->>'retry_at' as retry_at
FROM claims
WHERE dossier_id = '[DOSSIER_ID]';
```

1. **Manual retry**:
   ```sql
   UPDATE claims
   SET 
     status = 'API_PENDING',
     api_response = jsonb_build_object(
       'manual_retry', true,
       'retry_requested_at', NOW()
     ),
     updated_at = NOW()
   WHERE dossier_id = '[DOSSIER_ID]';
   ```

2. **Verify external API health**: Check insurer API status

**Option B: No Claim Created**
```sql
-- Create claim manually
INSERT INTO claims (
  dossier_id,
  insurer_org_id,
  policy_number,
  status,
  source
) VALUES (
  '[DOSSIER_ID]',
  (SELECT insurer_org_id FROM dossiers WHERE id = '[DOSSIER_ID]'),
  '[POLICY_NUMBER]',
  'API_PENDING',
  'MANUAL'
);
```

**Option C: Manual Submission**
1. Download factuur PDF van `/wasplaats/facturatie`
2. Upload manueel naar verzekeraar portal
3. Update claim status:
   ```sql
   UPDATE claims
   SET 
     status = 'SUBMITTED_MANUAL',
     source = 'MANUAL',
     api_response = jsonb_build_object(
       'submitted_by', auth.uid(),
       'submitted_at', NOW(),
       'note', 'Handmatig ingediend via verzekeraar portal'
     )
   WHERE dossier_id = '[DOSSIER_ID]';
   ```

---

### Scenario 4: Factuur Status Stuck

**Symptoom**: Factuur blijft op DRAFT/PENDING terwijl deze ISSUED zou moeten zijn

**Diagnose**:
```sql
-- Check invoice actions history
SELECT 
  action,
  reason,
  created_at,
  user_id
FROM invoice_actions
WHERE invoice_id = '[INVOICE_ID]'
ORDER BY created_at DESC;
```

**Oplossing**:
1. **Force status update** (met goedkeuring FD):
   ```sql
   UPDATE invoices
   SET 
     status = 'ISSUED',
     issued_at = NOW(),
     updated_at = NOW()
   WHERE id = '[INVOICE_ID]'
     AND status IN ('DRAFT', 'PENDING');
   ```

2. **Log override**:
   ```sql
   INSERT INTO invoice_actions (
     invoice_id,
     user_id,
     action,
     reason,
     metadata
   ) VALUES (
     '[INVOICE_ID]',
     auth.uid(),
     'STATUS_OVERRIDE',
     'Admin override: status geforceerd naar ISSUED',
     jsonb_build_object('previous_status', '[OLD_STATUS]')
   );
   ```

3. **Generate invoice number** (indien ontbreekt):
   ```sql
   -- Trigger invoice number generation
   UPDATE invoices
   SET updated_at = NOW()
   WHERE id = '[INVOICE_ID]'
     AND invoice_number IS NULL;
   -- Note: Trigger `generate_wasplaats_invoice_number()` should run automatically
   ```

---

### Scenario 5: Ontbrekende Diensten

**Symptoom**: Factuur mist items die wel geleverd zijn

**Diagnose**:
```sql
-- Check cool cell reservations vs invoice items
SELECT 
  r.id,
  r.start_at,
  r.end_at,
  r.note,
  EXISTS(
    SELECT 1 FROM invoice_items ii
    WHERE ii.invoice_id = '[INVOICE_ID]'
      AND ii.description LIKE '%' || r.id::TEXT || '%'
  ) as invoiced
FROM cool_cell_reservations r
WHERE r.dossier_id = '[DOSSIER_ID]'
  AND r.status = 'COMPLETED';
```

**Oplossing**:
1. **Add missing items**:
   ```sql
   INSERT INTO invoice_items (
     invoice_id,
     code,
     description,
     qty,
     unit_price,
     amount
   ) VALUES (
     '[INVOICE_ID]',
     'KOELCEL_DAG',
     'Koelcel gebruik (ontbrekend item)',
     3, -- aantal dagen
     50.00,
     150.00
   );
   ```

2. **Recalculate totals** (zie Scenario 1)

3. **Mark as corrected**:
   ```sql
   UPDATE invoices
   SET 
     status = 'PENDING_REVIEW',
     notes = CONCAT(COALESCE(notes, ''), E'\nGECORRIGEERD: Ontbrekende items toegevoegd'),
     updated_at = NOW()
   WHERE id = '[INVOICE_ID]';
   ```

---

## Escalatie

### Severity Levels

| Severity | Impact | Response Time |
|----------|--------|---------------|
| **P1 - Critical** | Meerdere facturen incorrect, betaling geblokkeerd | <1 uur |
| **P2 - High** | Individuele factuur incorrect, klant klaagt | <4 uur |
| **P3 - Medium** | Minor calculation error, geen klacht | <1 dag |
| **P4 - Low** | Cosmetische fout, geen impact | <3 dagen |

### Escalation Path
1. **Finance Admin**: Diagnose + manual fixes
2. **Platform Admin** (na 1 uur): Database corrections, API troubleshooting
3. **CTO** (na 4 uur): System-wide issues, verzekeraar contact

---

## Prevention

### Automated Checks
```sql
-- Daily invoice validation query
WITH validation AS (
  SELECT 
    i.id,
    i.invoice_number,
    i.subtotal,
    i.vat,
    i.total,
    ROUND(i.subtotal * 1.21, 2) as expected_total,
    ABS(i.total - ROUND(i.subtotal * 1.21, 2)) as diff
  FROM invoices i
  WHERE i.created_at > NOW() - INTERVAL '7 days'
)
SELECT * FROM validation
WHERE diff > 0.10 -- >10 cent verschil
ORDER BY diff DESC;
```

### Best Practices
- **Review before issuing**: Wasplaats moet factuur reviewen voordat status → ISSUED
- **BTW check**: Altijd 21% (NL standaard) tenzij anders
- **Item descriptions**: Gebruik duidelijke omschrijvingen (koelcel, wassen, etc.)
- **Backup PDFs**: Bewaar PDF kopie lokaal voordat verzenden naar verzekeraar

---

## Testing

### Test Scenarios
1. **Calculation test**: Create invoice met 3 items, verify totals
2. **Duplicate prevention**: Try to create 2 invoices voor hetzelfde dossier
3. **Status flow**: Draft → Pending → Issued → Paid
4. **API failure**: Simulate insurer API down, verify retry mechanism

---

## Appendix

### Invoice Calculation Formula
```typescript
// Business logic
const subtotal = items.reduce((sum, item) => {
  return sum + (item.qty * item.unit_price);
}, 0);

const vat = Math.round(subtotal * 0.21 * 100) / 100; // Round to 2 decimals
const total = subtotal + vat;
```

### Common Item Codes
| Code | Description | Unit Price (€) |
|------|-------------|----------------|
| KOELCEL_DAG | Koelcel gebruik per dag | 50.00 |
| WASSEN_STANDAARD | Rituele wassing standaard | 150.00 |
| WASSEN_COMPLEX | Rituele wassing complex | 250.00 |
| KIST_BASIS | Basis kist | 200.00 |
| TRANSPORT | Transport per km | 2.50 |

### Useful Queries
```sql
-- Facturen zonder invoice_number
SELECT * FROM invoices WHERE invoice_number IS NULL AND status != 'DRAFT';

-- High-value invoices (>€1000)
SELECT * FROM invoices WHERE total > 1000 ORDER BY total DESC;

-- Unpaid invoices older than 30 days
SELECT * FROM invoices 
WHERE status = 'ISSUED' 
  AND issued_at < NOW() - INTERVAL '30 days'
  AND paid_at IS NULL;
```

---

**Last Reviewed**: 2025-10-03  
**Next Review**: 2026-01-03  
**Version**: 1.0
