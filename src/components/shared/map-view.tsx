"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[240px] w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  radiusKm?: number;
  active?: boolean;
}

export function MapView({
  markers,
  center,
  zoom = 11,
  onPick,
  className = "h-[320px] w-full rounded-lg border",
}: {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const effectiveCenter =
    center ??
    (markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 30.3753, lng: 69.3451 });
  return (
    <div className={className}>
      <LeafletMap markers={markers} center={effectiveCenter} zoom={zoom} onPick={onPick} />
    </div>
  );
}
