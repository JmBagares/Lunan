import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import CategoryChips from '../components/CategoryChips';
import PlaceCard from '../components/PlaceCard';
import { getPlaces } from '../utils/storage';
import { distanceMeters, formatDistance } from '../utils/distance';
import { makeTypography, radius, spacing } from '../theme';
import { useTheme } from '../theme-context';

function EmptyState() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="heart" size={40} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>No places yet</Text>
      <Text style={styles.emptyText}>
        Head to the Map tab and tap the “+” button to save the first spot you
        love. Your memories will collect here.
      </Text>
    </View>
  );
}

export default function PlacesListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [places, setPlaces] = useState([]);
  const [filter, setFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState('recent'); // 'recent' | 'nearest'
  const [userLoc, setUserLoc] = useState(null);

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

  // Get the user's location for distance display — but only if permission was
  // already granted elsewhere (the Map tab), so we never prompt from this screen.
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

  // Header heart toggles a "favorites only" filter.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setFavoritesOnly((v) => !v)}
          hitSlop={10}
        >
          <Ionicons
            name={favoritesOnly ? 'heart' : 'heart-outline'}
            size={22}
            color={favoritesOnly ? colors.accent : colors.muted}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, favoritesOnly]);

  // No places at all → friendly onboarding empty state (no filter UI).
  if (places.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState />
      </View>
    );
  }

  let visible =
    filter === 'all'
      ? places
      : places.filter((p) => (p.category || 'other') === filter);
  if (favoritesOnly) visible = visible.filter((p) => p.favorite);

  // Attach distance from the user (when known) for display and sorting.
  const withDistance = visible.map((p) => ({
    place: p,
    distance: userLoc ? distanceMeters(userLoc, p) : null,
  }));

  if (sort === 'nearest' && userLoc) {
    withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  } else if (sort === 'rating') {
    withDistance.sort((a, b) => (b.place.rating || 0) - (a.place.rating || 0));
  }

  const sortOptions = userLoc
    ? ['recent', 'rating', 'nearest']
    : ['recent', 'rating'];
  const sortLabels = { recent: 'Recent', rating: 'Rating', nearest: 'Nearest' };

  const countLabel = favoritesOnly
    ? visible.length === 1
      ? 'favorite'
      : 'favorites'
    : `${visible.length === 1 ? 'place' : 'places'}${
        filter === 'all' ? ' saved' : ' in this category'
      }`;

  return (
    <View style={styles.container}>
      <CategoryChips
        selected={filter}
        onSelect={setFilter}
        style={styles.chips}
        contentStyle={styles.chipsContent}
      />
      <FlatList
        data={withDistance}
        keyExtractor={(item) => item.place.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.count}>
              {visible.length} {countLabel}
            </Text>
            <View style={styles.sortRow}>
              {sortOptions.map((key) => {
                const active = sort === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSort(key)}
                    style={[styles.sortPill, active && styles.sortPillActive]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.sortText, active && styles.sortTextActive]}
                    >
                      {sortLabels[key]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.noneText}>
            {favoritesOnly
              ? 'No favorites yet — tap the heart on a place to add one.'
              : 'No places in this category yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <PlaceCard
            place={item.place}
            distanceText={formatDistance(item.distance)}
            onPress={() =>
              navigation.navigate('PlaceDetail', { place: item.place })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const makeStyles = (colors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chips: { flexGrow: 0, paddingTop: spacing.md },
  chipsContent: { paddingBottom: spacing.xs },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  count: { ...typography.label },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortPill: {
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sortText: { fontSize: 12, fontWeight: '700', color: colors.subtext },
  sortTextActive: { color: colors.white },
  noneText: {
    color: colors.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  emptyContainer: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...typography.heading, marginBottom: spacing.sm },
  emptyText: {
    textAlign: 'center',
    color: colors.subtext,
    fontSize: 15,
    lineHeight: 22,
  },
  });
};
