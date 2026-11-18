// Pure logic shared by the page and the Node tests. No DOM access here.

export const CITIES = [
  { id: 'seattle', name: 'Seattle', lon: -122.33, lat: 47.61 },
  { id: 'los-angeles', name: 'Los Angeles', lon: -118.24, lat: 34.05 },
  { id: 'miami', name: 'Miami', lon: -80.19, lat: 25.76 },
  { id: 'new-york', name: 'New York', lon: -74.01, lat: 40.71 },
  { id: 'bogota', name: 'Bogotá', lon: -74.07, lat: 4.71 },
  { id: 'amsterdam', name: 'Amsterdam', lon: 4.90, lat: 52.37 },
  { id: 'nairobi', name: 'Nairobi', lon: 36.82, lat: -1.29 },
  { id: 'tokyo', name: 'Tokyo', lon: 139.69, lat: 35.68 },
];

export const cityById = id => CITIES.find(c => c.id === id);

// GeoJSON LineString; d3.geoPath renders it as a great-circle arc.
export function routeFor(fromId, toId) {
  const a = cityById(fromId), b = cityById(toId);
  if (!a || !b || a === b) return null;
  return { type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] };
}

// Haversine great-circle distance, rounded to 10 km (shown as "≈ 7,700 km").
export function distanceKm(fromId, toId) {
  if (!routeFor(fromId, toId)) return null;
  const a = cityById(fromId), b = cityById(toId), rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) / 10) * 10;
}

export const formatCoord = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

export function buildBrief({ origin, destination, mode, commodity, readyDate, company, details }) {
  const lines = [
    'AGL shipment brief',
    `Origin: ${origin}`,
    `Destination: ${destination}`,
    `Transport mode: ${mode}`,
    `Commodity: ${commodity}`,
  ];
  if (readyDate) lines.push(`Cargo-ready date: ${readyDate}`);
  if (company) lines.push(`Company: ${company}`);
  if (details) lines.push(`Shipment details: ${details}`);
  return lines.join('\n');
}

export const mailtoHref = brief =>
  `mailto:?subject=${encodeURIComponent('Shipment brief')}&body=${encodeURIComponent(brief)}`;
