// Smart Collections: auto-built groupings of saved places (no manual curation).
// Each collection has a stable id, a label, an Ionicons name, and a color.
import { distanceMeters } from './utils/distance';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 30;
const NEARBY_RADIUS_M = 25000; // 25 km

export const SMART_COLLECTIONS = [
  { id: 'favorites', title: 'Favorites', icon: 'heart', color: '#FF6F61' },
  { id: 'top', title: 'Top rated', icon: 'star', color: '#F5A623' },
  { id: 'recent', title: 'Recently added', icon: 'time', color: '#3B82C4' },
  {
    id: 'nearby',
    title: 'Nearby',
    icon: 'navigate',
    color: '#3FA66A',
    needsLocation: true,
  },
];

export function getCollection(id) {
  return SMART_COLLECTIONS.find((c) => c.id === id) || null;
}

// Returns the places that belong to a collection, already sorted for display.
// `userLoc` is only needed for the "nearby" collection.
export function collectionPlaces(id, places, userLoc) {
  switch (id) {
    case 'favorites':
      return places.filter((p) => p.favorite);
    case 'top':
      return places
        .filter((p) => (p.rating || 0) >= 4)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'recent':
      return places
        .filter(
          (p) => Date.now() - new Date(p.createdAt).getTime() <= RECENT_DAYS * DAY_MS
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'nearby': {
      if (!userLoc) return [];
      return places
        .map((p) => ({ place: p, distance: distanceMeters(userLoc, p) }))
        .filter((x) => x.distance != null && x.distance <= NEARBY_RADIUS_M)
        .sort((a, b) => a.distance - b.distance)
        .map((x) => x.place);
    }
    default:
      return [];
  }
}

// Builds the list of non-empty collections to show, each with its count.
// Location-dependent collections are omitted when no location is available.
export function buildCollections(places, userLoc) {
  return SMART_COLLECTIONS.filter((c) => !c.needsLocation || userLoc)
    .map((c) => ({ ...c, count: collectionPlaces(c.id, places, userLoc).length }))
    .filter((c) => c.count > 0);
}
