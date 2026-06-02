import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'places_i_loved.places.v1';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Returns an array of saved places (newest first). Never throws.
export async function getPlaces() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[storage] Failed to read places:', error);
    return [];
  }
}

// Returns a place's photos as an array, tolerant of older single-photo records.
export function getPhotos(place) {
  if (place && Array.isArray(place.photoUris) && place.photoUris.length) {
    return place.photoUris;
  }
  if (place && place.photoUri) return [place.photoUri];
  return [];
}

// Persists a new place and returns the saved record (with generated id/date).
export async function savePlace(input) {
  const photoUris = Array.isArray(input.photoUris)
    ? input.photoUris
    : input.photoUri
    ? [input.photoUri]
    : [];

  const place = {
    id: input.id || makeId(),
    title: input.title,
    note: input.note || '',
    photoUris,
    photoUri: photoUris[0] || null, // kept for backward compatibility
    latitude: input.latitude,
    longitude: input.longitude,
    locationName: input.locationName || null,
    category: input.category || 'other',
    favorite: input.favorite || false,
    rating: input.rating || 0,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  const places = await getPlaces();
  const next = [place, ...places];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return place;
}

// Applies partial changes to a place by id and returns the updated record.
export async function updatePlace(id, changes) {
  const places = await getPlaces();
  const next = places.map((p) => (p.id === id ? { ...p, ...changes } : p));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.find((p) => p.id === id) || null;
}

// Merges imported places into storage by id (keeps existing, adds new ones).
// Returns { added, total }. Throws if the input isn't a valid places array.
export async function mergePlaces(imported) {
  if (!Array.isArray(imported)) {
    throw new Error('Backup must be a list of places.');
  }
  const existing = await getPlaces();
  const byId = new Map(existing.map((p) => [p.id, p]));
  let added = 0;
  imported.forEach((p) => {
    if (p && p.id && p.latitude != null && p.longitude != null && !byId.has(p.id)) {
      byId.set(p.id, p);
      added += 1;
    }
  });
  const merged = Array.from(byId.values());
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return { added, total: merged.length };
}

// Removes a place by id and returns the remaining list.
export async function deletePlace(id) {
  const places = await getPlaces();
  const next = places.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
