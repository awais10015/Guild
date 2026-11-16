import { GLOBAL_CITIES } from "@/lib/constants";

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null || Number.isNaN(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function toGeoJSONPoint(p: LatLng) {
  return { type: "Point" as const, coordinates: [p.lng, p.lat] };
}

export function fromGeoJSONPoint(point?: { coordinates?: number[] } | null): LatLng | null {
  const c = point?.coordinates;
  if (!c || c.length < 2) return null;
  return { lng: c[0], lat: c[1] };
}

export function cityCenter(name: string): LatLng | null {
  const city = GLOBAL_CITIES.find(
    (c) => c.name.toLowerCase() === (name || "").toLowerCase().trim(),
  );
  return city ? { lat: city.lat, lng: city.lng } : null;
}
