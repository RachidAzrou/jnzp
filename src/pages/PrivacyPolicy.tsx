import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Beleid</CardTitle>
            <p className="text-muted-foreground">
              Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <h2>1. Inleiding</h2>
            <p>
              Janaz App respecteert uw privacy en hecht groot belang aan de bescherming van uw
              persoonsgegevens. In dit privacy beleid leggen we uit welke gegevens we verzamelen,
              waarom we deze verzamelen en hoe we deze gebruiken.
            </p>

            <h2>2. Verwerkingsverantwoordelijke</h2>
            <p>
              Janaz App is de verwerkingsverantwoordelijke voor de verwerking van uw persoonsgegevens.
              Voor vragen over dit privacy beleid kunt u contact opnemen via support@janazapp.nl.
            </p>

            <h2>3. Welke gegevens verzamelen we?</h2>
            <p>We verzamelen de volgende categorieën persoonsgegevens:</p>
            <ul>
              <li>
                <strong>Accountgegevens:</strong> Naam, e-mailadres, telefoonnummer
              </li>
              <li>
                <strong>Dossiergegevens:</strong> Informatie over overledenen en begrafenissen
              </li>
              <li>
                <strong>Documenten:</strong> Geüploade documenten zoals vergunningen en certificaten
              </li>
              <li>
                <strong>Technische gegevens:</strong> IP-adres, browsertype, apparaatinformatie
              </li>
              <li>
                <strong>Gebruiksgegevens:</strong> Hoe u de applicatie gebruikt (via audit logs)
              </li>
            </ul>

            <h2>4. Waarom verzamelen we deze gegevens?</h2>
            <p>We verwerken uw persoonsgegevens voor de volgende doeleinden:</p>
            <ul>
              <li>Het leveren van onze diensten en functionaliteiten</li>
              <li>Accountbeheer en authenticatie</li>
              <li>Communicatie met gebruikers</li>
              <li>Beveiliging en fraudepreventie</li>
              <li>Voldoen aan wettelijke verplichtingen</li>
              <li>Verbetering van onze diensten</li>
            </ul>

            <h2>5. Rechtsgrondslag</h2>
            <p>We verwerken uw persoonsgegevens op basis van:</p>
            <ul>
              <li>
                <strong>Uitvoering van de overeenkomst:</strong> Voor het leveren van onze diensten
              </li>
              <li>
                <strong>Wettelijke verplichting:</strong> Voor archivering en audit doeleinden
              </li>
              <li>
                <strong>Gerechtvaardigd belang:</strong> Voor beveiliging en fraudepreventie
              </li>
              <li>
                <strong>Toestemming:</strong> Waar wettelijk vereist
              </li>
            </ul>

            <h2>6. Bewaartermijnen</h2>
            <p>We bewaren uw gegevens niet langer dan noodzakelijk:</p>
            <ul>
              <li>Voltooide dossiers: 7 jaar (wettelijke verplichting)</li>
              <li>Audit logs: 7 jaar</li>
              <li>Accountgegevens: Tot verwijdering van account</li>
              <li>Sessiegegevens: 90 dagen inactief</li>
              <li>Login pogingen: 1 jaar</li>
            </ul>

            <h2>7. Beveiliging</h2>
            <p>
              We nemen passende technische en organisatorische maatregelen om uw persoonsgegevens
              te beschermen tegen verlies, misbruik, onbevoegde toegang en onrechtmatige verwerking:
            </p>
            <ul>
              <li>TLS 1.2+ encryptie voor alle verbindingen</li>
              <li>AES-256 database encryptie at rest</li>
              <li>Verplichte 2FA voor professionele gebruikers</li>
              <li>PII-redactie in logs</li>
              <li>Regelmatige security audits</li>
            </ul>

            <h2>8. Delen met derden</h2>
            <p>
              We delen uw gegevens alleen met derden wanneer dit noodzakelijk is voor onze
              dienstverlening of wettelijk verplicht:
            </p>
            <ul>
              <li>Cloud hosting providers (met verwerkersovereenkomst)</li>
              <li>Verzekeraars (alleen relevante dossiergegevens)</li>
              <li>Overheidsinstanties (bij wettelijke verplichting)</li>
            </ul>

            <h2>9. Uw rechten</h2>
            <p>U heeft de volgende rechten met betrekking tot uw persoonsgegevens:</p>
            <ul>
              <li>
                <strong>Recht op inzage:</strong> U kunt opvragen welke gegevens we van u bewaren
              </li>
              <li>
                <strong>Recht op rectificatie:</strong> U kunt onjuiste gegevens laten corrigeren
              </li>
              <li>
                <strong>Recht op vergetelheid:</strong> U kunt verwijdering van uw gegevens vragen
              </li>
              <li>
                <strong>Recht op dataportabiliteit:</strong> U kunt uw gegevens in een
                gestructureerd formaat opvragen
              </li>
              <li>
                <strong>Recht op bezwaar:</strong> U kunt bezwaar maken tegen bepaalde verwerkingen
              </li>
            </ul>
            <p>
              U kunt deze rechten uitoefenen via de instellingenpagina of door contact met ons
              op te nemen.
            </p>

            <h2>10. Klachten</h2>
            <p>
              Als u een klacht heeft over hoe we met uw gegevens omgaan, kunt u contact met ons
              opnemen. U heeft ook het recht om een klacht in te dienen bij de Autoriteit
              Persoonsgegevens.
            </p>

            <h2>11. Wijzigingen</h2>
            <p>
              We kunnen dit privacy beleid van tijd tot tijd aanpassen. De meest actuele versie
              vindt u altijd op deze pagina.
            </p>

            <h2>12. Contact</h2>
            <p>
              Voor vragen over dit privacy beleid of over de verwerking van uw persoonsgegevens
              kunt u contact met ons opnemen via:
            </p>
            <p>
              E-mail: support@janazapp.nl
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
