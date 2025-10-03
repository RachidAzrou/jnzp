# Training Handleiding: Funeral Director (Uitvaartleider)

**Doelgroep**: Funeral Directors / Uitvaartleiders  
**Versie**: 1.0  
**Laatste Update**: 2025-10-03

---

## Inhoudsopgave

1. [Welkom](#welkom)
2. [Jouw Rol](#jouw-rol)
3. [Dossier Aanmaken](#dossier-aanmaken)
4. [Dossier Workflow](#dossier-workflow)
5. [Communicatie met Familie](#communicatie-met-familie)
6. [Moskee Service Aanvragen](#moskee-service-aanvragen)
7. [Wasplaats Reserveren](#wasplaats-reserveren)
8. [Documenten Beheren](#documenten-beheren)
9. [Facturatie](#facturatie)
10. [Veelgestelde Vragen](#faq)

---

## Welkom

Welkom bij JanazApp! Als **Funeral Director** ben je de centrale spil in het uitvaartproces. Deze handleiding helpt je om effectief met het platform te werken.

### Wat kun je doen als Funeral Director?

✅ **Dossiers aanmaken** en beheren  
✅ **Familie contacteren** via chat (Portal + WhatsApp)  
✅ **Moskee services** aanvragen en plannen  
✅ **Wasplaats reserveringen** maken  
✅ **Documenten uploaden** en reviewen  
✅ **Facturen bekijken** en verzenden naar verzekeraar  
✅ **Taken beheren** voor je team

---

## Jouw Rol

### Dashboard Overzicht

Je dashboard (`/`) toont:
- **Actieve dossiers** (status overview)
- **Openstaande taken** (jouw + je team)
- **Recente activiteiten**
- **Planning** (moskee services, wasplaats reservaties)

### Snelle Acties

Vanuit het dashboard kun je snel:
- Nieuw dossier aanmaken
- Chat met familie
- Taken afvinken
- Planning bekijken

---

## Dossier Aanmaken

### Stap 1: Klik op "Nieuw Dossier"

Navigeer naar **Dossiers** → **+ Nieuw Dossier**

### Stap 2: Basisinformatie Invullen

```
Overledene:
- Volledige naam: [NAAM]
- Geboortedatum: [DD-MM-JJJJ]
- Datum overlijden: [DD-MM-JJJJ]

Contactpersoon (Familie):
- Naam: [NAAM]
- Relatie: [Partner/Kind/etc.]
- Telefoon: [+31 6 XX XX XX XX]
- Email: [EMAIL]
- WhatsApp: [JA/NEE]

Verzekeraar:
- Selecteer uit lijst (automatisch gekoppeld)
- Polisnummer: [NUMMER]

Flow Type:
- Lokaal (LOC): Uitvaart in Nederland
- Repatriëring (REP): Overbrengen naar herkomstland
```

### Stap 3: Bevestig

✅ Dossier krijgt automatisch een **Display ID** (bv. `LOC-000042` of `REP-000015`)

⚠️ **Let op**: Display ID wordt pas definitief na bepalen van flow type. Tijdelijke ID's beginnen met `TMP-`.

---

## Dossier Workflow

### Status Flow

```
CREATED → INTAKE_PENDING → INTAKE_COMPLETE → PLANNED → 
IN_PROGRESS → COMPLETED → ARCHIVED
```

### Status Uitleg

| Status | Betekenis | Jouw Actie |
|--------|-----------|------------|
| **CREATED** | Net aangemaakt | Familie uitnodigen, flow bepalen (LOC/REP) |
| **INTAKE_PENDING** | Wachten op familie docs | Familie reminder sturen via chat |
| **INTAKE_COMPLETE** | Docs ontvangen & goedgekeurd | Planning maken (moskee + wasplaats) |
| **PLANNED** | Moskee + wasplaats bevestigd | Checklist uitvoeren |
| **IN_PROGRESS** | Uitvaart gaande | Taken afvinken, updates delen |
| **COMPLETED** | Uitvaart afgerond | Facturatie afronden |
| **ARCHIVED** | Administratief afgesloten | Geen acties meer nodig |

### Taken per Status

**CREATED**:
- [ ] Familie uitnodigen via email/WhatsApp
- [ ] Flow bepalen (LOC of REP)
- [ ] Checklist aanmaken

**INTAKE_PENDING**:
- [ ] Familie vragen om ID upload
- [ ] Akten overlijden upload (indien beschikbaar)

**INTAKE_COMPLETE**:
- [ ] Moskee service aanvragen
- [ ] Wasplaats reserveren (LOC) of repatriëring regelen (REP)

**PLANNED**:
- [ ] Familie informeren over planning
- [ ] Laatste checks uitvoeren

**IN_PROGRESS**:
- [ ] Taken afvinken tijdens uitvoering
- [ ] Updates delen met familie

**COMPLETED**:
- [ ] Factuur genereren
- [ ] Claim indienen bij verzekeraar
- [ ] Familie bedanken

---

## Communicatie met Familie

### Chat Venster Openen

Ga naar **Dossiers** → Klik op dossier → **Chat** tab

### Kanalen

**Portal Chat**:
- Familie logt in op JanazApp
- Zien berichten in hun dashboard
- ✅ Altijd beschikbaar

**WhatsApp** (indien geconfigureerd):
- Familie ontvangt berichten via WhatsApp
- Kan direct reageren via WhatsApp
- ⚠️ Afhankelijk van WhatsApp API uptime

### Best Practices

✅ **Wees duidelijk**: Korte, concrete berichten  
✅ **Respectvol**: Familie is in rouw  
✅ **Privacy**: Geen gevoelige data (NIS, polis) via chat  
✅ **Response tijd**: Probeer binnen 2u te reageren  

⚠️ **Vermijd**:
- Medische details
- Financiële details (gebruik documenten)
- Betalingsinformatie

### Voorbeeld Berichten

**Welkom bericht**:
```
Beste [NAAM],

Allereerst mijn oprechte deelneming met het verlies van [OVERLEDENE].

Ik ben [JOUW NAAM], uw uitvaartleider. Via dit kanaal kunnen we communiceren over het dossier. 

Ik heb een checklist voor u klaargezet. Kunt u beginnen met het uploaden van een ID-bewijs? Dat vindt u onder "Documenten".

Groet,
[JOUW NAAM]
```

**Reminder voor documenten**:
```
Beste [NAAM],

We wachten nog op uw ID-bewijs om verder te kunnen met de planning. Kunt u dit vandaag nog uploaden?

Indien u hulp nodig hebt, laat het me weten.

Groet,
[JOUW NAAM]
```

---

## Moskee Service Aanvragen

### Stap 1: Ga naar Planning

**Dossiers** → [DOSSIER] → **Planning** tab → **Moskee Service Aanvragen**

### Stap 2: Vul Aanvraag In

```
Moskee: [Selecteer uit lijst]
Voorkeur datum: [DD-MM-JJJJ]
Voorkeur gebed: [Fajr/Dhuhr/Asr/Maghrib/Isha/Jumuah]
Notitie: [Extra info voor moskee, bv. groot aantal gasten]
```

### Stap 3: Wacht op Bevestiging

**Status**:
- **PENDING**: Moskee heeft aanvraag ontvangen
- **CONFIRMED**: Moskee heeft bevestigd (datum + tijd)
- **DECLINED**: Moskee kan niet (zie decline reason)
- **PROPOSED_ALTERNATIVE**: Moskee stelt alternatieve datum/tijd voor

### Stap 4: Alternatief Accepteren (indien nodig)

Als moskee een alternatief voorstelt:
1. Overleg met familie
2. Accepteer alternatief OF
3. Vraag nieuwe datum aan (andere moskee indien nodig)

---

## Wasplaats Reserveren

### Stap 1: Ga naar Planning

**Dossiers** → [DOSSIER] → **Planning** tab → **Wasplaats Reserveren**

### Stap 2: Selecteer Datum + Tijd

```
Wasplaats: [Selecteer uit lijst]
Start datum/tijd: [DD-MM-JJJJ HH:MM]
Eind datum/tijd: [DD-MM-JJJJ HH:MM]
Koelcel nodig: [JA/NEE]
Notitie: [Extra info]
```

⚠️ **Let op**: Check eerst beschikbaarheid in kalender!

### Stap 3: Bevestiging

Wasplaats bevestigt reservering (meestal binnen 1u tijdens kantooruren).

---

## Documenten Beheren

### Documenten Uploaden

**Voor Familie**:
- ID-bewijs
- Akte overlijden (indien beschikbaar)
- Polis (indien beschikbaar)

**Voor Uitvaart**:
- Transportvergunning
- Facturen (wasplaats, moskee)
- Foto's (indien gevraagd door familie)

### Stap 1: Upload Document

**Dossiers** → [DOSSIER] → **Documenten** tab → **Upload**

```
Selecteer bestand: [KIES BESTAND]
Document type: [ID/AKTE/POLIS/TRANSPORT/FACTUUR/OVERIG]
```

### Stap 2: Review Status

| Status | Betekenis | Actie |
|--------|-----------|-------|
| **IN_REVIEW** | Wachten op goedkeuring | Admin/Verzekeraar reviewt |
| **APPROVED** | Goedgekeurd | Geen actie |
| **REJECTED** | Afgekeurd | Re-upload nodig (zie rejection reason) |

### Stap 3: Re-upload (indien REJECTED)

Klik op document → **Re-upload** → Upload nieuwe versie

---

## Facturatie

### Factuur Genereren

**Stap 1**: Ga naar **Facturatie** → **Nieuw Factuur**

**Stap 2**: Selecteer dossier

**Stap 3**: Voeg items toe (gebruik catalogus)

```
Item: [WASSING]
Aantal: 1
Prijs: €250.00
BTW: 21%

Item: [KOELCEL HUUR]
Aantal: 2 dagen
Prijs: €50.00 per dag
BTW: 21%
```

**Stap 4**: Review totalen

```
Subtotaal: €350.00
BTW (21%): €73.50
Totaal: €423.50
```

**Stap 5**: Verzend naar verzekeraar

Factuur krijgt automatisch een nummer (bv. `W-2025-042`).

### Factuurbeheer

**Status**:
- **DRAFT**: Nog niet verzonden
- **SENT**: Verzonden naar verzekeraar
- **APPROVED**: Verzekeraar heeft goedgekeurd
- **NEEDS_INFO**: Verzekeraar vraagt extra info
- **PAID**: Betaling ontvangen

**Acties**:
- **DRAFT**: Bewerk, verwijder, of verzend
- **SENT**: Wacht op verzekeraar response
- **NEEDS_INFO**: Voeg extra documenten/info toe
- **APPROVED**: Wacht op betaling
- **PAID**: Geen actie nodig

---

## Veelgestelde Vragen

### Kan ik een dossier verwijderen?

❌ **Nee**, dossiers kunnen niet worden verwijderd (audit trail). Je kunt wel de status op **ARCHIVED** zetten.

---

### Hoe nodig ik familie uit?

**Optie 1**: Automatisch via email (bij dossier aanmaken)  
**Optie 2**: Handmatig via WhatsApp (deel link)  
**Optie 3**: Familie kan zelf registreren met uitnodigingscode

---

### Wat als moskee niet reageert?

**Na 4u**: Stuur reminder via chat  
**Na 1 dag**: Bel moskee direct  
**Na 2 dagen**: Probeer andere moskee

---

### Kan ik documenten namens familie uploaden?

✅ **Ja**, je hebt upload rechten voor alle document types.

---

### Hoe lang duurt verzekeraar goedkeuring?

**Normaal**: 2-5 werkdagen  
**Spoed**: Bel verzekeraar voor snellere afhandeling

---

### Wat als wasplaats vol is?

Check andere wasplaatsen in de regio. Je kunt meerdere reserveringsaanvragen doen.

---

## Hulp Nodig?

### Support Contacten

📧 **Email**: support@janazapp.nl  
📞 **Telefoon**: +31 (0)20 123 4567 (Ma-Vr 09:00-17:00)  
💬 **WhatsApp**: +31 6 12 34 56 78

### Urgente Issues (24/7)

🚨 **On-call support**: +31 6 98 76 54 32

**Response tijd**: <1 uur voor P1/P2 issues

---

## Checklist: Eerste Dossier

- [ ] Inloggen met je FD account
- [ ] Dashboard bekijken
- [ ] Nieuw dossier aanmaken (test dossier)
- [ ] Familie uitnodigen (gebruik je eigen email voor test)
- [ ] Chat bericht sturen
- [ ] Moskee service aanvragen
- [ ] Wasplaats reserveren
- [ ] Document uploaden
- [ ] Factuur genereren (draft)

---

**Versie**: 1.0  
**Laatst bijgewerkt**: 2025-10-03  
**Volgende review**: 2026-04-03
