const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Stockholm open parking WFS — uses the public GeoServer endpoint
    // The "open" API key is publicly documented for open data access
    const wfsUrl =
      "https://openstreetgs.stockholm.se/geoservice/api/open/wfs?" +
      "service=WFS&version=1.1.0&request=GetFeature" +
      "&typeName=LTFR:PtillatenParkering" +
      "&outputFormat=application/json" +
      "&srsName=EPSG:4326" +
      "&maxFeatures=500";

    const response = await fetch(wfsUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      // Fallback: try alternate type name
      const altUrl =
        "https://openstreetgs.stockholm.se/geoservice/api/open/wfs?" +
        "service=WFS&version=1.1.0&request=GetFeature" +
        "&typeName=LTFR:Ptillaten" +
        "&outputFormat=application/json" +
        "&srsName=EPSG:4326" +
        "&maxFeatures=500";

      const altResponse = await fetch(altUrl, {
        headers: { Accept: "application/json" },
      });

      if (!altResponse.ok) {
        const body = await altResponse.text();
        console.error("WFS fallback failed:", altResponse.status, body);
        throw new Error(`WFS API responded with status ${altResponse.status}`);
      }

      const altData = await altResponse.json();
      return new Response(JSON.stringify(altData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error fetching parking zones:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch parking zones" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
