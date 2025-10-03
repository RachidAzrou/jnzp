# Training Handleiding: Wasplaats Medewerker

**Doelgroep**: Wasplaats Beheerders & Medewerkers  
**Versie**: 1.0  
**Laatste Update**: 2025-10-03

---

## Inhoudsopgave

1. [Welkom](#welkom)
2. [Jouw Rol](#jouw-rol)
3. [Reservaties Beheren](#reservaties-beheren)
4. [Koelcellen Beheren](#koelcellen-beheren)
5. [Kalender Overzicht](#kalender-overzicht)
6. [Facturatie](#facturatie)
7. [Dag Blokkeren](#dag-blokkeren)
8. [Veelgestelde Vragen](#faq)

---

## Welkom

Welkom bij JanazApp! Als **Wasplaats Medewerker** beheer je reservaties, koelcellen en facturatie voor je wasplaats. Deze handleiding legt uit hoe je het systeem gebruikt.

### Wat kun je doen als Wasplaats Medewerker?

✅ **Reservaties beheren** (bevestigen, wijzigen, annuleren)  
✅ **Koelcellen toewijzen** aan reservaties  
✅ **Koelcel status bijhouden** (FREE/OCCUPIED/OUT_OF_SERVICE)  
✅ **Facturen genereren** en verzenden  
✅ **Kalender bekijken** met planning  
✅ **Dagen blokkeren** (feestdagen, onderhoud)  
✅ **Team beheren** (indien org_admin)

---

## Jouw Rol

### Dashboard Overzicht

Je dashboard (`/wasplaats/dashboard`) toont:
- **Openstaande reservaties** (PENDING status)
- **Vandaag gepland** (CONFIRMED reservaties)
- **Koelcel overzicht** (bezetting)
- **Openstaande facturen** (te verzenden)

### Snelle Acties

Vanuit het dashboard kun je snel:
- Reservaties bevestigen
- Koelcel toewijzen
- Factuur genereren

---

## Reservaties Beheren

### Stap 1: Bekijk Reservatie

**Wasplaats** → **Reservaties** → Klik op reservatie

Je ziet:
```
Dossier: LOC-000042
Funeral Director: [NAAM + ORG]
Start: 15 januari 2025 10:00
Eind: 15 januari 2025 12:00
Koelcel gevraagd: JA
Notitie: "Familie wil aanwezig zijn bij wassing"
```

### Stap 2: Kies Actie

#### Optie A: Bevestigen (+ Koelcel Toewijzen)

1. Klik **"Bevestigen"**
2. **Selecteer koelcel** (indien gevraagd):
   ```
   Koelcel: [Kies uit beschikbare cellen]
   - Cel 1: FREE
   - Cel 2: OCCUPIED (tot 14/01 16:00)
   - Cel 3: OUT_OF_SERVICE (onderhoud)
   ```
3. Klik **"Opslaan"**

✅ **Resultaat**:
- Funeral director krijgt bevestiging
- Koelcel wordt gereserveerd (indien toegewezen)
- Kalender wordt geblokkeerd

---

#### Optie B: Wijzigen (Tijd Aanpassen)

1. Klik **"Wijzigen"**
2. Pas start/eind tijd aan
3. Voeg reden toe: "Vorige reservering loopt uit"
4. Klik **"Opslaan"**

✅ **Resultaat**:
- Funeral director ontvangt notificatie met nieuwe tijden
- Kalender wordt aangepast

---

#### Optie C: Annuleren

1. Klik **"Annuleren"**
2. **Reden verplicht**:
   ```
   Voorbeelden:
   - "Wasplaats die dag gesloten (storing)"
   - "Capaciteit overschreden"
   - "Op verzoek van funeral director"
   ```
3. Klik **"Bevestig Annulering"**

✅ **Resultaat**:
- Funeral director ontvangt notificatie
- Koelcel wordt vrijgegeven (indien toegewezen)
- Funeral director kan nieuwe reservering maken

---

### Best Practices

✅ **Reageer snel**: Probeer binnen 1u te reageren (funeral directors wachten)  
✅ **Communiceer proactief**: Bij vertragingen, informeer funeral director  
✅ **Check dubbel**: Verifieer dat koelcel beschikbaar is voor hele periode

---

## Koelcellen Beheren

### Koelcel Status

| Status | Betekenis | Actie |
|--------|-----------|-------|
| **FREE** | Beschikbaar voor reservering | Kan worden toegewezen |
| **OCCUPIED** | Bezet door dossier | Vrijgeven na ophalen overledene |
| **RESERVED** | Gereserveerd voor toekomstige reservering | Automatisch OCCUPIED bij start |
| **OUT_OF_SERVICE** | Niet beschikbaar (storing/onderhoud) | Markeer als FREE na reparatie |

### Stap 1: Koelcel Toevoegen (Eenmalig)

**Wasplaats** → **Koelcellen** → **+ Nieuwe Koelcel**

```
Label: [Cel 1 / A1 / etc.]
Status: FREE (default)
```

### Stap 2: Status Wijzigen

**Wasplaats** → **Koelcellen** → Klik op cel → **Wijzig Status**

**Voorbeelden**:

**Cel bezet na wassing**:
```
Status: OCCUPIED
Dossier: [Selecteer dossier]
```

**Cel vrijgeven**:
```
Status: FREE
(Dossier wordt automatisch verwijderd)
```

**Cel buiten dienst**:
```
Status: OUT_OF_SERVICE
Notitie: "Koeling defect, reparatie gepland 20/01"
```

### Stap 3: Koelcel Overzicht

**Wasplaats** → **Koelcellen**

Je ziet real-time overzicht:
```
Cel 1: OCCUPIED (LOC-000042, tot 15/01 12:00)
Cel 2: FREE
Cel 3: RESERVED (REP-000015, vanaf 16/01 09:00)
Cel 4: OUT_OF_SERVICE (Onderhoud)
```

---

## Kalender Overzicht

### Weekkalender

**Wasplaats** → **Kalender** → **Week Weergave**

Je ziet per dag:
- **Groene slots**: Beschikbaar
- **Oranje slots**: Gedeeltelijk bezet (sommige cellen vrij)
- **Rode slots**: Volledig bezet
- **Grijze slots**: Geblokkeerd (feestdag/onderhoud)

### Dagweergave

Klik op een dag → Zie per uur:
- Welke cellen bezet zijn
- Welke dossiers (Display ID + FD org)
- Start/eind tijden

---

## Facturatie

### Stap 1: Factuur Genereren

**Wasplaats** → **Facturatie** → **+ Nieuwe Factuur**

### Stap 2: Selecteer Dossier

Kies uit afgeronde reservaties (status COMPLETED).

### Stap 3: Voeg Items Toe

Gebruik catalogus voor standaard items:

```
Item: WASSING
Aantal: 1
Prijs: €250.00
BTW: 21%

Item: KOELCEL_HUUR
Aantal: 2 dagen
Prijs: €50.00 per dag
BTW: 21%

Item: LIJKWADE
Aantal: 1
Prijs: €75.00
BTW: 21%
```

**Tip**: Je kunt ook custom items toevoegen (niet in catalogus).

### Stap 4: Review Totalen

```
Subtotaal: €425.00
BTW (21%): €89.25
Totaal: €514.25
```

### Stap 5: Verzend naar Funeral Director

Klik **"Verzenden"** → Factuur krijgt automatisch nummer (bv. `W-2025-042`).

✅ **Resultaat**:
- Funeral director ontvangt factuur
- Funeral director kan claim indienen bij verzekeraar
- Jij ontvangt notificatie bij betaling

---

### Factuur Status

| Status | Betekenis | Jouw Actie |
|--------|-----------|------------|
| **DRAFT** | Nog niet verzonden | Bewerk of verzend |
| **SENT** | Verzonden naar FD | Wacht op betaling |
| **APPROVED** | FD heeft goedgekeurd (via verzekeraar) | Wacht op betaling |
| **NEEDS_INFO** | FD vraagt extra info | Voeg documenten/notitie toe |
| **PAID** | Betaling ontvangen | Geen actie nodig |

---

## Dag Blokkeren

### Wanneer Gebruiken?

- Feestdagen
- Onderhoud / renovatie
- Capaciteitsproblemen (bv. personeelstekort)

### Stap 1: Ga naar Dag Blokkeren

**Wasplaats** → **Planning** → **Dag Blokkeren**

### Stap 2: Vul In

```
Datum(s): [DD-MM-JJJJ] tot [DD-MM-JJJJ]
Reden: "Onderhoud koelsysteem"
```

### Stap 3: Bevestig

✅ **Resultaat**:
- Dag(en) worden als BLOCKED gemarkeerd
- Funeral directors kunnen geen reserveringen maken
- Bestaande reserveringen worden NIET geannuleerd (doe dit handmatig)

---

## Veelgestelde Vragen

### Kan ik een bevestigde reservering nog wijzigen?

✅ **Ja**, maar communiceer dit direct met funeral director (telefoon + platform).

---

### Wat als alle koelcellen bezet zijn?

**Optie 1**: Vraag funeral director om latere tijdstip  
**Optie 2**: Verwijs naar andere wasplaats in de regio  
**Optie 3**: Verleng beschikbaarheid (indien mogelijk)

---

### Hoe lang vooruit kunnen funeral directors reserveren?

**Standaard**: Tot 30 dagen vooruit  
**Aanpasbaar**: Via instellingen (org_admin)

---

### Wat als een funeral director te laat is?

**Tolerantie**: 15 minuten (communiceer flexibiliteit)  
**>15 min**: Neem contact op, overweeg herschikking

---

### Kan ik facturen bewerken na verzenden?

❌ **Nee**, niet na status SENT. Je kunt wel:
- **Credit nota** aanmaken (voor correcties)
- **Notitie toevoegen** (voor verduidelijking)

---

### Hoe vaak moet ik koelcel status updaten?

**Real-time**: Bij ophalen overledene → Markeer als FREE  
**Dagelijks**: Check of OCCUPIED cellen nog actueel zijn

---

### Wat als een koelcel defect raakt?

1. Markeer als **OUT_OF_SERVICE** (met notitie)
2. Informeer bestaande reserveringen (wijs andere cel toe)
3. Blokkeer toekomstige reserveringen voor die cel
4. Update naar **FREE** na reparatie

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

## Checklist: Eerste Keer Instellen

- [ ] Inloggen met je wasplaats account
- [ ] Dashboard bekijken
- [ ] Koelcellen aanmaken (aantal beschikbare cellen)
- [ ] Test reservering accepteren
- [ ] Koelcel toewijzen aan reservering
- [ ] Koelcel status wijzigen (OCCUPIED → FREE)
- [ ] Factuur genereren (draft)
- [ ] Dag blokkeren (feestdag)
- [ ] Team uitnodigen (indien org_admin)

---

**Versie**: 1.0  
**Laatst bijgewerkt**: 2025-10-03  
**Volgende review**: 2026-04-03
