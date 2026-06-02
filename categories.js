// Place categories: each has a stable id (stored on the place), a label,
// a distinct color (used for map pins / badges), and an Ionicons name.
export const CATEGORIES = [
  { id: 'food', label: 'Food & Drink', color: '#E8643C', icon: 'restaurant' },
  { id: 'cafe', label: 'Café', color: '#B5793A', icon: 'cafe' },
  { id: 'nature', label: 'Nature', color: '#3FA66A', icon: 'leaf' },
  { id: 'view', label: 'Scenic View', color: '#3B82C4', icon: 'camera' },
  { id: 'stay', label: 'Stay', color: '#8B5CC7', icon: 'bed' },
  { id: 'other', label: 'Other', color: '#7A8A99', icon: 'location' },
];

const CATEGORY_BY_ID = CATEGORIES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

// Always returns a valid category; unknown/missing ids fall back to "Other".
export function getCategory(id) {
  return CATEGORY_BY_ID[id] || CATEGORY_BY_ID.other;
}
