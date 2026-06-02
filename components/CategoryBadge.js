import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getCategory } from '../categories';
import { radius } from '../theme';

// Small colored pill showing a place's category (icon + label).
export default function CategoryBadge({ categoryId, style }) {
  const category = getCategory(categoryId);
  return (
    <View
      style={[styles.badge, { backgroundColor: `${category.color}22` }, style]}
    >
      <Ionicons name={category.icon} size={12} color={category.color} />
      <Text style={[styles.text, { color: category.color }]}>
        {category.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  text: { fontSize: 11, fontWeight: '700' },
});
