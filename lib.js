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
