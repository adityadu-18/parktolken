// Parking API client for Stockholm LTF-Tolken data

export interface ParkingFeature {
  id: string;
  streetName: string;
  rules: string;
  timeRestriction: string;
  lat: number;
  lng: number;
  type: "parking" | "disabled" | "motorcycle" | "truck" | "bus" | "service";
}

export async function fetchParkingFacilities(
  lat = 59.3293,
  lng = 18.0686,
  radius = 2000
): Promise<ParkingFeature[]> {
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parking-facilities?lat=${lat}&lng=${lng}&radius=${radius}`,
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    }
  );

  if (!resp.ok) {
    throw new Error("Failed to fetch parking data");
  }

  const raw = await resp.json();
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any, index: number) => {
    const props = item.properties || item.Properties || {};
    const geom = item.geometry || item.Geometry || {};
    const coords = geom.coordinates || [];

    // Get center point from geometry
    let lat = 0,
      lng = 0;
    if (geom.type === "Point") {
      [lng, lat] = coords;
    } else if (
      geom.type === "LineString" ||
      geom.type === "MultiLineString"
    ) {
      const flatCoords =
        geom.type === "MultiLineString" ? coords.flat() : coords;
      if (flatCoords.length > 0) {
        const mid = flatCoords[Math.floor(flatCoords.length / 2)];
        [lng, lat] = mid;
      }
    } else if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
      const ring =
        geom.type === "MultiPolygon" ? coords[0]?.[0] : coords[0];
      if (ring && ring.length > 0) {
        const sumLng = ring.reduce((s: number, c: number[]) => s + c[0], 0);
        const sumLat = ring.reduce((s: number, c: number[]) => s + c[1], 0);
        lng = sumLng / ring.length;
        lat = sumLat / ring.length;
      }
    }

    const streetName =
      props.STREET_NAME || props.ADDRESS || props.address || "Unknown street";

    const ruleText =
      props.VF_PLATS_TYP || props.OTHER_INFO || "";

    const timeText =
      props.PARKING_RATE ||
      (props.START_TIME !== undefined && props.END_TIME !== undefined
        ? `${props.START_TIME}:00–${props.END_TIME}:00`
        : props.MAX_MINUTES
        ? `Max ${props.MAX_MINUTES} min`
        : "");

    return {
      id: String(props.FEATURE_OBJECT_ID || props.FID || index),
      streetName,
      rules: ruleText,
      timeRestriction: timeText,
      lat,
      lng,
      type: item._parkingType || "parking",
    };
  });
}

export async function fetchParkingZones(
  lat = 59.3293,
  lng = 18.0686,
  radius = 1000
): Promise<GeoJSON.FeatureCollection | null> {
  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parking-zones?lat=${lat}&lng=${lng}&radius=${radius}`,
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );

    if (!resp.ok) {
      console.warn("Failed to fetch parking zones:", resp.status);
      return null;
    }

    const data = await resp.json();
    if (
      data &&
      data.type === "FeatureCollection" &&
      Array.isArray(data.features)
    ) {
      return data as GeoJSON.FeatureCollection;
    }

    console.warn("Parking zones response is not valid GeoJSON");
    return null;
  } catch (e) {
    console.warn("Parking zones fetch failed:", e);
    return null;
  }
}
