# JanazApp - Product Requirements Document (PRD)
**Versie:** 1.0 (MVP)  
**Type:** Multi-tenant B2B2C SaaS Platform  
**Laatst bijgewerkt:** 2025

---

## 🔄 Change Log — versie 1.0 (MVP updates)

| Thema | Oude versie | Nieuwe versie |
|-------|-------------|---------------|
| **Documentcontrole** | Verplicht upload + review | Vrij upload + meldingen |
| **Statusflow** | MOSQUE → WASH | WASH → JANĀZA |
| **Verzekering** | Door FD via RPC | Automatisch bij intake |
| **Facturatie** | Enkel intern | Intern + upload externe facturen |
| **Feedback** | Niet gespecificeerd | WhatsApp na archivering |
| **Ceremonie** | Algemeen "service" | Janāza-gebed + begrafenis |

---

## 📋 Prioriteitenlijst (Development Sprint)

| Prioriteit | Module | Omschrijving |
|------------|--------|--------------|
| **P1** | FD-dashboard | Advisory pop-ups bij statuswijzigingen |
| **P1** | Financiën | Uniform facturatie + externe facturen upload |
| **P2** | Reviews | Feedbackflow via WhatsApp + tabel fd_reviews |
| **P2** | Stakeholders | Automatisch vullen vanuit WhatsApp intake |
| **P3** | Terminologie | "Ceremonie" → "Janāza-gebed" |
| **P3** | Dossierstatus | Nieuwe lifecycle (LOC/REP) implementeren |

---

## 1. Executive Summary

### Product Name: JanazApp
**Version:** 1.0 (MVP)  
**Type:** Multi-tenant B2B2C SaaS Platform

### Purpose
Comprehensive Islamic funeral management system connecting families, funeral directors, wasplaatsen (mortuaria), mosques, and insurance companies.

### Core Value Proposition
JanazApp digitaliseert en stroomlijnt het volledige islamitische uitvaartproces — van overlijden tot begrafenis of repatriëring — en verbindt alle betrokken partijen via één platform. Het systeem werkt veilig (GDPR), meertalig (NL/FR/EN) en realtime.

### MVP-principes
1. **FD behoudt volledige controle** — JanazApp controleert niets inhoudelijks
2. **Systeem begeleidt** met niet-blokkerende meldingen ("Heb je alles geüpload?")
3. **Verzekering wordt automatisch geverifieerd** tijdens de WhatsApp-intake
4. **Na archivering** wordt familie automatisch om feedback gevraagd via WhatsApp

---

## 2. System Architecture

### 2.1 Technology Stack

| Component | Technologie |
|-----------|-------------|
| **Frontend** | React 18.3 + TypeScript + Vite |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **Auth** | Supabase Auth + 2FA |
| **Storage** | Supabase Storage (documentbeheer) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | TanStack Query |
| **i18n** | i18next (NL/FR/EN) |
| **Realtime** | Supabase Realtime |
| **Communication** | WhatsApp Business API |

### 2.2 Database Kernentiteiten

1. **Organizations** — Funeral directors, wasplaatsen, moskeeën, verzekeraars
2. **Users & Roles** — RBAC via `user_roles`
3. **Dossiers** — Case files met volledige lifecycle
4. **Documents** — Uploads & bewijsstukken (vrij label)
5. **Stakeholders** — Externe partijen (moskee, mortuarium, consulaat, airline, etc.)
6. **Invoices** — Uniform facturatiesysteem (intern + extern)
7. **Reviews** — Feedback van families (`fd_reviews`)
8. **Audit Logs** — Alle systeemacties

---

## 3. User Roles & Permissions

### 3.1 Hierarchie

```
platform_admin
└── admin
    ├── org_admin
    ├── funeral_director
    ├── wasplaats
    ├── mosque
    ├── insurer
    └── family
```

### 3.2 Belangrijkste rollen

#### **Funeral Director (FD)**
- Ontvangt aanvragen via JanAssist (WhatsApp)
- Kan dossiers accepteren/weigeren
- Intake plannen & uitvoeren
- **Documenten uploaden** (vrij label, geen templates)
- **Stakeholders beheren** (deels automatisch ingevuld)
- Statussen wijzigen met bevestiging ("check documents")
- **Facturen aanmaken & uploaden** (intern + extern)
- Communicatie met familie via WhatsApp
- **Dossier archiveren** (trigger feedbackflow)

#### **Family**
- Start dossier via WhatsApp
- Upload documenten (optioneel)
- Ontvangt updates & feedbackverzoek

#### **Mosque**
- Bevestigt Janāza-gebed
- Beheert beschikbaarheidstijden

#### **Wasplaats**
- Regelt wassing & koeling
- Genereert eigen facturen (in-app)

#### **Insurer**
- Ontvangt dossiers en facturen
- Beoordeelt uploads & vergoedingen

---

## 4. Core Business Flows

### 4.1 Dossier Lifecycle

#### **LOC (Lokaal)**
```
CREATED → ACCEPTED → WASH_SCHEDULED → JANAZA_PLANNED → 
BURIAL_CONFIRMED → EXECUTED → ADMIN_WRAPUP → ARCHIVED
```

#### **REP (Repatriëring)**
```
CREATED → ACCEPTED → RELEASE_CONFIRMED → CONSULAR_DOCS_TRACKED → 
FLIGHT_INFO_ADDED → EXECUTED → ADMIN_WRAPUP → ARCHIVED
```

**Belangrijk:**
- ❌ Geen systeemvalidatie; FD bevestigt handmatig
- ✅ JanazApp toont adviserende pop-up ("Heb je alle documenten geüpload?")
- ✅ Elke bevestiging wordt gelogd in de tijdlijn

---

### 4.2 Intake Flow (WhatsApp)

1. **Nabestaande start gesprek** met JanAssist
2. **Bot vraagt naar:**
   - Locatie van overlijden
   - **Verzekering** (met polisnummercheck via verzekeraar-API)
   - Type uitvaart: lokaal of repatriëring
   - Voorkeuren: moskee, luchthaven, luchtvaartmaatschappij, ontvanger
3. **Alle gegevens doorgestuurd** naar backend → dossier-aanvraag
4. **FD ontvangt aanvraag** in JanazApp en beslist: **Accepteren** of **Weigeren**

---

### 4.3 Dossierbeheer (FD)

#### **Intakegesprek**
- Knop **"Plan intakegesprek"**
- Datum/tijd + notitie → tijdlijnlog + taak "Intake uitvoeren"

#### **Documenten**
- ✅ Upload-only
- ✅ Vrij veld omschrijving
- ❌ Geen templates of e-sign
- ❌ Geen verplichte documenten
- ✅ Alles zichtbaar in tijdlijn

#### **Stakeholders**
**Automatisch uit WhatsApp ingevuld:**
- Verzekeraar
- Moskee
- Ziekenhuis / Mortuarium
- Ambassade / Consulaat (bij Repa)
- Airline / Cargo / Ontvanger

**FD kan aanvullen** of nieuwe toevoegen (begraafplaats, vervoerder, etc.)

---

### 4.4 Lokaal traject

#### **Fase A — Wassing & mortuarium**
1. FD selecteert of voegt mortuarium toe
2. Bevestigt datum/tijd → tijdlijn **"Wassing vastgelegd bij [locatie]"**
3. Volgende stap pas na bevestigde wassing

#### **Fase B — Janāza-gebed**
1. Moskee automatisch voorgesteld via WhatsApp-voorkeur
2. FD vraagt beschikbaarheid via app (geen bellen nodig)
3. Bij akkoord → status **"Bevestigd"**
4. Tijdlijn: **"Janāza gepland op [datum/tijd] bij [moskee]"**

#### **Fase C — Begraafplaats**
1. FD vult in of uploadt bevestiging
2. Tijdlijn: **"Begraafplaats bevestigd [datum/tijd]"**

#### **Fase D — Financiën & Archivering**
1. Upload externe facturen (mortuarium, moskee, begraafplaats)
2. Maak eigen factuur aan verzekeraar (in-app)
3. Sluit dossier → **WhatsApp-feedback naar familie**
4. Beoordeling opgeslagen in `fd_reviews`

---

### 4.5 Repatriëring traject

#### **Fase A — Vrijgave & documenten**
- Upload overlijdensakte, verklaring
- Geen validatie; FD beslist wanneer compleet

#### **Fase B — Consulair proces**
- Ambassade/consulaat automatisch toegevoegd
- FD uploadt NOC, legalisatie, apostille
- Pop-up vóór volgende stap: **"Controleer of consulaire documenten compleet zijn"**

#### **Fase C — Kist & preparatie**
- FD regelt kist en sealing
- Upload bewijs indien gewenst

#### **Fase D — Vlucht & Cargo**
- Automatisch ingevuld vanuit WhatsApp (airline, luchthaven, ontvanger)
- FD vult aan (vluchtnummer, datum, tijd, AWB)
- Upload bevestiging
- WhatsApp-update naar familie

#### **Fase E — Overdracht & afronding**
- Ontvangende partij bevestigt ontvangst
- FD uploadt laatste facturen
- FD sluit dossier → **WhatsApp-feedback naar familie**

---

## 5. Module Breakdown

### 5.1 Funeral Director Module

**Pages:**
- Dashboard
- Dossiers
- Dossier Detail
- Planning
- Chat
- Financiën
- Team Management

**Key Features:**
- ✅ Intake ontvangen & accepteren/weigeren
- ✅ Vrije documentuploads
- ✅ Automatisch ingevulde stakeholders (uit WhatsApp)
- ✅ Niet-blokkerende meldingen bij statusovergangen
- ✅ Uniforme facturen aanmaken (in-app)
- ✅ Externe facturen uploaden als bijlagen
- ✅ WhatsApp-communicatie met familie
- ✅ Archivering → automatische feedbackflow

**Feedback Loop:**
Na archivering ontvangt familie automatisch WhatsApp-verzoek voor beoordeling (1–5 sterren + opmerking). Resultaat opgeslagen in `fd_reviews` → zichtbaar voor FD, admin en verzekeraar.

---

### 5.2 Wasplaats Module

**Pages:**
- Dashboard
- Reservaties
- Koelcellen
- Facturatie

**Key Features:**
- Koelcel management
- Wassing scheduling
- Interne facturatie (automatische nummering)
- Status tracking

---

### 5.3 Mosque Module

**Pages:**
- Dashboard
- Aanvragen
- Beschikbaarheid
- Publiek scherm

**Key Features:**
- Janāza-aanvragen ontvangen
- Beschikbaarheidstijden beheren
- Publiek gebedstijden scherm

---

### 5.4 Insurance Module

**Pages:**
- Dashboard
- Dossiers
- Documenten
- Facturen
- Rapportage

**Key Features:**
- Automatische polischeck bij intake
- Dossiers & documenten inzien
- Facturen ontvangen (intern + extern)
- Goedkeuring/afwijzing claims

---

### 5.5 Family Module

**Pages:**
- Dashboard
- Locatie
- Polis
- Identificatie
- Chat
- Documenten

**Key Features:**
- Dossierstatus volgen
- Documenten uploaden
- WhatsApp communicatie
- Feedbackformulier na archivering

---

## 6. Communication System

### Kanalen

| Kanaal | Gebruik |
|--------|---------|
| **WhatsApp** | Automatisering, intake, feedback |
| **Portal-chat** | Real-time |
| **Email** | Resend.com (notificaties) |

### Familie krijgt:
- Automatische updates (bevestiging intake, gebedstijd, vluchtinfo)
- **Feedbackverzoek na archivering**

---

## 7. Integrations & APIs

### WhatsApp Business API
- **Intakeflow** (JanAssist)
- Automatische updates & feedback
- Webhook: `/whatsapp-webhook`

### Insurance API
- **Polischeck tijdens intake**
- ❌ Geen claim-submission via FD in MVP (alleen upload factuur)

---

## 8. Workflow Automations

| Event | Actie |
|-------|-------|
| Dossier aangemaakt | Tijdlijn-entry + taken genereren |
| Document geüpload | Tijdlijn-entry + notificatie |
| Status gewijzigd | Advies-popup + tijdlijnlog |
| **Dossier gearchiveerd** | **WhatsApp-feedback naar familie + review opgeslagen** |

---

## 9. Financial System

### Uniform Facturatie

#### **Interne facturen**
- Automatische nummering (`F-YYYY-###`)
- 21% btw
- Status: `Draft → Issued → Paid`
- Immutable na uitgifte
- Zichtbaar voor gekoppelde partijen (bv. FD → verzekeraar)

#### **Externe facturen**
- FD kan derdenfacturen uploaden (mortuarium, moskee, cargo, etc.)
- Vrije omschrijving, optioneel bedrag & status
- Geen nummering of btw-logica
- Zichtbaar voor FD + verzekeraar
- Opgeslagen onder dossier & audit-log

### Overzicht in Financiën-tabblad

| Type | Omschrijving | Bedrag | Status | Actie |
|------|-------------|--------|--------|-------|
| In-app factuur | FD → Verzekeraar (#2025-014) | € 4 950 | Issued | Download |
| Externe factuur | Mortuarium – koelcel | € 450 | Betaald | Download |
| Externe factuur | Moskee Nour – Janāza | € 250 | Openstaand | Download |

---

## 10. Security & Compliance

- ✅ Supabase RLS en audit logging op alle acties
- ✅ GDPR export & verwijdering
- ✅ Encryptie at rest
- ✅ 2FA verplicht voor professionele rollen
- ✅ Volledige audit trail (`audit_logs`)

---

## 11. Feedback & Reviews

| Item | Details |
|------|---------|
| **Trigger** | Automatisch bij archivering |
| **Kanaal** | WhatsApp via JanAssist |
| **Response** | 1–5 sterren + optionele opmerking |
| **Opslag** | Tabel `fd_reviews(fd_id, case_id, rating, comment, created_at)` |
| **Zichtbaar voor** | FD, JanazApp-admin, verzekeraar |

---

## 12. Business Rules & Validations

| Regel | Beschrijving |
|-------|--------------|
| **Documentcontrole** | Niet verplicht; FD beslist zelf |
| **Statusovergangen** | Adviserend (niet-blokkerend) |
| **Verzekering** | Automatisch gevalideerd bij intake |
| **Facturen** | Uniform model (intern + extern uploads) |
| **Feedback** | Altijd na archivering |
| **Aansprakelijkheid** | FD volledig verantwoordelijk; JanazApp registreert alleen |

---

## 13. Future Roadmap (fase 2–3)

- [ ] Digitale sjablonen & e-signing
- [ ] Agenda-integratie (Google/Outlook)
- [ ] Betaalfunctionaliteit & reconciliatie
- [ ] Insurance claim submission vanuit FD
- [ ] AI-documentherkenning (OCR)
- [ ] Native mobile apps (React Native)
- [ ] Marketplace voor partners (moskeeën, vervoer, cargo)

---

## 14. Technical Debt & Known Issues

### To be addressed in Phase 2
- Realtime sync optimalisatie
- Advanced search & filtering
- Bulk operations
- Email template system
- Advanced reporting & analytics

---

**Document Owner:** JanazApp Product Team  
**Last Review:** 2025  
**Next Review:** Q2 2025
