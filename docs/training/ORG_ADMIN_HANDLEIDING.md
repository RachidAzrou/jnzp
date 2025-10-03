# Training Handleiding: Org Admin

**Doelgroep**: Organisatie Administrators (Funeral Directors, Moskeeën, Wasplaatsen, Verzekeraars)  
**Versie**: 1.0  
**Laatste Update**: 2025-10-03

---

## Inhoudsopgave

1. [Welkom](#welkom)
2. [Jouw Rol als Org Admin](#jouw-rol)
3. [Teamleden Beheren](#teamleden-beheren)
4. [Rollen Toewijzen](#rollen-toewijzen)
5. [Uitnodigingen Versturen](#uitnodigingen-versturen)
6. [Instellingen Configureren](#instellingen)
7. [Veelgestelde Vragen](#faq)

---

## Welkom

Gefeliciteerd! Je bent aangesteld als **Organisatie Administrator** van JanazApp. Als Org Admin ben je verantwoordelijk voor het beheer van je teamleden, rollen en organisatie-instellingen.

### Wat kun je doen als Org Admin?

✅ **Teamleden uitnodigen** en rollen toewijzen  
✅ **Gebruikers activeren/deactiveren**  
✅ **Organisatie-instellingen** aanpassen  
✅ **Facturatie** bekijken (indien van toepassing)  
✅ **Audit logs** raadplegen voor je organisatie  

⚠️ **Let op**: Je bent de **enige** Org Admin voor je organisatie. Zorg ervoor dat je altijd minstens één andere Org Admin toevoegt voordat je jezelf verwijdert!

---

## Jouw Rol

### Toegangsniveau

Als Org Admin heb je **volledige controle** over:
- Je eigen organisatie (gebruikers, rollen, instellingen)
- Alle dossiers die aan je organisatie zijn toegewezen
- Facturatie en invoices (indien wasplaats)

Je hebt **geen toegang** tot:
- Andere organisaties
- Platform-brede instellingen (dit is voorbehouden aan Platform Admins)

### Dashboard

Je dashboard (`/`) toont:
- **Overzicht** van je team
- **Actieve dossiers** gekoppeld aan je organisatie
- **Openstaande taken** voor je team
- **Recente activiteiten**

---

## Teamleden Beheren

### Ga naar Team Management

1. Klik op **"Team"** in het hoofdmenu (linkerkant)
2. Je ziet een overzicht van alle teamleden:
   - Naam
   - Email
   - Rol
   - Status (Actief/Inactief)

### Teamlid Toevoegen

#### Stap 1: Klik op "Lid Uitnodigen"
- Knop rechtsbovenaan: **"+ Lid Uitnodigen"**

#### Stap 2: Vul Uitnodiging In
```
Email:    voorbeeld@uitvaartzorg.nl
Rol:      funeral_director
Vervaldatum: 7 dagen (standaard)
```

#### Stap 3: Verstuur Uitnodiging
- De uitgenodigde persoon ontvangt een email met een **uitnodigingslink**
- Link is geldig voor **7 dagen** (of tot de ingestelde vervaldatum)
- Gebruiker moet account aanmaken met hetzelfde email adres

### Teamlid Deactiveren

⚠️ **Let op**: Je kunt jezelf niet deactiveren als je de enige Org Admin bent!

1. Klik op teamlid in de lijst
2. Klik op **"Deactiveren"**
3. Bevestig actie
4. **Resultaat**: Gebruiker kan niet meer inloggen, maar data blijft behouden

### Teamlid Reactiveren

1. Filter op **"Inactief"** in team overzicht
2. Klik op gedeactiveerd teamlid
3. Klik op **"Reactiveren"**

---

## Rollen Toewijzen

### Beschikbare Rollen

#### Voor Funeral Directors / Uitvaartzorgen

| Rol | Beschrijving | Rechten |
|-----|--------------|---------|
| **org_admin** | Organisatie beheerder | Volledige controle over team, dossiers, instellingen |
| **funeral_director** | Uitvaartleider | Dossiers aanmaken/beheren, documenten uploaden, chat met familie |
| **admin** | Algemeen beheerder | Dossiers bekijken, taken uitvoeren |

#### Voor Moskeeën

| Rol | Beschrijving | Rechten |
|-----|--------------|---------|
| **org_admin** | Moskee beheerder | Team beheer, beschikbaarheid instellen |
| **mosque** | Moskee medewerker | Service aanvragen bevestigen/afwijzen, beschikbaarheid |

#### Voor Wasplaatsen

| Rol | Beschrijving | Rechten |
|-----|--------------|---------|
| **org_admin** | Wasplaats beheerder | Team beheer, facturatie, koelcellen |
| **wasplaats** | Wasplaats medewerker | Reservaties, koelcel beheer, facturatie |

#### Voor Verzekeraars

| Rol | Beschrijving | Rechten |
|-----|--------------|---------|
| **org_admin** | Verzekeraar beheerder | Team beheer |
| **insurer** | Verzekeraar medewerker | Claims bekijken, facturen goedkeuren |

### Rol Wijzigen

1. Klik op teamlid in de lijst
2. Klik op **"Rol Wijzigen"**
3. Selecteer nieuwe rol uit dropdown
4. Klik **"Opslaan"**

⚠️ **Let op**: Je kunt je eigen rol niet wijzigen als je de enige Org Admin bent!

---

## Uitnodigingen Versturen

### Nieuwe Uitnodiging Aanmaken

#### Stap-voor-stap

1. **Ga naar Team Management** (`/team`)
2. **Klik "Lid Uitnodigen"**
3. **Vul formulier in**:
   ```
   Email:         jan@voorbeeld.nl
   Rol:           funeral_director
   Vervaldatum:   7 dagen (of custom datum)
   Max. gebruik:  1 (standaard) of "Onbeperkt"
   ```
4. **Klik "Uitnodiging Versturen"**

### Uitnodigingslink Delen

De uitgenodigde persoon ontvangt een email met:
- Uitnodigingslink: `https://app.janazapp.nl/register?invite=[CODE]`
- Instructies om account aan te maken
- Vervaldatum van de link

**Alternatief**: Je kunt de uitnodigingslink ook handmatig kopiëren en delen via WhatsApp/Telefoon.

### Uitnodiging Beheren

#### Actieve Uitnodigingen Bekijken
1. Ga naar **Team** → **Uitnodigingen** tab
2. Je ziet:
   - Uitnodigingscode
   - Email
   - Rol
   - Vervaldatum
   - Status (Actief/Gebruikt/Verlopen)
   - Aantal keer gebruikt

#### Uitnodiging Intrekken
- Klik op **"Intrekken"** bij de uitnodiging
- Link wordt ongeldig
- Gebruiker kan niet meer registreren met deze link

---

## Instellingen

### Organisatie Informatie

1. Ga naar **Instellingen** → **Organisatie**
2. Je kunt wijzigen:
   - Organisatienaam
   - Adres
   - Telefoonnummer
   - Email (algemeen contactadres)
   - WhatsApp nummer (voor notificaties)

### Contactpersonen

Voeg meerdere contactpersonen toe voor je organisatie:
- **Primair contact**: Hoofdaanspreekpunt
- **Financieel contact**: Voor facturatie vragen
- **Technisch contact**: Voor IT/systeem vragen

### Notificatie-instellingen

**Let op**: Deze instellingen gelden voor de hele organisatie!

- ✉️ **Email notificaties**: Aan/Uit
- 📱 **WhatsApp notificaties**: Aan/Uit (vereist WhatsApp nummer)
- 🔔 **Push notificaties**: Aan/Uit

---

## Veelgestelde Vragen (FAQ)

### Kan ik mezelf verwijderen als Org Admin?

❌ **Nee**, niet als je de **enige** Org Admin bent. Je moet eerst minstens één ander teamlid promoveren tot Org Admin voordat je jezelf kunt verwijderen.

**Waarom?**: Dit voorkomt dat een organisatie zonder beheerder komt te zitten.

---

### Hoeveel Org Admins mag ik hebben?

✅ **Onbeperkt**. Het is zelfs aanbevolen om minstens **2 Org Admins** te hebben voor backup doeleinden.

---

### Wat gebeurt er als ik een teamlid deactiveer?

De gebruiker:
- ❌ Kan niet meer inloggen
- ❌ Kan geen dossiers meer bekijken
- ✅ Data blijft behouden (voor audit doeleinden)
- ✅ Kan later gereactiveerd worden

---

### Kan ik iemand anders' rol wijzigen?

✅ **Ja**, als Org Admin kun je alle rollen binnen je organisatie wijzigen.

⚠️ **Uitzondering**: Je kunt de laatste Org Admin niet degraderen (om te voorkomen dat er geen beheerder overblijft).

---

### Hoe lang is een uitnodigingslink geldig?

**Standaard**: 7 dagen  
**Aanpasbaar**: Je kunt een custom vervaldatum instellen bij het versturen

---

### Wat als een uitnodiging verloopt?

De link wordt ongeldig. Je moet een **nieuwe uitnodiging** versturen.

---

### Kan ik dezelfde uitnodigingslink meerdere keren gebruiken?

**Standaard**: Nee (max gebruik = 1)  
**Optioneel**: Je kunt "Onbeperkt gebruik" instellen bij het aanmaken van de uitnodiging. Dit is handig voor onboarding van grote teams.

---

### Waar kan ik audit logs bekijken?

1. Ga naar **Team** → **Audit Log** tab
2. Je ziet:
   - Welke gebruiker
   - Welke actie (rol gewijzigd, uitnodiging verstuurd, etc.)
   - Wanneer
   - Reden (indien opgegeven)

---

### Kan ik facturatie bekijken?

✅ **Ja**, als je organisatie een **Wasplaats** of **Funeral Director** is.

Ga naar:
- **Wasplaats**: `/wasplaats/facturatie`
- **Funeral Director**: `/facturatie`

---

## Hulp Nodig?

### Support Contacten

📧 **Email**: support@janazapp.nl  
📞 **Telefoon**: +31 (0)20 123 4567  
💬 **WhatsApp**: +31 6 12 34 56 78

**Openingstijden**: Ma-Vr 09:00 - 17:00

### Escalatie

Bij urgente issues (P1/P2):
- **On-call support**: +31 6 98 76 54 32 (24/7)
- **Response tijd**: <1 uur

---

## Bijlagen

### Checklist: Nieuwe Org Admin Onboarding

- [ ] Inloggen met je admin account
- [ ] Team Management pagina bekijken
- [ ] Minstens één extra Org Admin toevoegen (backup)
- [ ] Organisatie-instellingen controleren
- [ ] Contactpersonen toevoegen
- [ ] Notificatie-instellingen configureren
- [ ] Eerste teamlid uitnodigen
- [ ] Audit log bekijken

### Sneltoetsen

| Actie | Sneltoets |
|-------|-----------|
| Team Management | `/team` |
| Instellingen | `/instellingen` |
| Dashboard | `/` |
| Uitloggen | Klik op je naam (rechtsbovenaan) |

---

**Versie**: 1.0  
**Laatst bijgewerkt**: 2025-10-03  
**Volgende review**: 2026-04-03
