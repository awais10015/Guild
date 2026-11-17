"use client";

import { Fragment, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker } from "./map-view";

function createIcon(active: boolean) {
  const color = active ? "#0d9488" : "#64748b";
  return L.divIcon({
    className: "guild-leaflet-pin",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function ClickCapture({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom, map]);
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
    setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
  }, []);

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} zoom={zoom} />
      <ClickCapture onPick={onPick} />
      {markers.map((m, i) => (
        <Fragment key={`${m.lat}-${m.lng}-${i}`}>
          <Marker position={[m.lat, m.lng]} icon={createIcon(!!m.active)} title={m.label} alt={m.label ?? "Marker"} />
          {m.radiusKm ? (
            <Circle
              center={[m.lat, m.lng]}
              radius={m.radiusKm * 1000}
              pathOptions={{
                color: m.active ? "#0d9488" : "#64748b",
                weight: m.active ? 2 : 1,
                fillOpacity: m.active ? 0.12 : 0.06,
              }}
            />
          ) : null}
        </Fragment>
      ))}
    </MapContainer>
  );
}