import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getPlaces, getPhotos } from '../utils/storage';
import { getCategory } from '../categories';
import { buildCollections } from '../collections';
import { makeTypography, radius, shadow, spacing } from '../theme';
import { useTheme } from '../theme-context';

const DAY_MS = 24 * 60 * 60 * 1000;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function relativeTime(iso) {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w > 1 ? 's' : ''} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m > 1 ? 's' : ''} ago`;
  }
  const y = Math.floor(days / 365);
  return `${y} year${y > 1 ? 's' : ''} ago`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeStats(places) {
  if (!places.length) return null;
  const favorites = places.filter((p) => p.favorite).length;
  const photos = places.reduce((n, p) => n + getPhotos(p).length, 0);

  const counts = {};
  places.forEach((p) => {
    const c = p.category || 'other';
    counts[c] = (counts[c] || 0) + 1;
  });
  let topCategory = 'other';
  let topN = 0;
  Object.entries(counts).forEach(([id, n]) => {
    if (n > topN) {
      topN = n;
      topCategory = id;
    }
  });

  const since = places.reduce(
    (min, p) => (new Date(p.createdAt) < new Date(min) ? p.createdAt : min),
    places[0].createdAt
  );

  return { total: places.length, favorites, photos, topCategory, since };
}

function formatMonthYear(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// Surfaces a past place to revisit: an "on this day" match first, then any
// older place, then a favorite. Returns { place, label } or null.
function pickMemory(places) {
  if (!places.length) return null;
  const now = new Date();

  const onThisDay = places.filter((p) => {
    const d = new Date(p.createdAt);
    return (
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate() &&
      d.getFullYear() < now.getFullYear()
    );
  });
  if (onThisDay.length) return { place: pick(onThisDay), label: 'On this day' };

  const older = places.filter((p) => Date.now() - new Date(p.createdAt) > 14 * DAY_MS);
  if (older.length) return { place: pick(older), label: 'Looking back' };

  const favorites = places.filter((p) => p.favorite);
  if (favorites.length) {
    return { place: pick(favorites), label: 'A place you love' };
  }
  return null;
}

const STEPS = [
  {
    icon: 'map-outline',
    title: 'Open the map',
    text: 'See where you are and the places you’ve already saved as coral pins.',
  },
  {
    icon: 'add-circle-outline',
    title: 'Save a spot',
    text: 'Tap the + button to add a place with a title, a note, and a photo.',
  },
  {
    icon: 'heart-outline',
    title: 'Revisit anytime',
    text: 'Find every memory in My Places — tap one to see its photo and map.',
  },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [count, setCount] = useState(0);
  const [memory, setMemory] = useState(null);
  const [stats, setStats] = useState(null);
  const [places, setPlaces] = useState([]);
  const [userLoc, setUserLoc] = useState(null);

  const reload = useCallback(() => {
    let active = true;
    getPlaces().then((saved) => {
      if (!active) return;
      setPlaces(saved);
      setCount(saved.length);
      setMemory(pickMemory(saved));
      setStats(computeStats(saved));
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(reload);

  // Read location only if already granted (never prompt from Home) so the
  // "Nearby" collection can appear when the user has used the Map tab.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos =
          (await Location.getLastKnownPositionAsync()) ||
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        if (active && pos) {
          setUserLoc({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const collections = useMemo(
    () => buildCollections(places, userLoc),
    [places, userLoc]
  );

  const openCollection = (c) => {
    navigation.navigate('My Places', {
      screen: 'Collection',
      params: { id: c.id, title: c.title },
    });
  };

  const openMemory = () => {
    if (memory) {
      navigation.navigate('My Places', {
        screen: 'PlaceDetail',
        params: { place: memory.place },
      });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.title}>Lunan</Text>
          <Text style={styles.countLine}>
            {count === 0
              ? 'No places saved yet'
              : `${count} ${count === 1 ? 'place' : 'places'} saved`}
          </Text>
        </View>
        <Image
          source={require('../assets/logo/lunan-mark.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>

      {/* Featured memory */}
      {memory && (
        <>
          <Text style={styles.sectionTitle}>{memory.label}</Text>
          <TouchableOpacity
            style={styles.memoryCard}
            onPress={openMemory}
            activeOpacity={0.85}
          >
            {getPhotos(memory.place)[0] ? (
              <Image
                source={{ uri: getPhotos(memory.place)[0] }}
                style={styles.memoryPhoto}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.memoryPhoto, styles.memoryPhotoEmpty]}>
                <Ionicons name="image-outline" size={24} color={colors.muted} />
              </View>
            )}
            <View style={styles.memoryBody}>
              <Text style={styles.memoryTitle} numberOfLines={1}>
                {memory.place.title}
              </Text>
              {!!memory.place.locationName && (
                <Text style={styles.memoryPlace} numberOfLines={1}>
                  {memory.place.locationName}
                </Text>
              )}
              <Text style={styles.memoryTime}>
                {relativeTime(memory.place.createdAt)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        </>
      )}

      {/* Travel stats */}
      {stats && (
        <>
          <Text style={styles.sectionTitle}>Your travels</Text>
          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>places</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{stats.favorites}</Text>
              <Text style={styles.statLabel}>favorites</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{stats.photos}</Text>
              <Text style={styles.statLabel}>photos</Text>
            </View>
          </View>
          <View style={styles.statsCaption}>
            <Ionicons
              name={getCategory(stats.topCategory).icon}
              size={14}
              color={getCategory(stats.topCategory).color}
            />
            <Text style={styles.captionText}>
              Mostly {getCategory(stats.topCategory).label.toLowerCase()} ·
              since {formatMonthYear(stats.since)}
            </Text>
          </View>
        </>
      )}

      {/* Smart Collections */}
      {collections.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Collections</Text>
          <View style={styles.collectionGrid}>
            {collections.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.collectionCard}
                onPress={() => openCollection(c)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.collectionIcon,
                    { backgroundColor: `${c.color}22` },
                  ]}
                >
                  <Ionicons name={c.icon} size={20} color={c.color} />
                </View>
                <Text style={styles.collectionTitle} numberOfLines={1}>
                  {c.title}
                </Text>
                <Text style={styles.collectionCount}>
                  {c.count} {c.count === 1 ? 'place' : 'places'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Quick links */}
      <View style={styles.linksCard}>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('Map')}
          activeOpacity={0.7}
        >
          <View style={styles.linkIcon}>
            <Ionicons name="map" size={18} color={colors.accent} />
          </View>
          <Text style={styles.linkText}>Open the Map</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
        <View style={styles.linkSeparator} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('My Places')}
          activeOpacity={0.7}
        >
          <View style={styles.linkIcon}>
            <Ionicons name="albums-outline" size={18} color={colors.accent} />
          </View>
          <Text style={styles.linkText}>My Places</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* How it works */}
      <Text style={styles.sectionTitle}>How it works</Text>
      {STEPS.map((step, index) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.stepIcon}>
            <Ionicons name={step.icon} size={18} color={colors.accent} />
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={styles.stepTitle}>
              {index + 1}. {step.title}
            </Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerText: { flex: 1 },
    greeting: {
      ...typography.label,
      color: colors.accent,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: { ...typography.title, fontSize: 34, marginTop: spacing.xs },
    countLine: {
      fontSize: 14,
      color: colors.subtext,
      fontWeight: '500',
      marginTop: spacing.xs,
    },
    logo: { width: 56, height: 56, marginLeft: spacing.md },

    sectionTitle: {
      ...typography.heading,
      fontSize: 17,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },

    memoryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.md,
      ...shadow.card,
    },
    memoryPhoto: {
      width: 60,
      height: 60,
      borderRadius: radius.md,
      marginRight: spacing.md,
      backgroundColor: colors.accentSoft,
    },
    memoryPhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
    memoryBody: { flex: 1 },
    memoryTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    memoryPlace: { fontSize: 13, color: colors.subtext, marginTop: 1 },
    memoryTime: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: '600',
      marginTop: 2,
    },

    statsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      ...shadow.card,
    },
    statCol: { flex: 1, alignItems: 'center' },
    statDivider: {
      width: 1,
      height: 34,
      backgroundColor: colors.border,
    },
    statNumber: { fontSize: 24, fontWeight: '800', color: colors.text },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.subtext,
      marginTop: 2,
    },
    statsCaption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.md,
    },
    captionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
    },

    collectionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    collectionCard: {
      flexGrow: 1,
      flexBasis: '47%',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.md,
      ...shadow.card,
    },
    collectionIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    collectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    collectionCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.subtext,
      marginTop: 2,
    },

    linksCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      marginTop: spacing.xl,
      overflow: 'hidden',
      ...shadow.card,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    linkIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    linkSeparator: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: spacing.lg + 36 + spacing.md,
    },

    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    stepIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    stepTextWrap: { flex: 1, paddingTop: 2 },
    stepTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    stepText: {
      fontSize: 14,
      color: colors.subtext,
      lineHeight: 20,
      marginTop: 2,
    },
  });
};
