import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are an expert at interpreting Swedish parking signs (parkeringsskyltar). You analyze images of parking signs and return structured JSON.

You understand all common Swedish parking signs including:
- P (parking allowed)
- Time-limited parking (e.g., 2 tim, 30 min)
- Förbud att parkera (no parking)
- Förbud att stanna (no stopping)
- Boendeparkering (residential permit zones)
- Rörelsehindrade (disabled parking)
- Lastzon (loading zones)
- Gatuunderhåll/Gatusopning (street cleaning)
- Tilläggstavlor (supplementary plates with time/day restrictions)
- Date ranges and special conditions

You understand Swedish time formats like "8-18", day abbreviations, and holiday rules. Parenthesized times like "(8-15)" mean day-before-holiday restrictions.

Swedish public holidays: Nyårsdagen (Jan 1), Trettondedag jul (Jan 6), Långfredagen, Påskdagen, Annandag påsk, Första maj (May 1), Kristi himmelsfärdsdag, Nationaldagen (Jun 6), Midsommarafton, Midsommardagen, Alla helgons dag, Julafton (Dec 24), Juldagen (Dec 25), Annandag jul (Dec 26), Nyårsafton (Dec 31).

Given the current time and date, determine if parking is currently allowed.

Return ONLY valid JSON with this structure:
{
  "detectedSigns": ["list of detected sign types"],
  "interpretation": "plain language explanation of what the signs mean together",
  "rules": ["list of individual parking rules"],
  "isAllowed": true/false/null,
  "status": "Parking Allowed" or "Parking Not Allowed" or "Unknown",
  "timeRemaining": "Xh Ym" or null,
  "maxParkingMinutes": number or null,
  "confidence": 0.0-1.0
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const now = new Date();
    const swedenTime = now.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "Europe/Stockholm" });

    const userMessage = `Current date/time in Sweden: ${swedenTime} (${dayOfWeek})

Analyze the parking sign(s) in this image. Determine all rules and whether parking is currently allowed.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = {
        detectedSigns: ["Unknown"],
        interpretation: content || "Could not interpret the sign. Please try a clearer image.",
        rules: ["Unable to determine rules"],
        isAllowed: null,
        status: "Unknown",
        timeRemaining: null,
        maxParkingMinutes: null,
        confidence: 0.3,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-sign error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
