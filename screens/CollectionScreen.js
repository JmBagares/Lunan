import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import PlaceCard from '../components/PlaceCard';
import { getPlaces } from '../utils/storage';
import { distanceMeters, formatDistance } from '../utils/distance';
import { collectionPlaces, getCollection } from '../collections';
import { makeTypography, spacing } from '../theme';
import { useTheme } from '../theme-context';

export default function CollectionScreen({ navigation, route }) {
  const { id, title } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const collection = getCollection(id);

  const [places, setPlaces] = useState([]);
  const [userLoc, setUserLoc] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: title || collection?.title || 'Collection' });
  }, [navigation, title, collection]);

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

  // "Nearby" needs the user's location — read it only if already granted
  // (never prompt from here), matching the My Places list behavior.
  useFocusEffect(
    useCallback(() => {
      if (id !== 'nearby') return undefined;
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
    }, [id])
  );

  const data = useMemo(
    () => collectionPlaces(id, places, userLoc),
    [id, places, userLoc]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.count}>
            {data.length} {data.length === 1 ? 'place' : 'places'}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={collection?.icon || 'albums-outline'}
              size={36}
              color={colors.muted}
            />
            <Text style={styles.emptyText}>Nothing here yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            distanceText={
              id === 'nearby' && userLoc
                ? formatDistance(distanceMeters(userLoc, item))
                : null
            }
            onPress={() => navigation.navigate('PlaceDetail', { place: item })}
          />
        )}
      />
    </View>
  );
}

const makeStyles = (colors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    count: { ...typography.label, marginBottom: spacing.md, marginLeft: spacing.xs },
    empty: { alignItems: 'center', marginTop: spacing.xxl, gap: spacing.sm },
    emptyText: { color: colors.subtext, fontSize: 15, fontWeight: '500' },
  });
};
