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
    const radius = url.searchParams.get("radius") || "500";

    // Fetch multiple parking types in parallel
    const endpoints = [
      { type: "parking", path: "ptillaten" },
      { type: "disabled", path: "phandikapp" },
      { type: "motorcycle", path: "pmotorcykel" },
      { type: "truck", path: "plastbil" },
      { type: "bus", path: "pbuss" },
      { type: "service", path: "servicedagar" },
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (ep) => {
        const apiUrl =
          `https://openparking.stockholm.se/LTF-Tolken/v1/${ep.path}/within?` +
          `radius=${radius}&lat=${lat}&lng=${lng}&outputFormat=json&apiKey=${API_KEY}`;

        const resp = await fetch(apiUrl, {
          headers: { Accept: "application/json" },
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.warn(`${ep.type} API error ${resp.status}: ${text}`);
          return [];
        }

        const data = await resp.json();
        const features = data?.features || data?.Features || [];
        return features.map((f: any) => ({
          ...f,
          _parkingType: ep.type,
        }));
      })
    );

    const allFeatures = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    return new Response(JSON.stringify(allFeatures), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error fetching parking data:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to fetch parking data",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
