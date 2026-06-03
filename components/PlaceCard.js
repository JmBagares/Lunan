import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import CategoryBadge from './CategoryBadge';
import StarRating from './StarRating';
import { getPhotos } from '../utils/storage';
import { makeTypography, radius, shadow, spacing } from '../theme';
import { useTheme } from '../theme-context';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

// A single saved place rendered as a tappable card. Shared by the My Places
// list and the Smart Collection screens so they look identical.
export default function PlaceCard({ place, onPress, distanceText }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const photos = getPhotos(place);
  const thumb = photos[0];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.thumbWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="image-outline" size={26} color={colors.muted} />
          </View>
        )}
        {photos.length > 1 && (
          <View style={styles.countBadge}>
            <Ionicons name="images" size={10} color={colors.white} />
            <Text style={styles.countText}>{photos.length}</Text>
          </View>
        )}
        {place.favorite && (
          <View style={styles.favBadge}>
            <Ionicons name="heart" size={11} color={colors.white} />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {place.title}
        </Text>
        {!!place.note && (
          <Text style={styles.cardNote} numberOfLines={2}>
            {place.note}
          </Text>
        )}
        {!!place.locationName && (
          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={13} color={colors.accent} />
            <Text style={styles.cardPlace} numberOfLines={1}>
              {place.locationName}
            </Text>
          </View>
        )}
        {place.rating > 0 && (
          <StarRating value={place.rating} size={12} style={styles.cardStars} />
        )}
        <View style={[styles.cardMetaRow, styles.cardBottomRow]}>
          <View style={styles.cardDate}>
            <Ionicons name="calendar-outline" size={13} color={colors.muted} />
            <Text style={styles.cardMeta}>{formatDate(place.createdAt)}</Text>
            {!!distanceText && <Text style={styles.cardMeta}>· {distanceText}</Text>}
          </View>
          <CategoryBadge categoryId={place.category} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </TouchableOpacity>
  );
}

const makeStyles = (colors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadow.card,
    },
    thumbWrap: { width: 64, height: 64, marginRight: spacing.md },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: radius.md,
      backgroundColor: colors.accentSoft,
    },
    thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
    countBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.overlay,
      borderRadius: radius.pill,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    countText: { color: colors.white, fontSize: 10, fontWeight: '700' },
    favBadge: {
      position: 'absolute',
      top: 4,
      left: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1 },
    cardTitle: { ...typography.cardTitle },
    cardNote: { marginTop: 2, fontSize: 13, color: colors.subtext, lineHeight: 18 },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
    },
    cardBottomRow: { justifyContent: 'space-between' },
    cardDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardMeta: { ...typography.meta },
    cardPlace: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accentDark,
    },
    cardStars: { marginTop: 6 },
  });
};
