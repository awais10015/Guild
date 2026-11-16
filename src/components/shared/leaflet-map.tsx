"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./map-view";

function createIcon() {
  return L.divIcon({ className: "", html: '<div class="guild-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
}

function ClickCapture({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LeafletMap({
  markers,
  center,
  zoom,
  onPick,
}: {
  markers: MapMarker[];
  center: { lat: number; lng: number };
  zoom: number;
  onPick?: (lat: number, lng: number) => void;
}) {
  useEffect(() => {
    /* ensure leaflet recalculates size after mount in tabs/hidden containers */
    setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
  }, []);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture onPick={onPick} />
      {markers.map((m, i) => (
        <div key={i}>
          <Marker position={[m.lat, m.lng]} icon={createIcon()} title={m.label} alt={m.label ?? "Marker"} />
          {m.radiusKm ? <Circle center={[m.lat, m.lng]} radius={m.radiusKm * 1000} pathOptions={{ color: "#0d9488", weight: 1, fillOpacity: 0.06 }} /> : null}
        </div>
      ))}
    </MapContainer>
  );
}
