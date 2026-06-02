# Lunan 🧭

A personal map diary built with **Expo (React Native)** for Android. Save
location-based notes with photos, drop pins on a map, and revisit the spots you
love.

Built on **Expo SDK 56**, plain **JavaScript**, and **React Navigation**. The map
uses **Leaflet + OpenStreetMap** (free, no API key) rendered inside a
`react-native-webview`.

## Features

- **Home tab** — a friendly dashboard (shown first) with a "places saved"
  counter, an **"On this day" / "Looking back" memory card**, a **"Your travels"
  stats** summary (places, favorites, photos, top category, collecting-since),
  **backup/restore** (export a text backup via the share sheet, import by
  pasting it back), a **light / dark / auto appearance** toggle, a short "how it
  works" guide, and shortcuts into the app.
- **Map tab** — full-screen map centered on your current GPS position with a
  "you are here" marker. Saved places appear as category-colored pins that
  **cluster** when zoomed out; tapping a pin shows a popup with the place's
  **photo**, title, and note. **Long-press the map** to drop a pin anywhere, a
  **base-layer switcher** toggles street / terrain / satellite tiles, a
  **fit-all-pins** button frames every saved place, and a floating **+** button
  starts the Add Place flow at your current location.
- **Add Place** — title (required), multiline note, a **category** (Food, Café,
  Nature, Scenic View, Stay, Other), a **1–5 star rating**, and **multiple photos**
  from the **camera or gallery** (multi-select, with a tappable **cover photo /
  reorder** menu). The coordinates are reverse-geocoded into a friendly **place
  name** and shown read-only. Saving stores the place and returns to the map with
  the new pin visible.
- **Categories** — each place has a category with its own color; map pins are
  colored by category, and both the Map and My Places can be **filtered** by
  category from a chip bar.
- **My Places tab** — a scrollable list of cards (photo thumbnail, title, note
  preview, date) that can be filtered by category or by **favorites only**.
  cards also show the **star rating** and **distance from you**, and can be
  sorted **Recent / Rating / Nearest**. Tapping a card opens a detail view with a
  **swipeable photo gallery**, an editable **star rating**, note, a mini-map, and
  a **Get Directions** button (opens Google Maps). From there a place can be
  **favorited**, **edited** (title, note, photos, category, rating), or
  **deleted** with a confirmation prompt.
- **Empty state** — a friendly prompt when nothing has been saved yet.
- Full **permission handling** with graceful fallbacks when location, camera, or
  photo access is denied.

## Project structure

```
places-i-loved/
├── App.js                     # Navigation: bottom tabs + nested stacks
├── index.js                   # App entry (registerRootComponent)
├── theme.js                   # Colors, spacing, typography, shadows
├── categories.js              # Category list (id, label, color, icon)
├── app.json                   # Expo config + Android permissions/plugins
├── components/
│   ├── LeafletMap.js          # Leaflet + OpenStreetMap inside a WebView
│   ├── CategoryChips.js       # Horizontal category filter
│   └── CategoryBadge.js       # Colored category pill
├── utils/
│   ├── storage.js             # AsyncStorage helper (get/save/delete)
│   └── geocode.js             # Reverse-geocode coordinates → place name
└── screens/
    ├── HomeScreen.js
    ├── MapScreen.js
    ├── AddPlaceScreen.js
    ├── PlacesListScreen.js
    └── PlaceDetailScreen.js
```

## Install dependencies

Dependencies are already declared in `package.json`. To install everything from
scratch (or to reproduce the install on a fresh clone):

```bash
npm install
```

The full set of runtime libraries this app uses can be (re)installed with:

```bash
npx expo install expo-location react-native-webview expo-image-picker \
  @react-native-async-storage/async-storage \
  @react-navigation/native @react-navigation/bottom-tabs \
  @react-navigation/native-stack react-native-screens \
  react-native-safe-area-context react-native-gesture-handler \
  expo-image @expo/vector-icons expo-dev-client
```

> Using `npx expo install` (not plain `npm install <pkg>`) ensures each library
> is pinned to the version that matches Expo SDK 56.

## Run the app (development build)

> **Heads up:** this project targets **Expo SDK 56**, which is newer than the
> public **Expo Go** runtime in the Play Store. Expo Go therefore shows
> _"This project requires a newer version of Expo Go"_ and **cannot** load it —
> updating Expo Go does not help until Expo ships SDK 56 to the store. Use a
> **development build** instead (it bundles the SDK 56 runtime + native modules).

> **No map API key needed.** The map uses Leaflet with free OpenStreetMap tiles,
> so there's nothing to configure in the Google Cloud Console — you just need an
> internet connection to load the tiles.

### 1. Build with EAS (cloud — no Android Studio needed)

```bash
npx eas-cli@latest login                                  # your free Expo account
npx eas-cli@latest build --profile development --platform android
```

When the cloud build finishes, install the resulting **APK** on your Android
device (scan the QR / open the link EAS prints).

### 2. Start the dev server and connect

```bash
npx expo start --dev-client
```

Open the installed **Lunan** dev app and scan the QR code.

> Prefer building locally? With Android Studio + an emulator/USB device:
> `npx expo run:android` (also a development build, no EAS account required).

## Permissions

Requested at runtime and declared in `app.json`:

- **Location** (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) — center the map
  and tag saved places.
- **Camera** (`CAMERA`) — take a photo for a place.
- **Photos** (`READ_MEDIA_IMAGES`) — pick a photo from the gallery.

If any permission is denied, the app degrades gracefully (the map falls back to a
default region with a banner; photo attachment is simply skipped).

## Data

Places are stored locally on the device via `@react-native-async-storage/async-storage`
under the key `places_i_loved.places.v1`. Each record:

```js
{ id, title, note, photoUris, latitude, longitude, locationName, category, favorite, rating, createdAt }
```
