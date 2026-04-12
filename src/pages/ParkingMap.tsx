import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  fetchParkingFacilities,
  fetchParkingZones,
  type ParkingFeature,
} from "@/lib/parkingApi";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
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

const ICONS: Record<string, L.DivIcon> = {
  parking: createColorIcon("#16a34a"),
  disabled: createColorIcon("#2563eb"),
  motorcycle: createColorIcon("#f97316"),
  truck: createColorIcon("#8b5cf6"),
  bus: createColorIcon("#0ea5e9"),
  service: createColorIcon("#dc2626"),
};

function getMarkerIcon(type: string) {
  return ICONS[type] || ICONS.parking;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

const STOCKHOLM_CENTER: [number, number] = [59.3293, 18.0686];

const zoneStyle: L.PathOptions = {
  color: "#2563eb",
  weight: 2,
  opacity: 0.6,
  fillColor: "#3b82f6",
  fillOpacity: 0.15,
};

const LEGEND = [
  { color: "bg-green-600", label: "Parking allowed" },
  { color: "bg-blue-600", label: "Disabled parking" },
  { color: "bg-orange-500", label: "Motorcycle" },
  { color: "bg-purple-500", label: "Truck" },
  { color: "bg-sky-500", label: "Bus" },
  { color: "bg-red-600", label: "Service day" },
];

export default function ParkingMap() {
  const navigate = useNavigate();
  const [features, setFeatures] = useState<ParkingFeature[]>([]);
  const [zones, setZones] = useState<GeoJSON.FeatureCollection | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setUserLocation(loc);
        loadData(loc[0], loc[1]);
      },
      () => {
        setUserLocation(STOCKHOLM_CENTER);
        loadData(STOCKHOLM_CENTER[0], STOCKHOLM_CENTER[1]);
        toast.info("Location unavailable", {
          description: "Showing Stockholm city center instead.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const loadData = (lat: number, lng: number) => {
    Promise.all([
      fetchParkingFacilities(lat, lng).catch((err) => {
        toast.error("Failed to load parking data", {
          description: err.message,
        });
        return [] as ParkingFeature[];
      }),
      fetchParkingZones(lat, lng).catch(() => null),
    ]).then(([facilitiesData, zonesData]) => {
      setFeatures(facilitiesData);
      setZones(zonesData);
      setLoading(false);
    });
  };

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
      <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-3 text-xs font-medium flex-wrap">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span
              className={`h-3 w-3 rounded-full ${l.color} inline-block`}
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={15}
          className="h-full w-full"
          style={{ minHeight: "calc(100vh - 100px)" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={mapCenter} />

          {zones && <GeoJSON data={zones} style={zoneStyle} />}

          {/* User location */}
          <Marker
            position={mapCenter}
            icon={L.divIcon({
              html: `<div style="width:16px;height:16px;background:#006AA7;border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,106,167,0.5);"></div>`,
              className: "",
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          />

          {features
            .filter((f) => f.lat !== 0 && f.lng !== 0)
            .map((feature) => (
              <Marker
                key={feature.id}
                position={[feature.lat, feature.lng]}
                icon={getMarkerIcon(feature.type)}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-sm mb-1">
                      {feature.streetName}
                    </h3>
                    {feature.rules && (
                      <p className="text-xs text-gray-600 mb-1">
                        {feature.rules}
                      </p>
                    )}
                    {feature.timeRestriction && (
                      <p className="text-xs text-gray-500 mb-2">
                        {feature.timeRestriction}
                      </p>
                    )}
                    <span className="inline-block text-xs bg-gray-100 rounded px-2 py-0.5 mb-2 capitalize">
                      {feature.type}
                    </span>
                    <button
                      onClick={() =>
                        openNavigation(feature.lat, feature.lng)
                      }
                      className="w-full bg-blue-600 text-white text-xs font-medium py-1.5 px-3 rounded flex items-center justify-center gap-1 hover:bg-blue-700"
                    >
                      Navigate
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
