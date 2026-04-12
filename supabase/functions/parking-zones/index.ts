const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("STOCKHOLM_API_KEY");
    if (!API_KEY) throw new Error("STOCKHOLM_API_KEY not configured");

    const url = new URL(req.url);
    const lat = url.searchParams.get("lat") || "59.3293";
    const lng = url.searchParams.get("lng") || "18.0686";
    const radius = url.searchParams.get("radius") || "1000";

    // Use json format (GeoJSON format returns 400 with some API keys)
    const apiUrl =
      `https://openparking.stockholm.se/LTF-Tolken/v1/ptillaten/within?` +
      `radius=${radius}&lat=${lat}&lng=${lng}&outputFormat=json&apiKey=${API_KEY}`;

    const response = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Parking zones API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Convert the json response to GeoJSON FeatureCollection
    const features = data?.features || data?.Features || [];
    const featureCollection = {
      type: "FeatureCollection",
      features: Array.isArray(features) ? features : [],
    };

    console.log(`Returning ${featureCollection.features.length} zone features`);

    return new Response(JSON.stringify(featureCollection), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error fetching parking zones:", error);
    return new Response(
      JSON.stringify({ type: "FeatureCollection", features: [] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
