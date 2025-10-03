# Support Workflow & SLA's

**Versie**: 1.0  
**Laatste Update**: 2025-10-03  
**Eigenaar**: Support Team Lead

---

## Overzicht

Dit document beschrijft de support workflows, SLA's, ticketing proces en escalatiepaden voor JanazApp.

---

## Support Kanalen

### 1. Email Support
- **Email**: support@janazapp.nl
- **Response tijd**: Zie SLA's hieronder
- **Voor**: Algemene vragen, bug reports, feature requests

### 2. Telefoon Support
- **Nummer**: +31 (0)20 123 4567
- **Beschikbaar**: Ma-Vr 09:00 - 17:00 CET
- **Voor**: Urgente issues, P1/P2 incidents

### 3. WhatsApp Support
- **Nummer**: +31 6 12 34 56 78
- **Beschikbaar**: Ma-Vr 09:00 - 17:00 CET
- **Voor**: Snelle vragen, status updates

### 4. In-App Chat
- **Beschikbaar**: 24/7 (automated responses buiten kantooruren)
- **Voor**: Context-aware support binnen de applicatie

---

## Severity Levels & SLA's

### P1 - Critical

**Definitie**: Systeem down, geen toegang, data verlies, security breach

**Voorbeelden**:
- Applicatie onbereikbaar voor alle gebruikers
- Database down
- Security incident (data leak)
- Betalingssysteem down

**SLA**:
- **Initial Response**: 15 minuten (24/7)
- **Resolution Target**: 2 uur
- **Communication**: Elk uur updates tot opgelost

**Escalatie**: Direct naar On-Call Engineer + CTO

---

### P2 - High

**Definitie**: Belangrijke functionaliteit down, veel gebruikers getroffen

**Voorbeelden**:
- Integratie down (Mawaqit, WhatsApp, Insurer API)
- Dossiers kunnen niet worden aangemaakt
- Chat niet werkend
- Facturatie errors

**SLA**:
- **Initial Response**: 30 minuten (kantooruren), 2 uur (buiten kantooruren)
- **Resolution Target**: 4 uur
- **Communication**: Updates elke 2 uur

**Escalatie**: Na 2 uur naar Team Lead, na 4 uur naar CTO

---

### P3 - Medium

**Definitie**: Functionaliteit verslechterd, workaround beschikbaar

**Voorbeelden**:
- QR-scan soms falen
- PDF-generatie traag
- Email notificaties vertraagd
- UI bugs (geen data verlies)

**SLA**:
- **Initial Response**: 2 uur (kantooruren)
- **Resolution Target**: 1 werkdag
- **Communication**: Dagelijkse update tot opgelost

**Escalatie**: Na 1 dag naar Team Lead

---

### P4 - Low

**Definitie**: Cosmetische issues, feature requests, vragen

**Voorbeelden**:
- Spelling fouten
- Layout issues
- Feature requests
- Documentatie vragen

**SLA**:
- **Initial Response**: 4 uur (kantooruren)
- **Resolution Target**: 5 werkdagen
- **Communication**: Update bij start + bij completion

**Escalatie**: Niet van toepassing

---

## Ticketing Proces

### 1. Ticket Creation

**Automatisch**:
- Email naar support@janazapp.nl → auto-ticket in systeem
- In-app chat → auto-ticket
- Error logs (P1/P2) → auto-ticket + alert

**Manueel**:
- Telefoon gesprek → Support rep maakt ticket
- WhatsApp → Support rep maakt ticket

**Vereiste informatie per ticket**:
- Contactpersoon (naam, email, telefoon, org)
- Severity (P1/P2/P3/P4)
- Onderwerp (kort)
- Beschrijving (gedetailleerd)
- Steps to reproduce (indien bug)
- Screenshots/logs (indien relevant)
- Verwachte vs. actuele gedrag

---

### 2. Ticket Triage (binnen 15 min voor P1/P2)

**Stap 1**: Support rep verifieert severity
- Is dit echt P1? Of P2 met workaround?
- Aantal getroffen gebruikers?
- Business impact?

**Stap 2**: Support rep assigne naar:
- **P1**: Direct naar On-Call Engineer
- **P2**: Naar beschikbare Engineer
- **P3/P4**: Naar Support Queue

**Stap 3**: Klant ontvang bevestiging met:
- Ticket ID
- Severity
- Verwachte response tijd
- Assigned engineer (P1/P2)

---

### 3. Investigation & Resolution

**P1/P2 Flow**:
1. Engineer onderzoekt (gebruik runbooks!)
2. Statusupdate elke X uur (zie SLA)
3. Workaround communiceren indien mogelijk
4. Permanent fix implementeren
5. Deployment (met rollback plan)
6. Verificatie met klant
7. Post-mortem (P1 altijd, P2 optioneel)

**P3/P4 Flow**:
1. Support rep of Engineer onderzoekt
2. Fix implementeren of feature request loggen
3. Deployment in volgende release
4. Klant notificeren bij go-live

---

### 4. Ticket Closure

**Vereisten voor closure**:
- Issue opgelost OF workaround geaccepteerd door klant
- Klant confirmatie ontvangen
- Documentatie updated (runbook, FAQ, changelog)
- Post-mortem geschreven (P1/P2)

**Closure email bevat**:
- Samenvatting issue
- Root cause
- Oplossing / workaround
- Preventieve maatregelen
- Link naar post-mortem (P1/P2)

---

## Escalation Path

### Level 1: Support Team
- **Response**: Binnen SLA
- **Scope**: P3/P4, simpele P2
- **Beslissingen**: Workarounds, FAQ updates

### Level 2: Engineering Team
- **Response**: P1 direct, P2 binnen 30 min
- **Scope**: P1/P2, complexe P3
- **Beslissingen**: Hotfixes, database changes

### Level 3: Team Lead / Senior Engineer
- **Trigger**: Na 2u (P1), 4u (P2), 1 dag (P3)
- **Scope**: Stuck issues, architecture beslissingen
- **Beslissingen**: Resource allocation, escalatie naar CTO

### Level 4: CTO / Owner
- **Trigger**: P1 direct genotificeerd, P2 na 4u
- **Scope**: Business impact, klant relaties
- **Beslissingen**: Emergency resource allocation, klant compensatie

---

## On-Call Rotation

### Schema (Voorbeeld)

| Week | Primary On-Call | Secondary On-Call |
|------|----------------|-------------------|
| Week 1 | Engineer A | Engineer B |
| Week 2 | Engineer B | Engineer C |
| Week 3 | Engineer C | Engineer A |

**On-Call verantwoordelijkheden**:
- 24/7 beschikbaar voor P1/P2 alerts
- Response binnen 15 min (P1), 30 min (P2)
- Toegang tot alle systemen (VPN, admin access)
- Laptop + mobiel altijd bij de hand

**On-Call compensatie**:
- Standby fee: €X per dag
- Call-out fee: €Y per incident
- Time-off compensation: 1 dag per week on-call

---

## Communication Templates

### P1 Initial Response (binnen 15 min)
```
Beste [KLANT],

We hebben uw P1 incident ontvangen (Ticket #[ID]).

**Issue**: [KORTE OMSCHRIJVING]
**Impact**: [AANTAL GEBRUIKERS / FUNCTIONALITEIT]
**Assigned Engineer**: [NAAM]

We onderzoeken de oorzaak en communiceren elk uur updates.

Verwachte oplossing: [TIME ESTIMATE]

Met vriendelijke groet,
JanazApp Support Team
```

### Hourly Update (P1)
```
Update #[N] - Ticket #[ID]

**Status**: [INVESTIGATING / IDENTIFIED / IMPLEMENTING FIX]
**Progress**: [WHAT WE'VE DONE SO FAR]
**Next Steps**: [WHAT WE'LL DO NEXT]
**ETA**: [NEW ESTIMATE IF CHANGED]

Volgende update: [TIME]
```

### Resolution Confirmation
```
Beste [KLANT],

Uw issue (Ticket #[ID]) is opgelost.

**Root Cause**: [OORZAAK]
**Solution**: [OPLOSSING]
**Preventative Measures**: [WAT WE DOEN OM HERHALING TE VOORKOMEN]

Kunt u bevestigen dat alles weer naar verwachting werkt?

Post-mortem: [LINK] (indien P1/P2)

Met vriendelijke groet,
JanazApp Support Team
```

---

## Metrics & Reporting

### Dagelijkse Metrics
- Open tickets per severity
- Avg response tijd per severity
- Avg resolution tijd per severity
- SLA compliance (% binnen target)

### Wekelijkse Rapportage
- Tickets geopend vs. gesloten
- Top 5 meest voorkomende issues
- Escalaties (aantal + redenen)
- Customer satisfaction score

### Maandelijkse Review
- SLA performance
- Post-mortem learnings
- Process improvements
- Training needs

---

## Tools

### Ticketing System
- **Tool**: [Jira Service Management / Zendesk / Freshdesk]
- **Login**: [URL]
- **Access**: Alle support + engineering team

### Monitoring & Alerts
- **Tool**: [Datadog / New Relic / CloudWatch]
- **On-Call Alerts**: Via PagerDuty / OpsGenie
- **Status Page**: https://status.janazapp.nl

### Communication
- **Internal**: Slack #support-incidents
- **External**: Email, WhatsApp, Telefoon
- **War Room**: Google Meet link (P1)

---

## Training & Onboarding

### Nieuwe Support Rep
- **Week 1**: Shadow ervaren rep, leer ticketing systeem
- **Week 2**: Handle P4 tickets zelfstandig
- **Week 3**: Handle P3 tickets, escaleer P1/P2
- **Week 4**: Full support duties

### Nieuwe Engineer
- **Week 1**: Setup toegang, leer codebase + runbooks
- **Week 2**: Shadow on-call engineer
- **Week 3**: Handle P3/P2 tickets
- **Week 4**: On-call rotation (secondary)

---

## Appendix: Contact List

### Support Team
- **Team Lead**: [NAAM] - [EMAIL] - [TELEFOON]
- **Rep 1**: [NAAM] - [EMAIL] - [TELEFOON]
- **Rep 2**: [NAAM] - [EMAIL] - [TELEFOON]

### Engineering Team
- **Lead Engineer**: [NAAM] - [EMAIL] - [TELEFOON]
- **Engineer A**: [NAAM] - [EMAIL] - [TELEFOON]
- **Engineer B**: [NAAM] - [EMAIL] - [TELEFOON]

### Management
- **CTO**: [NAAM] - [EMAIL] - [TELEFOON]
- **Owner**: [NAAM] - [EMAIL] - [TELEFOON]

### External Vendors
- **Mawaqit Support**: support@mawaqit.net
- **WhatsApp Business**: https://business.facebook.com/support
- **Insurer Helpdesk**: [CONTACT DETAILS PER INSURER]

---

**Laatst bijgewerkt**: 2025-10-03  
**Volgende review**: 2026-01-03  
**Versie**: 1.0
