import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HaveIBeenPwned API k-anonymity model
// Only sends first 5 chars of SHA-1 hash for privacy
async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count: number }> {
  try {
    // Create SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Split hash: send first 5 chars, check rest locally
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    // Call HaveIBeenPwned API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'JanazApp-Security-Check'
      }
    });
    
    if (!response.ok) {
      console.error('HIBP API error:', response.status);
      return { breached: false, count: 0 }; // Fail open
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    // Check if our suffix appears in results
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { breached: true, count: parseInt(countStr.trim()) };
      }
    }
    
    return { breached: false, count: 0 };
  } catch (error) {
    console.error('Password breach check error:', error);
    return { breached: false, count: 0 }; // Fail open on errors
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    
    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if password is breached
    const result = await checkPasswordBreach(password);
    
    return new Response(
      JSON.stringify({
        breached: result.breached,
        count: result.count,
        warning: result.breached 
          ? `Dit wachtwoord is ${result.count.toLocaleString()} keer gelekt in datalekken. Kies een ander wachtwoord.`
          : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Check breached password error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
