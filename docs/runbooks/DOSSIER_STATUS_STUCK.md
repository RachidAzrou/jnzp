# Runbook: Dossierstatus Stuck

**Status**: Production Ready  
**Eigenaar**: Platform Admin / Support  
**Laatste Update**: 2025-10-03

---

## Overzicht

Dit runbook beschrijft hoe te handelen wanneer een dossier vastzit in een status en niet verder kan doorlopen in de workflow.

---

## Symptomen

- ⚠️ Dossier blijft in status ondanks voltooide taken
- ⚠️ Status kan niet worden gewijzigd via UI
- ⚠️ Workflow taken worden niet automatisch aangemaakt
- ⚠️ Dossier "hangt" tussen twee fases (REP ↔ LOC)

---

## Diagnose

### Stap 1: Check Dossier Details
```sql
-- Haal dossier info op
SELECT 
  d.id,
  d.display_id,
  d.status,
  d.flow,
  d.legal_hold,
  d.created_at,
  d.updated_at,
  COUNT(t.id) as open_tasks
FROM dossiers d
LEFT JOIN tasks t ON t.dossier_id = d.id AND t.status != 'DONE'
WHERE d.display_id = '[DOSSIER_DISPLAY_ID]'
GROUP BY d.id;
```

### Stap 2: Check Recent Events
```sql
-- Bekijk recente dossier events
SELECT 
  event_type,
  event_description,
  created_at,
  metadata
FROM dossier_events
WHERE dossier_id = '[DOSSIER_ID]'
ORDER BY created_at DESC
LIMIT 10;
```

### Stap 3: Check Blockers
```sql
-- Check voor blockers
SELECT 
  'Mosque Service' as blocker,
  status
FROM mosque_services
WHERE dossier_id = '[DOSSIER_ID]'

UNION ALL

SELECT 
  'Cool Cell Reservation' as blocker,
  status::TEXT
FROM cool_cell_reservations
WHERE dossier_id = '[DOSSIER_ID]'

UNION ALL

SELECT 
  'Documents' as blocker,
  status::TEXT
FROM documents
WHERE dossier_id = '[DOSSIER_ID]'
  AND status = 'REJECTED';
```

---

## Oplossing

### Scenario 1: Legal Hold Blokkade

**Symptoom**: `legal_hold = TRUE`, dossier kan niet verder

**Diagnose**:
```sql
SELECT 
  legal_hold,
  require_doc_ref,
  status
FROM dossiers
WHERE id = '[DOSSIER_ID]';
```

**Oplossing**:
1. **Verify legal hold reason**:
   ```sql
   -- Check audit logs voor legal hold
   SELECT * FROM audit_events
   WHERE dossier_id = '[DOSSIER_ID]'
     AND event_type LIKE '%LEGAL_HOLD%'
   ORDER BY created_at DESC;
   ```

2. **Options**:
   
   **A. Release hold** (met goedkeuring):
   ```sql
   UPDATE dossiers
   SET 
     legal_hold = FALSE,
     require_doc_ref = NULL,
     updated_at = NOW()
   WHERE id = '[DOSSIER_ID]';
   
   -- Log release
   INSERT INTO audit_events (
     user_id,
     event_type,
     dossier_id,
     description
   ) VALUES (
     auth.uid(),
     'LEGAL_HOLD_RELEASED',
     '[DOSSIER_ID]',
     'Legal hold opgeheven na verificatie'
   );
   ```
   
   **B. Provide required documents**:
   - Contact family voor ontbrekende documenten
   - Upload via `/documenten`
   - Legal hold wordt automatisch opgeheven na approval

---

### Scenario 2: Open Taken Blokkeren Voortgang

**Symptoom**: Status kan niet wijzigen omdat kritieke taken niet DONE zijn

**Diagnose**:
```sql
-- Check open taken
SELECT 
  id,
  task_type,
  status,
  priority,
  due_at,
  assigned_to
FROM tasks
WHERE dossier_id = '[DOSSIER_ID]'
  AND status != 'DONE'
ORDER BY priority DESC, due_at ASC;
```

**Oplossing**:
1. **Review blocking tasks**:
   - `INTAKE_COMPLETE`: Familie moet identificatie uploaden
   - `DOC_REVIEW`: Funeral director moet documenten goedkeuren
   - `MOSQUE_CONFIRM`: Moskee moet service bevestigen
   - `WASH_START`: Wasplaats moet wassen starten

2. **Manual override** (ALLEEN met goedkeuring manager):
   ```sql
   -- Force complete blocking task
   UPDATE tasks
   SET 
     status = 'DONE',
     completed_at = NOW(),
     notes = CONCAT(COALESCE(notes, ''), E'\nMANUAL OVERRIDE: Taak geforceerd voltooid door admin')
   WHERE id = '[TASK_ID]';
   
   -- Log override
   INSERT INTO audit_events (
     user_id,
     event_type,
     target_type,
     target_id,
     description,
     reason
   ) VALUES (
     auth.uid(),
     'TASK_OVERRIDE',
     'Task',
     '[TASK_ID]',
     'Taak handmatig voltooid om dossier deblokkeren',
     '[REASON: bv. Familie niet bereikbaar, moskee bevestiging via telefoon]'
   );
   ```

---

### Scenario 3: Workflow Stap Overslaan

**Symptoom**: Dossier moet van CREATED → PLANNED, maar taken voor INTAKE_PENDING worden niet aangemaakt

**Diagnose**:
```sql
-- Check of automatische taken zijn aangemaakt
SELECT task_type, COUNT(*) as count
FROM tasks
WHERE dossier_id = '[DOSSIER_ID]'
GROUP BY task_type;
```

**Oplossing**:
1. **Manual task creation**:
   ```sql
   -- Create missing INTAKE_COMPLETE task
   INSERT INTO tasks (
     dossier_id,
     task_type,
     status,
     priority,
     assigned_role,
     due_at
   ) VALUES (
     '[DOSSIER_ID]',
     'INTAKE_COMPLETE',
     'PENDING',
     'HIGH',
     'family',
     NOW() + INTERVAL '3 days'
   );
   ```

2. **Force status transition**:
   ```sql
   UPDATE dossiers
   SET 
     status = '[TARGET_STATUS]', -- bv. 'INTAKE_PENDING'
     updated_at = NOW()
   WHERE id = '[DOSSIER_ID]';
   
   -- Log status change
   INSERT INTO dossier_events (
     dossier_id,
     event_type,
     event_description,
     created_by
   ) VALUES (
     '[DOSSIER_ID]',
     'STATUS_OVERRIDE',
     'Status handmatig gewijzigd naar [TARGET_STATUS]',
     auth.uid()
   );
   ```

---

### Scenario 4: Flow Inconsistentie (REP vs LOC)

**Symptoom**: Dossier `flow = 'REP'` maar heeft wasplaats reservaties (wat LOC impliceert)

**Diagnose**:
```sql
-- Check flow vs reservaties
SELECT 
  d.flow,
  COUNT(r.id) as reservations,
  COUNT(f.id) as flights
FROM dossiers d
LEFT JOIN cool_cell_reservations r ON r.dossier_id = d.id
LEFT JOIN repatriations rep ON rep.dossier_id = d.id
LEFT JOIN flights f ON f.repatriation_id = rep.id
WHERE d.id = '[DOSSIER_ID]'
GROUP BY d.flow;
```

**Oplossing**:
1. **Correct flow**:
   ```sql
   -- Als repatriatie data bestaat → REP
   UPDATE dossiers
   SET 
     flow = 'REP',
     updated_at = NOW()
   WHERE id = '[DOSSIER_ID]'
     AND EXISTS(
       SELECT 1 FROM repatriations WHERE dossier_id = '[DOSSIER_ID]'
     );
   
   -- Als alleen wasplaats → LOC
   UPDATE dossiers
   SET 
     flow = 'LOC',
     updated_at = NOW()
   WHERE id = '[DOSSIER_ID]'
     AND NOT EXISTS(
       SELECT 1 FROM repatriations WHERE dossier_id = '[DOSSIER_ID]'
     )
     AND EXISTS(
       SELECT 1 FROM cool_cell_reservations WHERE dossier_id = '[DOSSIER_ID]'
     );
   ```

2. **Regenerate display_id** (indien nodig):
   ```sql
   -- Trigger display_id regeneration
   UPDATE dossiers
   SET display_id = NULL
   WHERE id = '[DOSSIER_ID]';
   
   -- Trigger `generate_display_id()` runs on next update
   UPDATE dossiers
   SET updated_at = NOW()
   WHERE id = '[DOSSIER_ID]';
   ```

---

### Scenario 5: Database Trigger Failure

**Symptoom**: Status updates niet gelogd in `dossier_events` of audit log

**Diagnose**:
```sql
-- Check voor trigger errors in Supabase logs
-- Via Lovable Cloud backend → Logs → Filter "trigger"
```

**Oplossing**:
1. **Manual event creation**:
   ```sql
   INSERT INTO dossier_events (
     dossier_id,
     event_type,
     event_description,
     created_by,
     metadata
   ) VALUES (
     '[DOSSIER_ID]',
     'STATUS_CHANGED',
     'Status gewijzigd van [OLD] naar [NEW]',
     auth.uid(),
     jsonb_build_object('from_status', '[OLD]', 'to_status', '[NEW]')
   );
   ```

2. **Check trigger health**:
   ```sql
   -- Verify triggers are active
   SELECT 
     trigger_name,
     event_manipulation,
     event_object_table
   FROM information_schema.triggers
   WHERE event_object_schema = 'public'
     AND event_object_table IN ('dossiers', 'tasks', 'documents');
   ```

---

## Escalatie

### Severity Levels

| Severity | Impact | Response Time |
|----------|--------|---------------|
| **P1 - Critical** | Meerdere dossiers stuck, proces gestopt | <30 min |
| **P2 - High** | Individueel dossier stuck, familie wacht | <2 uur |
| **P3 - Medium** | Minor delay, geen klacht | <4 uur |
| **P4 - Low** | Cosmetisch issue | <1 dag |

### Escalation Path
1. **Support team**: Basic troubleshooting, taak completion
2. **Platform Admin** (na 1 uur): Database fixes, status overrides
3. **Dev team** (na 4 uur): Trigger fixes, workflow redesign

---

## Prevention

### Automated Monitoring
```sql
-- Daily check: dossiers stuck in same status >3 dagen
SELECT 
  display_id,
  status,
  flow,
  updated_at,
  NOW() - updated_at as stuck_duration
FROM dossiers
WHERE updated_at < NOW() - INTERVAL '3 days'
  AND status NOT IN ('COMPLETED', 'ARCHIVED')
ORDER BY updated_at ASC;
```

### Alert Setup
```typescript
// Edge function: check-stuck-dossiers (runs daily)
const stuckDossiers = await supabase
  .from('dossiers')
  .select('id, display_id, status, updated_at')
  .lt('updated_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
  .not('status', 'in', '(COMPLETED,ARCHIVED)');

if (stuckDossiers.data && stuckDossiers.data.length > 0) {
  // Send alert to admins
  await sendSlackNotification(`⚠️ ${stuckDossiers.data.length} dossiers stuck >3 days`);
}
```

---

## Testing

### Test Scenarios
1. **Legal hold flow**: Create dossier → set legal_hold → verify blokkade
2. **Task blocking**: Create dossier → leave tasks open → try status change
3. **Flow change**: REP dossier → add wasplaats reservation → verify flow update
4. **Manual override**: Force complete task → verify audit log

---

## Appendix

### Dossier Status Flow
```
CREATED → INTAKE_PENDING → INTAKE_COMPLETE → PLANNED → 
IN_PROGRESS → COMPLETED → ARCHIVED
```

### Common Blockers
| Blocker | Resolution |
|---------|-----------|
| `legal_hold = TRUE` | Release hold of complete required docs |
| Open INTAKE task | Familie moet ID uploaden |
| Open DOC_REVIEW | FD moet documenten reviewen |
| Open MOSQUE_CONFIRM | Moskee moet service bevestigen |
| Rejected documents | Familie moet docs re-uploaden |

### Useful Queries
```sql
-- All dossiers by status
SELECT status, COUNT(*) FROM dossiers GROUP BY status;

-- Dossiers met open critical tasks
SELECT d.display_id, COUNT(t.id) as open_high_priority_tasks
FROM dossiers d
JOIN tasks t ON t.dossier_id = d.id
WHERE t.status != 'DONE' AND t.priority = 'HIGH'
GROUP BY d.display_id;

-- Average time per status
SELECT 
  status,
  AVG(updated_at - created_at) as avg_duration
FROM dossiers
GROUP BY status;
```

---

**Last Reviewed**: 2025-10-03  
**Next Review**: 2026-01-03  
**Version**: 1.0
