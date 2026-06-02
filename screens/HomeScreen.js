import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getPlaces, getPhotos, mergePlaces } from '../utils/storage';
import { getCategory } from '../categories';
import { makeTypography, radius, shadow, spacing } from '../theme';
import { useTheme } from '../theme-context';

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const { colors, pref, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [count, setCount] = useState(0);
  const [memory, setMemory] = useState(null);
  const [stats, setStats] = useState(null);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');

  const reload = useCallback(() => {
    let active = true;
    getPlaces().then((saved) => {
      if (!active) return;
      setCount(saved.length);
      setMemory(pickMemory(saved));
      setStats(computeStats(saved));
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(reload);

  const openMemory = () => {
    if (memory) {
      navigation.navigate('My Places', {
        screen: 'PlaceDetail',
        params: { place: memory.place },
      });
    }
  };

  const exportBackup = async () => {
    const places = await getPlaces();
    if (!places.length) {
      Alert.alert('Nothing to back up', 'Save a place first, then export.');
      return;
    }
    try {
      await Share.share({
        title: 'Places I Loved backup',
        message: JSON.stringify(places),
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const runImport = async () => {
    let parsed;
    try {
      parsed = JSON.parse(importText.trim());
    } catch {
      Alert.alert('Invalid backup', "That doesn't look like valid backup text.");
      return;
    }
    try {
      const { added, total } = await mergePlaces(parsed);
      setImportVisible(false);
      setImportText('');
      reload();
      Alert.alert(
        'Import complete',
        added > 0
          ? `Added ${added} place${added > 1 ? 's' : ''}. You now have ${total}.`
          : 'No new places to add (they were already here).'
      );
    } catch (error) {
      Alert.alert('Could not import', error.message || 'The backup was not valid.');
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
      <View style={styles.header}>
        <Image
          source={require('../assets/logo/lunan-mark.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>WELCOME TO</Text>
          <Text style={styles.title}>Lunan</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Your map of the places that matter. Save the spots you love — with a
        photo, a note, and the exact place you found them.
      </Text>

      <View style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="heart" size={22} color={colors.accent} />
        </View>
        <View style={styles.statTextWrap}>
          <Text style={styles.statNumber}>{count}</Text>
          <Text style={styles.statLabel}>
            {count === 1 ? 'place saved' : 'places saved'}
          </Text>
        </View>
        {count === 0 && (
          <Text style={styles.statHint}>Let’s add your first!</Text>
        )}
      </View>

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

      {stats && (
        <>
          <Text style={styles.sectionTitle}>Your travels</Text>
          <View style={styles.statGrid}>
            <View style={styles.tile}>
              <Text style={styles.tileNumber}>{stats.total}</Text>
              <Text style={styles.tileLabel}>places</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileNumber}>{stats.favorites}</Text>
              <Text style={styles.tileLabel}>favorites</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileNumber}>{stats.photos}</Text>
              <Text style={styles.tileLabel}>photos</Text>
            </View>
            <View style={styles.tile}>
              <Ionicons
                name={getCategory(stats.topCategory).icon}
                size={22}
                color={getCategory(stats.topCategory).color}
              />
              <Text style={styles.tileLabel}>
                mostly {getCategory(stats.topCategory).label}
              </Text>
            </View>
          </View>
          <Text style={styles.sinceText}>
            Collecting since {formatMonthYear(stats.since)}
          </Text>
        </>
      )}

      <Text style={styles.sectionTitle}>How it works</Text>
      {STEPS.map((step, index) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.stepIcon}>
            <Ionicons name={step.icon} size={20} color={colors.accent} />
          </View>
          <View style={styles.stepTextWrap}>
            <Text style={styles.stepTitle}>
              {index + 1}. {step.title}
            </Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('Map')}
        activeOpacity={0.85}
      >
        <Ionicons name="map" size={18} color={colors.white} />
        <Text style={styles.primaryText}>Open the Map</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigation.navigate('My Places')}
        activeOpacity={0.85}
      >
        <Ionicons name="albums-outline" size={18} color={colors.accent} />
        <Text style={styles.secondaryText}>View My Places</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.themeRow}>
        {['system', 'light', 'dark'].map((m) => {
          const active = pref === m;
          const label = m === 'system' ? 'Auto' : m === 'light' ? 'Light' : 'Dark';
          const icon =
            m === 'system'
              ? 'phone-portrait-outline'
              : m === 'light'
              ? 'sunny-outline'
              : 'moon-outline';
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.themePill, active && styles.themePillActive]}
              activeOpacity={0.85}
            >
              <Ionicons
                name={icon}
                size={16}
                color={active ? colors.white : colors.accent}
              />
              <Text
                style={[styles.themePillText, active && styles.themePillTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Backup</Text>
      <View style={styles.backupRow}>
        <TouchableOpacity
          style={styles.backupBtn}
          onPress={exportBackup}
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={18} color={colors.accentDark} />
          <Text style={styles.backupText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backupBtn}
          onPress={() => setImportVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={18} color={colors.accentDark} />
          <Text style={styles.backupText}>Import</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Your places are saved privately on this device. Export saves a text
        backup you can keep; photos stay on your phone and aren’t included.
      </Text>

      <Modal
        visible={importVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setImportVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { paddingBottom: spacing.lg + insets.bottom },
            ]}
          >
            <Text style={styles.modalTitle}>Import backup</Text>
            <Text style={styles.modalHint}>
              Paste backup text below. Existing places are kept; new ones are
              added.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Paste backup JSON here…"
              placeholderTextColor={colors.muted}
              value={importText}
              onChangeText={setImportText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setImportVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !importText.trim() && styles.modalConfirmDisabled]}
                onPress={runImport}
                disabled={!importText.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmText}>Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 54, height: 54 },
  headerText: { flex: 1 },
  kicker: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  title: { ...typography.title, fontSize: 30, marginTop: spacing.xs },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    marginTop: spacing.sm,
  },

  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    ...shadow.card,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statTextWrap: { flex: 1 },
  statNumber: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.subtext, fontWeight: '500' },
  statHint: { fontSize: 13, color: colors.accent, fontWeight: '600' },

  sectionTitle: {
    ...typography.heading,
    fontSize: 18,
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
    width: 56,
    height: 56,
    borderRadius: radius.md,
    marginRight: spacing.md,
    backgroundColor: colors.accentSoft,
  },
  memoryPhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
  memoryBody: { flex: 1 },
  memoryTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  memoryPlace: { fontSize: 13, color: colors.subtext, marginTop: 1 },
  memoryTime: { fontSize: 12, color: colors.accent, fontWeight: '600', marginTop: 2 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78,
    ...shadow.card,
  },
  tileNumber: { fontSize: 24, fontWeight: '800', color: colors.text },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
    marginTop: 2,
    textAlign: 'center',
  },
  sinceText: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  backupRow: { flexDirection: 'row', gap: spacing.md },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
  },
  backupText: { color: colors.accentDark, fontSize: 15, fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalTitle: { ...typography.heading, fontSize: 18 },
  modalHint: {
    color: colors.subtext,
    fontSize: 13,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  modalInput: {
    height: 140,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalCancelText: { color: colors.subtext, fontSize: 15, fontWeight: '700' },
  modalConfirm: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  modalConfirmDisabled: { opacity: 0.5 },
  modalConfirmText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    ...shadow.floating,
  },
  primaryText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  secondaryText: { color: colors.accentDark, fontSize: 16, fontWeight: '700' },

  footer: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xl,
  },

  themeRow: { flexDirection: 'row', gap: spacing.sm },
  themePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  themePillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  themePillText: { fontSize: 14, fontWeight: '700', color: colors.text },
  themePillTextActive: { color: colors.white },
  });
};
