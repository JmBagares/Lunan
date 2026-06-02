import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CATEGORIES } from '../categories';
import { radius, shadow, spacing } from '../theme';
import { useTheme } from '../theme-context';

// Horizontal, single-select category filter used on the Map and My Places.
// `selected` is a category id or 'all'.
export default function CategoryChips({ selected, onSelect, style, contentStyle }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const items = [
    { id: 'all', label: 'All', icon: 'apps', color: colors.accent },
    ...CATEGORIES,
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[styles.row, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {items.map((c) => {
        const active = selected === c.id;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onSelect(c.id)}
            activeOpacity={0.8}
            style={[
              styles.chip,
              active && { backgroundColor: c.color, borderColor: c.color },
            ]}
          >
            <Ionicons
              name={c.icon}
              size={14}
              color={active ? colors.white : c.color}
            />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingVertical: 7,
      paddingHorizontal: 12,
      ...shadow.card,
    },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
    chipTextActive: { color: colors.white },
  });
