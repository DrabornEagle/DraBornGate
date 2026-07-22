export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6371000;
const rad = (value: number) => (value * Math.PI) / 180;

export function distanceMeters(from: Coordinates, to: Coordinates) {
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const lat1 = rad(from.latitude);
  const lat2 = rad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
