import { supabase } from "@/integrations/supabase/client";

export interface ParkingFacility {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  totalSpaces: number;
  freeSpaces: number;
  type: string;
}

export async function fetchParkingFacilities(): Promise<ParkingFacility[]> {
  const { data, error } = await supabase.functions.invoke("parking-facilities");

  if (error) {
    throw new Error(error.message || "Failed to fetch parking data");
  }

  // The API response structure may vary — normalize it
  const raw = Array.isArray(data) ? data : data?.Result || data?.result || [];

  return raw.map((item: any, index: number) => ({
    id: item.Id || item.id || String(index),
    name: item.Namn || item.Name || item.name || "Unknown",
    address: item.Adress || item.Address || item.address || "",
    lat: parseFloat(item.Lat || item.lat || item.Latitude || 0),
    lng: parseFloat(item.Lng || item.lng || item.Long || item.Longitude || 0),
    totalSpaces: parseInt(item.AntalBesoksplatser || item.TotalSpaces || item.totalSpaces || 0, 10),
    freeSpaces: parseInt(item.LedigaBesoksplatser || item.FreeSpaces || item.freeSpaces || 0, 10),
    type: item.Anlaggningstyp || item.Type || item.type || "Garage",
  }));
}
