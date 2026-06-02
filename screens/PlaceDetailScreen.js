import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import LeafletMap from '../components/LeafletMap';
import CategoryBadge from '../components/CategoryBadge';
import StarRating from '../components/StarRating';
import { deletePlace, getPlaces, getPhotos, updatePlace } from '../utils/storage';
import { getLocationName } from '../utils/geocode';
import { getCategory } from '../categories';
import { makeTypography, radius, shadow, spacing } from '../theme';
import { useTheme } from '../theme-context';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function PlaceDetailScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const placeId = route.params.place.id;
  const [place, setPlace] = useState(route.params.place);
  const [resolvedName, setResolvedName] = useState(null);
  const [activePhoto, setActivePhoto] = useState(0);

  const photos = getPhotos(place);
  const photoWidth = width - spacing.lg * 2;

  // Reload this place from storage whenever the screen regains focus, so edits
  // made on the Edit screen are reflected here. If it was deleted, go back.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPlaces().then((all) => {
        if (!active) return;
        const found = all.find((p) => p.id === placeId);
        if (found) setPlace(found);
        else navigation.goBack();
      });
      return () => {
        active = false;
      };
    }, [placeId, navigation])
  );

  // Backfill the place name for older places saved before names existed.
  useEffect(() => {
    if (place.locationName) {
      setResolvedName(null);
      return;
    }
    let active = true;
    getLocationName(place.latitude, place.longitude).then((name) => {
      if (active && name) setResolvedName(name);
    });
    return () => {
      active = false;
    };
  }, [place]);

  const displayName = place.locationName || resolvedName;

  const toggleFavorite = async () => {
    const updated = await updatePlace(place.id, { favorite: !place.favorite });
    if (updated) setPlace(updated);
  };

  const handleRate = async (value) => {
    const updated = await updatePlace(place.id, { rating: value });
    if (updated) setPlace(updated);
  };

  const openDirections = async () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open Maps', 'No maps app is available to handle directions.');
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete this place?',
      `“${place.title}” will be removed permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlace(place.id);
            // List & map reload on focus, so the removed pin/card disappears.
            navigation.goBack();
          },
        },
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: place.title,
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleFavorite} hitSlop={10}>
            <Ionicons
              name={place.favorite ? 'heart' : 'heart-outline'}
              size={22}
              color={place.favorite ? colors.accent : colors.muted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditPlace', { place })}
            hitSlop={10}
          >
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, place]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {photos.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setActivePhoto(
                Math.round(e.nativeEvent.contentOffset.x / photoWidth)
              )
            }
          >
            {photos.map((uri, i) => (
              <Image
                key={`${uri}-${i}`}
                source={{ uri }}
                style={[styles.photo, { width: photoWidth }]}
                contentFit="cover"
              />
            ))}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activePhoto && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.photo, { width: photoWidth }, styles.photoEmpty]}>
          <Ionicons name="image-outline" size={40} color={colors.muted} />
          <Text style={styles.photoEmptyText}>No photo</Text>
        </View>
      )}

      <View style={styles.metaRow}>
        <CategoryBadge categoryId={place.category} />
        <StarRating
          value={place.rating || 0}
          onChange={handleRate}
          size={20}
          style={styles.detailStars}
        />
      </View>

      {!!displayName && (
        <View style={styles.metaRow}>
          <Ionicons name="location" size={15} color={colors.accent} />
          <Text style={styles.placeName}>{displayName}</Text>
        </View>
      )}

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={15} color={colors.subtext} />
        <Text style={styles.metaText}>{formatDate(place.createdAt)}</Text>
      </View>

      {!!place.note && <Text style={styles.note}>{place.note}</Text>}

      <Text style={styles.sectionLabel}>ON THE MAP</Text>
      <View style={styles.mapCard}>
        <LeafletMap
          style={styles.miniMap}
          center={{ latitude: place.latitude, longitude: place.longitude }}
          zoom={15}
          interactive={false}
          markers={[
            {
              id: place.id,
              title: place.title,
              latitude: place.latitude,
              longitude: place.longitude,
              color: getCategory(place.category).color,
            },
          ]}
        />
      </View>
      <Text style={styles.coords}>
        {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
      </Text>

      <TouchableOpacity
        style={styles.directionsBtn}
        onPress={openDirections}
        activeOpacity={0.85}
      >
        <Ionicons name="navigate" size={18} color={colors.white} />
        <Text style={styles.directionsText}>Get Directions</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={confirmDelete}
        activeOpacity={0.85}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
        <Text style={styles.deleteText}>Delete Place</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (colors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  detailStars: { marginLeft: 'auto' },

  photo: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...shadow.card,
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  photoEmptyText: { marginTop: spacing.sm, color: colors.muted, fontWeight: '600' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.accent, width: 18 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  metaText: { ...typography.meta, fontSize: 13 },
  placeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.accentDark,
  },

  note: { ...typography.body, marginTop: spacing.md },

  sectionLabel: {
    ...typography.label,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  mapCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  miniMap: { width: '100%', height: 170 },
  coords: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    ...shadow.floating,
  },
  directionsText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerSoft,
  },
  deleteText: { color: colors.danger, fontSize: 16, fontWeight: '700' },
  });
};
