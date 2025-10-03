# Runbook: Integratie Down

**Status**: Production Ready  
**Eigenaar**: Platform Admin / DevOps  
**Laatste Update**: 2025-10-03

---

## Overzicht

Dit runbook beschrijft hoe te handelen wanneer externe integraties (Mawaqit, WhatsApp, Insurer API) niet beschikbaar zijn of fouten teruggeven.

---

## Symptomen

### Mawaqit API Down
- ⚠️ Moskee beschikbaarheid niet geladen
- ⚠️ Gebedstijden niet zichtbaar in kalender
- ⚠️ Error: "Kan beschikbaarheid niet ophalen"

### WhatsApp API Down
- ⚠️ Chat berichten niet verzonden via WhatsApp
- ⚠️ Webhook errors in logs
- ⚠️ Familie ontvangt geen updates via WhatsApp

### Insurer API Down
- ⚠️ Polis verificatie faalt
- ⚠️ Claims worden niet verstuurd
- ⚠️ Facturatie kan niet worden gevalideerd

---

## Diagnose

### Stap 1: Check Integration Health
```bash
# In Lovable Cloud backend
1. Ga naar /admin/integrations
2. Check de status van alle integraties
3. Bekijk laatste sync tijdstip en error count
```

### Stap 2: Check Logs
```sql
-- Bekijk recente audit events voor integratie fouten
SELECT * FROM audit_events
WHERE event_type LIKE '%INTEGRATION%'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Stap 3: Check External Status
- **Mawaqit**: https://status.mawaqit.net (indien beschikbaar)
- **WhatsApp Business API**: https://status.facebook.com
- **Insurer API**: Contact insurer helpdesk

---

## Oplossing

### Mawaqit API Down

#### Immediate Actions
1. **Markeer integratie als down**:
   ```sql
   UPDATE integration_refs
   SET status = 'ERROR',
       error_message = 'Mawaqit API niet bereikbaar',
       last_sync_at = NOW()
   WHERE provider = 'MAWAQIT';
   ```

2. **Schakel over naar fallback**:
   - Moskeeën kunnen handmatig beschikbaarheid invoeren via UI
   - Gebruik `mosque_availability` tabel (handmatige input)
   - Communiceer met moskeeën dat ze tijdelijk handmatig moeten invoeren

3. **Monitor recovery**:
   - Check elke 5 minuten of API weer online is
   - Log alle retry attempts in audit_events

#### Long-term Actions
- Setup monitoring voor Mawaqit uptime (Uptime Robot, Pingdom)
- Implement circuit breaker pattern (max 3 retries, 30s timeout)
- Cache gebedstijden lokaal (fallback naar cached data)

---

### WhatsApp API Down

#### Immediate Actions
1. **Schakel over naar Portal Chat**:
   ```typescript
   // In chat component - fallback naar PORTAL channel
   if (whatsappAvailable === false) {
     channel = 'PORTAL';
     showWarning('WhatsApp tijdelijk niet beschikbaar. Gebruik portal chat.');
   }
   ```

2. **Notificeer gebruikers**:
   - Toon banner op dashboard: "WhatsApp tijdelijk niet beschikbaar"
   - Email notificaties naar families als fallback
   - Log alle gemiste WhatsApp berichten voor later

3. **Queue berichten**:
   - Sla berichten op in `chat_messages` tabel
   - Markeer als `channel = 'WHATSAPP_QUEUED'`
   - Retry zodra API weer online is

#### Long-term Actions
- Implement message queue (Redis/RabbitMQ) voor retry logic
- Setup webhook monitoring (alert bij 5 mislukte webhooks)
- Backup naar SMS provider (Twilio, MessageBird)

---

### Insurer API Down

#### Immediate Actions
1. **Markeer claims als PENDING**:
   ```sql
   UPDATE claims
   SET status = 'API_PENDING',
       api_response = jsonb_build_object(
         'error', 'Insurer API niet bereikbaar',
         'retry_at', NOW() + INTERVAL '30 minutes'
       )
   WHERE status = 'SUBMITTED'
     AND updated_at > NOW() - INTERVAL '1 hour';
   ```

2. **Notificeer verzekeraar**:
   - Email naar insurer contactpersoon
   - Vermeld hoeveel claims in wachtrij staan
   - Verwachte retry tijd

3. **Manual fallback**:
   - Funeral directors kunnen PDF facturen downloaden
   - Handmatig uploaden naar verzekeraar portal
   - Markeer als `source = 'MANUAL'` in claims tabel

#### Long-term Actions
- Setup health check endpoint (ping insurer API elke 5 min)
- Implement exponential backoff retry (1m, 5m, 15m, 30m, 1h)
- Document manual claim submission proces

---

## Escalatie

### Severity Levels

| Severity | Downtime | Impact | Response |
|----------|----------|--------|----------|
| **P1 - Critical** | >2 uur | Alle integraties down | Immediate escalation, manual workarounds |
| **P2 - High** | 1-2 uur | Eén integratie down | Notify team, implement fallback |
| **P3 - Medium** | <1 uur | Intermittent errors | Monitor, log, retry |
| **P4 - Low** | <15 min | Transient errors | Auto-retry, log |

### Escalation Path
1. **First responder** (Platform Admin): Diagnose + implement fallback
2. **Team lead** (na 30 min): Escalate naar externe support
3. **CTO/Owner** (na 2 uur): Communicate naar klanten, business decision

### Contact Info
```
Platform Admin: admin@janazapp.nl (24/7 on-call)
Mawaqit Support: support@mawaqit.net
WhatsApp Business: https://business.facebook.com/support
Insurer Helpdesk: [Insurer contact details]
```

---

## Post-Incident

### Post-Mortem Checklist
- [ ] Incident tijdlijn gedocumenteerd
- [ ] Root cause analysis uitgevoerd
- [ ] Klanten geïnformeerd over downtime
- [ ] Preventieve maatregelen geïdentificeerd
- [ ] Monitoring verbeterd (nieuwe alerts)
- [ ] Runbook geüpdatet met geleerde lessen

### Metrics to Track
- **MTTR** (Mean Time To Resolve): Doel <30 min
- **MTBF** (Mean Time Between Failures): Doel >30 dagen
- **Retry success rate**: Doel >95%
- **Manual intervention rate**: Doel <5%

---

## Testing

### Quarterly Drill
Simuleer integratie downtime om proces te testen:
1. Disable integratie in config (simulate API down)
2. Trigger alert en monitor response tijd
3. Verify fallback mechanisme werkt
4. Document findings en update runbook

---

## Appendix

### Useful Commands
```sql
-- Check integratie health
SELECT provider, status, last_sync_at, error_message
FROM integration_refs
ORDER BY last_sync_at DESC;

-- Count pending claims
SELECT COUNT(*) as pending_claims
FROM claims
WHERE status = 'API_PENDING';

-- Recent WhatsApp failures
SELECT COUNT(*) as failed_messages
FROM chat_messages
WHERE channel = 'WHATSAPP'
  AND created_at > NOW() - INTERVAL '1 hour'
  AND metadata->>'delivery_status' = 'FAILED';
```

### Monitoring Dashboards
- **Lovable Cloud Analytics**: Check API latency, error rates
- **Integration Health**: `/admin/integrations`
- **Audit Logs**: `/admin/audit` (filter by INTEGRATION events)

---

**Last Reviewed**: 2025-10-03  
**Next Review**: 2026-01-03  
**Version**: 1.0
