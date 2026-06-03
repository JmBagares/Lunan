import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import StarRating from '../components/StarRating';
import { savePlace, updatePlace, getPhotos } from '../utils/storage';
import { getLocationName } from '../utils/geocode';
import { CATEGORIES } from '../categories';
import { makeTypography, radius, shadow, spacing } from '../theme';
import { useTheme } from '../theme-context';

export default function AddPlaceScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const editingPlace = route.params?.place || null;
  const isEdit = !!editingPlace;

  const latitude = isEdit ? editingPlace.latitude : route.params?.latitude;
  const longitude = isEdit ? editingPlace.longitude : route.params?.longitude;
  const hasCoords = latitude != null && longitude != null;

  const [title, setTitle] = useState(editingPlace?.title || '');
  const [note, setNote] = useState(editingPlace?.note || '');
  const [photoUris, setPhotoUris] = useState(
    editingPlace ? getPhotos(editingPlace) : []
  );
  const [category, setCategory] = useState(editingPlace?.category || 'other');
  const [rating, setRating] = useState(editingPlace?.rating || 0);
  const [tags, setTags] = useState(
    Array.isArray(editingPlace?.tags) ? editingPlace.tags : []
  );
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [locationName, setLocationName] = useState(
    editingPlace?.locationName || null
  );
  const [resolvingName, setResolvingName] = useState(false);

  // Reverse-geocode the coordinates into a place name. Runs for both add and
  // edit (coordinates are fixed); on edit this also upgrades an older, shorter
  // name to the fuller address. Keeps the existing name if the lookup fails.
  useEffect(() => {
    if (!hasCoords) return;
    let active = true;
    setResolvingName(true);
    getLocationName(latitude, longitude).then((name) => {
      if (active) {
        if (name) setLocationName(name);
        setResolvingName(false);
      }
    });
    return () => {
      active = false;
    };
  }, [latitude, longitude, hasCoords]);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photos permission needed',
        'Please allow photo access to attach an image, or continue without one.'
      );
      return;
    }
    // Multi-select can't be combined with cropping (allowsEditing).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotoUris((prev) => [...prev, ...uris]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access to take a photo, or pick one from your gallery instead.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePhoto = (index) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const raw = tagInput.trim().replace(/^#+/, '').slice(0, 24);
    if (!raw) return;
    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === raw.toLowerCase()) ? prev : [...prev, raw]
    );
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const movePhoto = (from, to) => {
    setPhotoUris((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const photoOptions = (index) => {
    const opts = [];
    if (index > 0) {
      opts.push({ text: 'Make cover', onPress: () => movePhoto(index, 0) });
      opts.push({ text: 'Move left', onPress: () => movePhoto(index, index - 1) });
    }
    if (index < photoUris.length - 1) {
      opts.push({ text: 'Move right', onPress: () => movePhoto(index, index + 1) });
    }
    opts.push({ text: 'Remove', style: 'destructive', onPress: () => removePhoto(index) });
    opts.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Photo', 'The cover photo is shown first everywhere.', opts);
  };

  const choosePhoto = () => {
    Alert.alert('Add a photo', 'Where should the photo come from?', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please give this place a title.');
      return;
    }
    try {
      setSaving(true);
      if (isEdit) {
        await updatePlace(editingPlace.id, {
          title: title.trim(),
          note: note.trim(),
          photoUris,
          photoUri: photoUris[0] || null,
          locationName,
          category,
          tags,
          rating,
        });
      } else {
        await savePlace({
          title: title.trim(),
          note: note.trim(),
          photoUris,
          latitude,
          longitude,
          locationName,
          category,
          tags,
          rating,
        });
      }
      // Screens reload their data on focus, so the change shows on the way back.
      navigation.goBack();
    } catch (error) {
      console.warn('[AddPlace] save failed:', error);
      Alert.alert('Could not save', 'Something went wrong saving this place.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxl + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photos (multiple) */}
        <Text style={styles.label}>PHOTOS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
          keyboardShouldPersistTaps="handled"
        >
          {photoUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoThumbWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => photoOptions(index)}
              >
                <Image
                  source={{ uri }}
                  style={styles.photoThumb}
                  contentFit="cover"
                />
              </TouchableOpacity>
              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>Cover</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => removePhoto(index)}
                hitSlop={6}
              >
                <Ionicons name="close" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.photoAdd}
            onPress={choosePhoto}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={26} color={colors.accent} />
            <Text style={styles.photoAddText}>
              {photoUris.length ? 'Add' : 'Add photos'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Title */}
        <Text style={styles.label}>TITLE *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The little cliff-side café"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          returnKeyType="next"
        />

        {/* Note */}
        <Text style={styles.label}>NOTE</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="What made this place special?"
          placeholderTextColor={colors.muted}
          value={note}
          onChangeText={setNote}
          multiline
          textAlignVertical="top"
        />

        {/* Category */}
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategory(c.id)}
                activeOpacity={0.8}
                style={[
                  styles.catChip,
                  active && { backgroundColor: c.color, borderColor: c.color },
                ]}
              >
                <Ionicons
                  name={c.icon}
                  size={15}
                  color={active ? colors.white : c.color}
                />
                <Text
                  style={[styles.catChipText, active && styles.catChipTextActive]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rating */}
        <Text style={styles.label}>RATING</Text>
        <View style={styles.ratingRow}>
          <StarRating value={rating} onChange={setRating} size={30} />
          {rating > 0 && (
            <Text style={styles.ratingClear} onPress={() => setRating(0)}>
              Clear
            </Text>
          )}
        </View>

        {/* Tags */}
        <Text style={styles.label}>TAGS</Text>
        <View style={styles.tagInputRow}>
          <Ionicons name="pricetag-outline" size={16} color={colors.muted} />
          <TextInput
            style={styles.tagInput}
            placeholder="Add a tag (e.g. sunset) and press +"
            placeholderTextColor={colors.muted}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />
          {tagInput.trim().length > 0 && (
            <TouchableOpacity onPress={addTag} hitSlop={6}>
              <Ionicons name="add-circle" size={24} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
        {tags.length > 0 && (
          <View style={styles.tagWrap}>
            {tags.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.tagChip}
                onPress={() => removeTag(t)}
                activeOpacity={0.8}
              >
                <Text style={styles.tagChipText}>#{t}</Text>
                <Ionicons name="close" size={13} color={colors.accentDark} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Location (read-only): resolved name + coordinates */}
        <Text style={styles.label}>LOCATION</Text>
        <View style={styles.coordBox}>
          <Ionicons name="location" size={18} color={colors.accent} />
          <View style={styles.coordTextWrap}>
            {hasCoords ? (
              <>
                <Text style={styles.coordName}>
                  {locationName
                    ? locationName
                    : resolvingName
                    ? 'Finding place name…'
                    : 'Unknown area'}
                </Text>
                <Text style={styles.coordCoords}>
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </Text>
              </>
            ) : (
              <Text style={styles.coordName}>No coordinates available</Text>
            )}
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isEdit ? 'checkmark-circle' : 'bookmark'}
            size={18}
            color={colors.white}
          />
          <Text style={styles.saveText}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Place'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => {
  const typography = makeTypography(colors);
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  photoRow: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  photoThumbWrap: { width: 96, height: 96 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  coverText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  photoAdd: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddText: { marginTop: 4, fontSize: 12, fontWeight: '700', color: colors.accent },

  label: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  multiline: { height: 120 },

  coordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  catChipTextActive: { color: colors.white },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ratingClear: { fontSize: 13, fontWeight: '600', color: colors.subtext },

  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.sm,
  },
  tagInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tagChipText: { fontSize: 13, fontWeight: '700', color: colors.accentDark },

  coordTextWrap: { flex: 1 },
  coordName: { fontSize: 15, fontWeight: '700', color: colors.accentDark },
  coordCoords: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.accentDark,
    opacity: 0.7,
    marginTop: 1,
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    ...shadow.floating,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  });
};
