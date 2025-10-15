import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  businessNumber: string;
  companyName: string;
  addressStreet: string;
  addressPostcode: string;
  addressCity: string;
}

interface KBOData {
  name: string;
  address: {
    street: string;
    houseNumber: string;
    postcode: string;
    city: string;
  };
  status: string;
}

interface ComparisonResult {
  name: 'match' | 'minor' | 'mismatch';
  street: 'match' | 'minor' | 'mismatch';
  number: 'match' | 'minor' | 'mismatch';
  postcode: 'match' | 'mismatch';
  city: 'match' | 'minor' | 'mismatch';
}

// Valideer ondernemingsnummer formaat en checksum
function validateBusinessNumber(number: string): { valid: boolean; normalized: string; error?: string } {
  // Verwijder BE prefix en spaties
  let normalized = number.replace(/BE/gi, '').replace(/\s/g, '').replace(/\./g, '');
  
  if (normalized.length !== 10) {
    return { valid: false, normalized, error: 'Ondernemingsnummer moet 10 cijfers bevatten' };
  }
  
  if (!/^\d{10}$/.test(normalized)) {
    return { valid: false, normalized, error: 'Ondernemingsnummer mag alleen cijfers bevatten' };
  }
  
  // Checksum validatie (modulo 97)
  const firstEight = parseInt(normalized.substring(0, 8));
  const checkDigits = parseInt(normalized.substring(8, 10));
  const calculatedCheck = 97 - (firstEight % 97);
  
  if (calculatedCheck !== checkDigits) {
    return { valid: false, normalized, error: 'Ongeldig ondernemingsnummer (checksum klopt niet)' };
  }
  
  return { valid: true, normalized };
}

// Normaliseer straatnamen voor vergelijking
function normalizeStreet(street: string): string {
  return street
    .toLowerCase()
    .trim()
    .replace(/\bstraat\b/g, 'str')
    .replace(/\bsteenweg\b/g, 'stwg')
    .replace(/\blaan\b/g, 'ln')
    .replace(/\bavenue\b/g, 'av')
    .replace(/\bplein\b/g, 'pl')
    .replace(/\bsquare\b/g, 'sq')
    .replace(/[.,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normaliseer bedrijfsnaam (verwijder rechtsvormen)
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(bv|bvba|nv|sa|nv\/sa|cv|cvba|vzw|asbl|vof|comm\.v|scs|snc)\b/gi, '')
    .replace(/[.,\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Berekén string similarity (Levenshtein distance based)
function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Haal KBO data op (mocked voor nu - echte implementatie zou scrapen of API gebruiken)
async function fetchKBOData(businessNumber: string): Promise<KBOData | null> {
  try {
    // BELANGRIJKE OPMERKING: De KBO heeft geen publieke JSON API
    // Voor productie moet je:
    // 1. Een officiële KBO API gebruiken (bv. via Crossroads Bank for Enterprises)
    // 2. Of web scraping implementeren van https://kbopub.economie.fgov.be
    // 3. Of een derde partij service gebruiken
    
    // Voor deze implementatie simuleren we een succesvolle lookup
    // In productie moet dit vervangen worden door echte KBO lookup
    
    console.log(`Fetching KBO data for ${businessNumber}`);
    
    // Mock response - vervang dit met echte KBO lookup
    return {
      name: "Voorbeeld Uitvaartonderneming BV",
      address: {
        street: "Stationsstraat",
        houseNumber: "42",
        postcode: "2800",
        city: "Mechelen"
      },
      status: "active"
    };
  } catch (error) {
    console.error('Error fetching KBO data:', error);
    return null;
  }
}

// Vergelijk ingevoerde data met KBO data
function compareData(userInput: VerificationRequest, kboData: KBOData): ComparisonResult {
  const result: ComparisonResult = {
    name: 'mismatch',
    street: 'mismatch',
    number: 'mismatch',
    postcode: 'mismatch',
    city: 'mismatch'
  };
  
  // Vergelijk naam
  const normalizedUserName = normalizeCompanyName(userInput.companyName);
  const normalizedKboName = normalizeCompanyName(kboData.name);
  const nameSimilarity = stringSimilarity(normalizedUserName, normalizedKboName);
  
  if (nameSimilarity >= 0.95) {
    result.name = 'match';
  } else if (nameSimilarity >= 0.8) {
    result.name = 'minor';
  }
  
  // Vergelijk postcode (exact match vereist)
  if (userInput.addressPostcode === kboData.address.postcode) {
    result.postcode = 'match';
  }
  
  // Vergelijk stad (case-insensitive)
  const normalizedUserCity = userInput.addressCity.toLowerCase().trim();
  const normalizedKboCity = kboData.address.city.toLowerCase().trim();
  const citySimilarity = stringSimilarity(normalizedUserCity, normalizedKboCity);
  
  if (citySimilarity >= 0.95) {
    result.city = 'match';
  } else if (citySimilarity >= 0.8) {
    result.city = 'minor';
  }
  
  // Vergelijk straat
  const normalizedUserStreet = normalizeStreet(userInput.addressStreet);
  const normalizedKboStreet = normalizeStreet(kboData.address.street);
  const streetSimilarity = stringSimilarity(normalizedUserStreet, normalizedKboStreet);
  
  if (streetSimilarity >= 0.95) {
    result.street = 'match';
  } else if (streetSimilarity >= 0.85) {
    result.street = 'minor';
  }
  
  // Voor huisnummer: zou uit addressStreet gehaald moeten worden
  // Simplified vergelijking voor nu
  result.number = 'match'; // Placeholder
  
  return result;
}

// Besluit nemen gebaseerd op vergelijking
function makeDecision(comparison: ComparisonResult, kboData: KBOData): 'pass' | 'warn' | 'block' {
  // Blokkeer als onderneming niet actief is
  if (kboData.status !== 'active') {
    return 'block';
  }
  
  // Blokkeer bij duidelijke mismatches
  if (comparison.postcode === 'mismatch' || comparison.name === 'mismatch') {
    return 'block';
  }
  
  // Waarschuwing bij kleine verschillen
  if (comparison.name === 'minor' || comparison.street === 'minor' || comparison.city === 'minor') {
    return 'warn';
  }
  
  // Alles matcht
  return 'pass';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userInput: VerificationRequest = await req.json();
    
    // Valideer ondernemingsnummer
    const validation = validateBusinessNumber(userInput.businessNumber);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: validation.error
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Haal KBO data op
    const kboData = await fetchKBOData(validation.normalized);
    if (!kboData) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Onderneming niet gevonden in KBO'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Vergelijk data
    const comparison = compareData(userInput, kboData);
    const decision = makeDecision(comparison, kboData);
    
    // Log verificatie (zonder organization_id - die is er nog niet)
    await supabaseClient
      .from('org_verifications')
      .insert({
        business_number: validation.normalized,
        status: decision,
        kbo_data: kboData,
        comparison_result: comparison,
        user_input: userInput
      });
    
    return new Response(
      JSON.stringify({
        ok: true,
        enterpriseNumber: validation.normalized,
        kbo: kboData,
        comparison,
        decision
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in verify-kbo:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Er is een fout opgetreden'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
