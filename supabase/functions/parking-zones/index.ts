const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const wfsUrl =
      "https://openparking.stockholm.se/LTF-Parking/v2.1/servicedagar/weekday/months/7,8?outputFormat=GeoJSON&apiKey=open";

    const response = await fetch(wfsUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      // Try alternative endpoint
      const altUrl =
        "https://openparking.stockholm.se/geoserver/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=od_gis:ParkeringTillaten&outputFormat=application/json&srsName=EPSG:4326";

      const altResponse = await fetch(altUrl, {
        headers: { Accept: "application/json" },
      });

      if (!altResponse.ok) {
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
