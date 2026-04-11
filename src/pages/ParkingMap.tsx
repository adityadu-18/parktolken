import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, Navigation, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fetchParkingFacilities, fetchParkingZones, type ParkingFacility } from "@/lib/parkingApi";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue in webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createColorIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#333" stroke-width="1"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -42],
  });
}

const greenIcon = createColorIcon("#16a34a");
const yellowIcon = createColorIcon("#eab308");
const redIcon = createColorIcon("#dc2626");

function getMarkerIcon(facility: ParkingFacility) {
  if (facility.totalSpaces === 0) return yellowIcon;
  const ratio = facility.freeSpaces / facility.totalSpaces;
  if (ratio > 0.2) return greenIcon;
  if (ratio > 0.05) return yellowIcon;
  return redIcon;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

const STOCKHOLM_CENTER: [number, number] = [59.3293, 18.0686];

const zoneStyle: L.PathOptions = {
  color: "#2563eb",
  weight: 2,
  opacity: 0.6,
  fillColor: "#3b82f6",
  fillOpacity: 0.2,
};

export default function ParkingMap() {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [zones, setZones] = useState<GeoJSON.FeatureCollection | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setLocationError(true);
        setUserLocation(STOCKHOLM_CENTER);
        toast.info("Location unavailable", {
          description: "Showing Stockholm city center instead.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Fetch parking data and zones in parallel
    Promise.all([
      fetchParkingFacilities().catch((err) => {
        toast.error("Failed to load parking data", { description: err.message });
        return [] as ParkingFacility[];
      }),
      fetchParkingZones().catch(() => null),
    ]).then(([facilitiesData, zonesData]) => {
      setFacilities(facilitiesData);
      setZones(zonesData);
      setLoading(false);
    });
  }, []);

  const mapCenter = userLocation || STOCKHOLM_CENTER;

  const openNavigation = (lat: number, lng: number) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  if (!userLocation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-foreground font-medium">Getting your location…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-md z-10">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary/80 h-9 w-9"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <h1 className="font-bold text-lg">Parking Near Me</h1>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
      </div>

      {/* Legend */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-4 text-xs font-medium flex-wrap">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-green-600 inline-block" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-yellow-500 inline-block" /> Limited
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-red-600 inline-block" /> Full
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-blue-500/30 border border-blue-600 inline-block" /> Street Parking
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={14}
          className="h-full w-full"
          style={{ minHeight: "calc(100vh - 100px)" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={mapCenter} />

          {/* Parking zones layer */}
          {zones && <GeoJSON data={zones} style={zoneStyle} />}

          {/* User location marker */}
          <Marker
            position={mapCenter}
            icon={L.divIcon({
              html: `<div style="width:16px;height:16px;background:#006AA7;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,106,167,0.5);"></div>`,
              className: "",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />

          {facilities
            .filter((f) => f.lat !== 0 && f.lng !== 0)
            .map((facility) => (
              <Marker
                key={facility.id}
                position={[facility.lat, facility.lng]}
                icon={getMarkerIcon(facility)}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-sm mb-1">{facility.name}</h3>
                    {facility.address && (
                      <p className="text-xs text-gray-600 mb-2">{facility.address}</p>
                    )}
                    <div className="flex justify-between text-xs mb-2">
                      <span>
                        Available:{" "}
                        <strong className="text-green-700">{facility.freeSpaces}</strong>
                      </span>
                      <span>
                        Total: <strong>{facility.totalSpaces}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => openNavigation(facility.lat, facility.lng)}
                      className="w-full bg-blue-600 text-white text-xs font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1 hover:bg-blue-700"
                    >
                      <span>Navigate</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </motion.div>
  );
}
