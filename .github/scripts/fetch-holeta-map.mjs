// Downloads OpenStreetMap data for Holeta town only and writes a small GeoJSON
// (mobile/public/holeta-map.json) that the app draws with its own styling.
// Runs in GitHub Actions (needs internet). Usage: node fetch-holeta-map.mjs <out.json>
import fs from 'node:fs';
import osmtogeojson from 'osmtogeojson';

const OUT = process.argv[2] || 'holeta-map.json';
const FALLBACK = { south: 9.03, west: 38.48, north: 9.07, east: 38.52 }; // ~4.4 x 4.4 km around 9.05,38.50
const UA = { 'User-Agent': 'holeta-gebeya-map-build/1.0 (setaza20@gmail.com)' };

async function getJson(url, opts = {}, tries = 3) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...opts, headers: { ...UA, ...(opts.headers || {}) } });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) { err = e; await new Promise((res) => setTimeout(res, 4000 * (i + 1))); }
  }
  throw err;
}

// 1) Try to find the town's own extent; fall back to the fixed box.
async function townBox() {
  try {
    const q = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent('Holeta, Oromia, Ethiopia') + '&format=json&limit=1';
    const [hit] = await getJson(q);
    if (!hit) return { box: FALLBACK, source: 'fallback (not found)' };
    let [s, n, w, e] = hit.boundingbox.map(Number);
    if (n - s < 0.02 || e - w < 0.02) { // just a point: take a box around it
      const lat = Number(hit.lat), lon = Number(hit.lon);
      return { box: { south: lat - 0.025, north: lat + 0.025, west: lon - 0.025, east: lon + 0.025 }, source: 'nominatim point' };
    }
    if (n - s > 0.15 || e - w > 0.15) return { box: FALLBACK, source: 'fallback (area too large)' };
    return { box: { south: s, north: n, west: w, east: e }, source: 'nominatim boundary' };
  } catch (e) {
    return { box: FALLBACK, source: 'fallback (' + e.message + ')' };
  }
}

const { box, source } = await townBox();
const bb = `${box.south},${box.west},${box.north},${box.east}`;
console.log('Using bbox', bb, 'from', source);

const query = `[out:json][timeout:120];
(
  way["highway"](${bb});
  way["building"](${bb});
  way["landuse"](${bb});
  way["natural"~"water|wood|scrub|grassland"](${bb});
  way["waterway"](${bb});
  way["leisure"~"park|pitch|playground"](${bb});
  node["amenity"](${bb});
  node["shop"](${bb});
  node["place"~"suburb|neighbourhood|quarter|village|town"](${bb});
  node["name"]["tourism"](${bb});
  way["amenity"]["name"](${bb});
);
out body geom;`;

const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
let osm;
for (const ep of endpoints) {
  try {
    osm = await getJson(ep, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    break;
  } catch (e) { console.log('Overpass failed at', ep, e.message); }
}
if (!osm) throw new Error('All Overpass endpoints failed');

const gj = osmtogeojson(osm);
const keep = ['name', 'name:am', 'name:en', 'highway', 'building', 'landuse', 'natural', 'waterway', 'leisure', 'amenity', 'shop', 'place', 'tourism'];
const round = (n) => Math.round(n * 1e5) / 1e5;
const roundCoords = (c) => (typeof c[0] === 'number' ? [round(c[0]), round(c[1])] : c.map(roundCoords));

const features = [];
for (const f of gj.features) {
  if (!f.geometry) continue;
  const props = {};
  for (const k of keep) if (f.properties && f.properties[k] !== undefined) props[k] = f.properties[k];
  features.push({ type: 'Feature', properties: props, geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) } });
}

const out = { type: 'FeatureCollection', meta: { town: 'Holeta', bbox: box, bboxSource: source, builtAt: new Date().toISOString(), count: features.length }, features };
fs.writeFileSync(OUT, JSON.stringify(out));
const kinds = {};
for (const f of features) { const p = f.properties; const k = p.highway ? 'highway' : p.building ? 'building' : p.landuse ? 'landuse' : p.natural ? 'natural' : p.amenity ? 'amenity' : p.shop ? 'shop' : p.place ? 'place' : 'other'; kinds[k] = (kinds[k] || 0) + 1; }
console.log('Wrote', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB', features.length, 'features', JSON.stringify(kinds));
