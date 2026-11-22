import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { ASSET_TYPE_SHORT, type Asset } from "@/lib/blockaid";

function icon(a: Asset, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="asset-marker" data-status="${a.status}" data-selected="${selected}">${ASSET_TYPE_SHORT[a.asset_type]}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ assets }: { assets: Asset[] }) {
  const map = useMap();
  const key = assets.length;
  useEffect(() => {
    if (!assets.length) return;
    map.fitBounds(L.latLngBounds(assets.map((a) => [a.lat, a.lng])), { padding: [40, 40], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function AssetMap({
  assets, selectedId, onSelect, className,
}: { assets: Asset[]; selectedId?: string | null; onSelect?: (a: Asset) => void; className?: string }) {
  const center = useMemo<[number, number]>(() => [41.5912, -93.6175], []);
  return (
    <MapContainer center={center} zoom={16} className={className} scrollWheelZoom>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
        maxZoom={19}
      />
      <FitBounds assets={assets} />
      {assets.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lng]}
          icon={icon(a, a.id === selectedId)}
          title={`${a.asset_code} — ${a.address_label}`}
          eventHandlers={{ click: () => onSelect?.(a) }}
        />
      ))}
    </MapContainer>
  );
}
