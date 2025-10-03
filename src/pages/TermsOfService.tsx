import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
            <CardTitle className="text-3xl">Algemene Voorwaarden</CardTitle>
            <p className="text-muted-foreground">
              Laatst bijgewerkt: {new Date().toLocaleDateString('nl-NL')}
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <h2>1. Algemeen</h2>
            <p>
              Deze algemene voorwaarden zijn van toepassing op het gebruik van Janaz App, een
              platform voor het beheren van uitvaarten en repatriaties. Door gebruik te maken van
              onze diensten gaat u akkoord met deze voorwaarden.
            </p>

            <h2>2. Definities</h2>
            <ul>
              <li>
                <strong>Platform:</strong> De Janaz App web applicatie en alle bijbehorende diensten
              </li>
              <li>
                <strong>Gebruiker:</strong> Iedere natuurlijke of rechtspersoon die gebruik maakt
                van het Platform
              </li>
              <li>
                <strong>Account:</strong> De persoonlijke toegang tot het Platform
              </li>
              <li>
                <strong>Organisatie:</strong> Een uitvaartonderneming, wasplaats, moskee of
                verzekeraar die gebruik maakt van het Platform
              </li>
            </ul>

            <h2>3. Gebruik van de dienst</h2>
            <h3>3.1 Account</h3>
            <p>
              Voor gebruik van het Platform is een account vereist. U bent verantwoordelijk voor
              het vertrouwelijk houden van uw inloggegevens en voor alle activiteiten die onder
              uw account plaatsvinden.
            </p>

            <h3>3.2 Toegestaan gebruik</h3>
            <p>U mag het Platform alleen gebruiken voor:</p>
            <ul>
              <li>Het beheren van dossiers en uitvaarten</li>
              <li>Communicatie met betrokken partijen</li>
              <li>Het uploaden en beheren van documenten</li>
              <li>Het genereren van facturen en rapporten</li>
            </ul>

            <h3>3.3 Verboden gebruik</h3>
            <p>Het is niet toegestaan om:</p>
            <ul>
              <li>Het Platform te gebruiken voor illegale doeleinden</li>
              <li>
                Inbreuk te maken op de rechten van anderen of op intellectuele eigendomsrechten
              </li>
              <li>
                Het Platform te gebruiken op een manier die schade kan toebrengen aan het Platform
                of derden
              </li>
              <li>
                Beveiligingsmaatregelen te omzeilen of te proberen toegang te krijgen tot systemen
                waar u geen toegang toe heeft
              </li>
              <li>Spam, malware of andere schadelijke content te verspreiden</li>
            </ul>

            <h2>4. Twee-factor authenticatie (2FA)</h2>
            <p>
              Voor professionele gebruikers (uitvaartondernemingen, wasplaatsen, moskeeën,
              verzekeraars) is 2FA verplicht. Familie-accounts kunnen 2FA optioneel instellen.
            </p>

            <h2>5. Gegevensverwerking</h2>
            <p>
              Voor informatie over hoe we met uw persoonsgegevens omgaan, verwijzen we naar ons
              Privacy Beleid. Door gebruik te maken van het Platform gaat u akkoord met de
              verwerking van uw gegevens zoals beschreven in het Privacy Beleid.
            </p>

            <h2>6. Intellectueel eigendom</h2>
            <p>
              Alle rechten op het Platform, inclusief maar niet beperkt tot de software, content,
              logo's en huisstijl, berusten bij Janaz App. Het is niet toegestaan om zonder
              toestemming gebruik te maken van deze intellectuele eigendomsrechten.
            </p>

            <h2>7. Beschikbaarheid</h2>
            <p>
              We streven naar een hoge beschikbaarheid van het Platform, maar kunnen geen 100%
              uptime garanderen. Gepland onderhoud wordt waar mogelijk vooraf aangekondigd.
            </p>

            <h2>8. Aansprakelijkheid</h2>
            <h3>8.1 Algemeen</h3>
            <p>
              Janaz App is niet aansprakelijk voor schade die voortvloeit uit het gebruik van het
              Platform, tenzij er sprake is van opzet of grove nalatigheid van onze kant.
            </p>

            <h3>8.2 Beperking</h3>
            <p>
              Onze aansprakelijkheid is in alle gevallen beperkt tot het bedrag dat in het
              betreffende geval onder onze aansprakelijkheidsverzekering wordt uitbetaald.
            </p>

            <h2>9. Beëindiging</h2>
            <h3>9.1 Door gebruiker</h3>
            <p>
              U kunt uw account op elk moment beëindigen via de instellingenpagina. Na beëindiging
              worden uw gegevens verwerkt conform ons retentiebeleid en Privacy Beleid.
            </p>

            <h3>9.2 Door Janaz App</h3>
            <p>
              We behouden ons het recht voor om accounts te beëindigen bij schending van deze
              voorwaarden of bij misbruik van het Platform.
            </p>

            <h2>10. Wijzigingen</h2>
            <p>
              We kunnen deze algemene voorwaarden van tijd tot tijd aanpassen. Belangrijke
              wijzigingen worden via e-mail aangekondigd. Door na de wijziging gebruik te blijven
              maken van het Platform, gaat u akkoord met de gewijzigde voorwaarden.
            </p>

            <h2>11. Toepasselijk recht</h2>
            <p>
              Op deze algemene voorwaarden is Nederlands recht van toepassing. Geschillen worden bij
              voorkeur in onderling overleg opgelost. Indien dit niet mogelijk is, zijn de bevoegde
              rechters in Nederland exclusief bevoegd.
            </p>

            <h2>12. Contact</h2>
            <p>
              Voor vragen over deze algemene voorwaarden kunt u contact met ons opnemen via:
            </p>
            <p>E-mail: support@janazapp.nl</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
