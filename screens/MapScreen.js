import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import LeafletMap from '../components/LeafletMap';
import CategoryChips from '../components/CategoryChips';
import { getPlaces, getPhotos } from '../utils/storage';
import { getCategory } from '../categories';
import { radius, shadow, spacing } from '../theme';
import { useTheme } from '../theme-context';

// Fallback center (San Francisco) used only when location permission is denied.
const FALLBACK_CENTER = { latitude: 37.7749, longitude: -122.4194 };

const BASE_ORDER = ['street', 'terrain', 'satellite'];
const BASE_LABEL = { street: 'Street', terrain: 'Terrain', satellite: 'Satellite' };

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef(null);

  const [location, setLocation] = useState(null); // { latitude, longitude }
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [baseLayer, setBaseLayer] = useState('street');

  // Ask for location permission and grab the current position once on mount.
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setPermissionDenied(true);
            setLoading(false);
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted) {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch (error) {
        console.warn('[MapScreen] Could not get location:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Reload saved places every time the Map tab regains focus
  // (e.g. after adding a new place) so new pins appear immediately.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPlaces().then((saved) => {
        if (active) setPlaces(saved);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const recenter = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current.recenter(location, 15);
    }
  }, [location]);

  const fitAll = useCallback(() => {
    mapRef.current?.fitAll();
  }, []);

  const cycleBaseLayer = useCallback(() => {
    setBaseLayer((prev) => {
      const next = BASE_ORDER[(BASE_ORDER.indexOf(prev) + 1) % BASE_ORDER.length];
      return next;
    });
  }, []);

  const handleMapLongPress = useCallback(
    (coords) => {
      navigation.navigate('AddPlace', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    },
    [navigation]
  );

  const handleAddPlace = useCallback(() => {
    // Default to the user's location; fall back to the map center when denied.
    const target = location || FALLBACK_CENTER;
    navigation.navigate('AddPlace', {
      latitude: target.latitude,
      longitude: target.longitude,
    });
  }, [location, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Finding your location…</Text>
      </View>
    );
  }

  const center = location || FALLBACK_CENTER;

  const visiblePlaces =
    filter === 'all'
      ? places
      : places.filter((p) => (p.category || 'other') === filter);

  const markers = visiblePlaces.map((p) => ({
    ...p,
    color: getCategory(p.category).color,
    photo: getPhotos(p)[0],
  }));

  return (
    <View style={styles.container}>
      <LeafletMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        center={center}
        zoom={location ? 15 : 11}
        userLocation={location}
        markers={markers}
        baseLayer={baseLayer}
        onLongPress={handleMapLongPress}
      />

      {/* Top overlays: category filter + (optional) permission banner */}
      <View
        style={[styles.topOverlay, { paddingTop: insets.top + spacing.sm }]}
        pointerEvents="box-none"
      >
        <CategoryChips selected={filter} onSelect={setFilter} />
        {permissionDenied && (
          <View style={styles.banner}>
            <Ionicons
              name="location-outline"
              size={18}
              color={colors.accentDark}
            />
            <Text style={styles.bannerText}>
              Location is off — showing a default map. Enable location in
              Settings to center on you.
            </Text>
          </View>
        )}
      </View>

      {/* Base-layer switcher (cycles street / terrain / satellite) */}
      <TouchableOpacity
        style={styles.layersBtn}
        onPress={cycleBaseLayer}
        activeOpacity={0.85}
        accessibilityLabel="Switch map style"
      >
        <Ionicons name="layers-outline" size={20} color={colors.accent} />
        <Text style={styles.layersLabel}>{BASE_LABEL[baseLayer]}</Text>
      </TouchableOpacity>

      {/* Fit-all-pins button (when there are saved places) */}
      {places.length > 0 && (
        <TouchableOpacity
          style={styles.fitBtn}
          onPress={fitAll}
          activeOpacity={0.85}
          accessibilityLabel="Show all places"
        >
          <Ionicons name="scan-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      )}

      {/* Hint: long-press to drop a pin anywhere */}
      <View style={styles.hint} pointerEvents="none">
        <Ionicons name="hand-left-outline" size={13} color={colors.subtext} />
        <Text style={styles.hintText}>Hold the map to add a place here</Text>
      </View>

      {/* Recenter button (only useful when we have a fix) */}
      {location && (
        <TouchableOpacity
          style={styles.recenterBtn}
          onPress={recenter}
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={22} color={colors.accent} />
        </TouchableOpacity>
      )}

      {/* Floating add button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPlace}
        activeOpacity={0.85}
        accessibilityLabel="Add a place"
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.subtext,
    fontSize: 15,
    fontWeight: '500',
  },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
  },
  banner: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  bannerText: {
    flex: 1,
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: '500',
  },

  recenterBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  fitBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 58,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  layersBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 23,
    backgroundColor: colors.card,
    ...shadow.card,
  },
  layersLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  hint: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.xl + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
    opacity: 0.92,
    ...shadow.card,
  },
  hintText: { fontSize: 11, fontWeight: '600', color: colors.subtext },

  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.xl,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },
});
