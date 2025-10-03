# Training Handleiding: Moskee Medewerker

**Doelgroep**: Moskee Beheerders & Medewerkers  
**Versie**: 1.0  
**Laatste Update**: 2025-10-03

---

## Inhoudsopgave

1. [Welkom](#welkom)
2. [Jouw Rol](#jouw-rol)
3. [Beschikbaarheid Instellen](#beschikbaarheid-instellen)
4. [Service Aanvragen Beheren](#service-aanvragen-beheren)
5. [Kalender Overzicht](#kalender-overzicht)
6. [Dag Blokkeren](#dag-blokkeren)
7. [Communicatie met Funeral Directors](#communicatie)
8. [Veelgestelde Vragen](#faq)

---

## Welkom

Welkom bij JanazApp! Als **Moskee Medewerker** help je funeral directors met het plannen van Janazah gebeden. Deze handleiding legt uit hoe je het systeem gebruikt.

### Wat kun je doen als Moskee Medewerker?

✅ **Beschikbaarheid instellen** per gebed per dag  
✅ **Service aanvragen** bevestigen of afwijzen  
✅ **Alternatieve tijden** voorstellen  
✅ **Dagen blokkeren** (feestdagen, renovatie)  
✅ **Kalender bekijken** met geplande diensten  
✅ **Team beheren** (indien org_admin)

---

## Jouw Rol

### Dashboard Overzicht

Je dashboard (`/moskee/dashboard`) toont:
- **Openstaande aanvragen** (PENDING status)
- **Geplande diensten** (deze week)
- **Beschikbaarheid overzicht**
- **Gebedstijden** (via Mawaqit API indien geconfigureerd)

### Snelle Acties

Vanuit het dashboard kun je snel:
- Aanvragen bevestigen/afwijzen
- Beschikbaarheid aanpassen
- Kalender bekijken

---

## Beschikbaarheid Instellen

### Waarom belangrijk?

Funeral directors kunnen alleen tijden aanvragen die je als beschikbaar hebt gemarkeerd. Houd dit dus up-to-date!

### Stap 1: Ga naar Beschikbaarheid

**Moskee** → **Beschikbaarheid**

### Stap 2: Selecteer Datum

Klik op een datum in de kalender (of gebruik "Bulk Edit" voor meerdere dagen).

### Stap 3: Vink Gebeden Aan

```
Fajr:     [✓] Beschikbaar
Dhuhr:    [✓] Beschikbaar
Asr:      [✓] Beschikbaar
Maghrib:  [✗] NIET Beschikbaar (bv. renovatie)
Isha:     [✓] Beschikbaar
Jumuah:   [✓] Beschikbaar (alleen vrijdag)
```

⚠️ **Let op**: Jumuah is alleen beschikbaar op vrijdagen.

### Stap 4: Opslaan

✅ Funeral directors kunnen nu alleen beschikbare tijden aanvragen.

---

## Service Aanvragen Beheren

### Stap 1: Bekijk Aanvraag

**Moskee** → **Aanvragen** → Klik op aanvraag

Je ziet:
```
Dossier: REP-000042
Overledene: [NAAM]
Funeral Director: [NAAM + ORG]
Gevraagde datum: 15 januari 2025
Gevraagd gebed: Dhuhr
Notitie: "Familie verwacht 50+ gasten"
```

### Stap 2: Kies Actie

#### Optie A: Bevestigen

Klik **"Bevestigen"** → Datum en tijd worden definitief.

✅ **Resultaat**:
- Funeral director krijgt notificatie
- Familie wordt geïnformeerd
- Kalender wordt geblokkeerd

---

#### Optie B: Alternatief Voorstellen

Klik **"Alternatief Voorstellen"**

```
Voorstel datum: [DD-MM-JJJJ]
Voorstel gebed: [Fajr/Dhuhr/Asr/etc.]
Reden: "Dhuhr is al bezet, maar Asr is beschikbaar"
```

✅ **Resultaat**:
- Funeral director ontvangt voorstel
- Funeral director kan accepteren of nieuwe aanvraag doen

---

#### Optie C: Afwijzen

Klik **"Afwijzen"**

```
Reden: [Verplicht veld]
Voorbeelden:
- "Moskee is die dag gesloten (feestdag)"
- "Renovatie gaande"
- "Capaciteit overschreden"
```

✅ **Resultaat**:
- Funeral director ontvangt notificatie met reden
- Funeral director kan andere moskee proberen

---

### Best Practices

✅ **Reageer snel**: Probeer binnen 2u te reageren (familie wacht)  
✅ **Wees duidelijk**: Geef specifieke redenen bij afwijzing  
✅ **Communiceer proactief**: Bij capaciteitsproblemen, stel direct alternatief voor

---

## Kalender Overzicht

### Maandkalender

**Moskee** → **Kalender**

Je ziet:
- **Groene dagen**: Volledig beschikbaar
- **Oranje dagen**: Gedeeltelijk beschikbaar (sommige gebeden bezet)
- **Rode dagen**: Volledig bezet of geblokkeerd
- **Grijze dagen**: Geen beschikbaarheid ingesteld

### Dagweergave

Klik op een datum → Zie per gebed:
- **Status**: FREE / BOOKED / BLOCKED
- **Dossier info** (indien BOOKED): Display ID, Funeral Director, Overledene

---

## Dag Blokkeren

### Wanneer Gebruiken?

- Feestdagen (Eid, nationale feestdagen)
- Renovatie / onderhoud
- Speciale evenementen

### Stap 1: Ga naar Dag Blokkeren

**Moskee** → **Beschikbaarheid** → **Dag Blokkeren**

### Stap 2: Vul In

```
Datum(s): [DD-MM-JJJJ] tot [DD-MM-JJJJ]
Reden: "Eid al-Fitr - moskee gesloten"
```

### Stap 3: Bevestig

✅ **Resultaat**:
- Dag(en) worden als BLOCKED gemarkeerd
- Funeral directors kunnen geen aanvragen doen voor deze dagen
- Bestaande aanvragen worden NIET geannuleerd (doe dit handmatig indien nodig)

---

## Communicatie

### Met Funeral Directors

**Via platform**:
- Notities bij aanvraag bevestiging/afwijzing
- Alternatieve voorstellen

**Buiten platform** (indien urgent):
- Telefoon (nummer staat in FD profiel)
- Email (via support@janazapp.nl als liaison)

### Met Jouw Team

**Intern**:
- Deel kalender toegang met collega's
- Wekelijkse planning bespreking (wie is verantwoordelijk?)

---

## Veelgestelde Vragen

### Kan ik een bevestigde aanvraag annuleren?

✅ **Ja**, maar alleen binnen 24u na bevestiging. Neem daarna contact op met Funeral Director.

**Hoe**: Klik op aanvraag → **Annuleren** → Geef reden

---

### Wat als ik per ongeluk heb bevestigd?

Contact **direct** de Funeral Director (telefoon/email) + annuleer via platform.

---

### Hoe vaak moet ik beschikbaarheid updaten?

**Minimaal**: 1x per week voor komende 2 weken  
**Aanbevolen**: Dagelijks voor komende 7 dagen

---

### Kan ik beschikbaarheid kopiëren naar volgende week?

✅ **Ja**, gebruik **"Kopieer Beschikbaarheid"** functie:

**Moskee** → **Beschikbaarheid** → **Bulk Edit** → **Kopieer van [WEEK] naar [WEEK]**

---

### Wat als Mawaqit gebedstijden niet kloppen?

**Optie 1**: Update in Mawaqit admin panel (synchroniseert automatisch)  
**Optie 2**: Neem contact op met support@janazapp.nl

---

### Hoeveel aanvragen kunnen we per dag aan?

Dit bepaal je zelf door beschikbaarheid in te stellen. JanazApp blokkeert automatisch dubbele boekingen.

**Tip**: Als je meerdere gebedszalen hebt, markeer dan meerdere gebeden als beschikbaar.

---

### Kan ik notificaties uitzetten?

⚠️ **Niet aanbevolen**, maar mogelijk via:

**Instellingen** → **Notificaties** → Schakel uit/aan per type

**Let op**: Je mist dan nieuwe aanvragen!

---

## Hulp Nodig?

### Support Contacten

📧 **Email**: support@janazapp.nl  
📞 **Telefoon**: +31 (0)20 123 4567 (Ma-Vr 09:00-17:00)  
💬 **WhatsApp**: +31 6 12 34 56 78

### Feedback

We horen graag wat beter kan! Stuur suggesties naar support@janazapp.nl.

---

## Checklist: Eerste Keer Instellen

- [ ] Inloggen met je moskee account
- [ ] Dashboard bekijken
- [ ] Beschikbaarheid instellen voor komende 2 weken
- [ ] Kalender bekijken (controle)
- [ ] Test aanvraag accepteren (indien beschikbaar)
- [ ] Dag blokkeren (feestdag)
- [ ] Team uitnodigen (indien org_admin)

---

**Versie**: 1.0  
**Laatst bijgewerkt**: 2025-10-03  
**Volgende review**: 2026-04-03
