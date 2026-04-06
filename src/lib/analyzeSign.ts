import { supabase } from "@/integrations/supabase/client";
import type { ParkingAnalysis } from "@/components/ParkingResults";

export async function analyzeSign(imageDataUrl: string): Promise<ParkingAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-sign", {
    body: { image: imageDataUrl },
  });

  if (error) throw new Error(error.message || "Failed to analyze sign");
  return data as ParkingAnalysis;
}
