const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Try the LTF-Tolken REST API for parking-allowed data near Stockholm center
    // The API key "open" is the documented public key
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat") || "59.3293";
    const lng = url.searchParams.get("lng") || "18.0686";
    const radius = url.searchParams.get("radius") || "2000";

    const apiUrl =
      `https://openparking.stockholm.se/LTF-Tolken/v1/ptillaten/within?` +
      `lat=${lat}&lng=${lng}&radius=${radius}&outputFormat=GeoJSON&apiKey=open`;

    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Parking zones API responded with status ${response.status}`);
    }

    const text = await response.text();
    if (!text || text.trim() === "" || text.trim() === "error") {
      // API returned empty/error — parking zones data not available with public key
      return new Response(
        JSON.stringify({ type: "FeatureCollection", features: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const data = JSON.parse(text);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error fetching parking zones:", error);
    // Return empty FeatureCollection instead of error to avoid breaking the map
    return new Response(
      JSON.stringify({ type: "FeatureCollection", features: [] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
