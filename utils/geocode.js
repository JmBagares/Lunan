import * as Location from 'expo-location';

// Builds the fullest available place label from a reverse-geocoded address.
// On Android, `formattedAddress` is the complete street address — prefer it.
// Otherwise assemble from the most specific parts down to the country.
function formatLocationName(geo) {
  if (!geo) return null;

  if (geo.formattedAddress) return geo.formattedAddress;

  const parts = [];
  const push = (value) => {
    if (value && !parts.includes(value)) parts.push(value);
  };

  // Most specific first: a named place / street, then admin areas.
  if (geo.name) {
    push(geo.name);
  } else if (geo.street) {
    push(geo.streetNumber ? `${geo.streetNumber} ${geo.street}` : geo.street);
  }
  push(geo.district);
  push(geo.city);
  push(geo.subregion);
  push(geo.region);
  push(geo.country);

  return parts.length ? parts.join(', ') : null;
}

// Turns coordinates into a place name. Returns null on any failure
// (no network, geocoder unavailable, permission missing) so callers
// can gracefully fall back to showing raw coordinates.
export async function getLocationName(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!results || results.length === 0) return null;
    return formatLocationName(results[0]);
  } catch (error) {
    console.warn('[geocode] reverse geocode failed:', error);
    return null;
  }
}
