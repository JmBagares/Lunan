import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme-context';

// 1–5 star rating. Pass `onChange` to make it interactive (tapping the current
// top star again clears the rating to 0). Without `onChange` it's display-only.
export default function StarRating({ value = 0, onChange, size = 18, style }) {
  const { colors } = useTheme();
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={[styles.row, style]}>
      {stars.map((n) => {
        const filled = n <= value;
        const icon = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? colors.star : colors.muted}
          />
        );
        if (!onChange) return <View key={n}>{icon}</View>;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n === value ? 0 : n)}
            hitSlop={6}
            activeOpacity={0.7}
          >
            {icon}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
});
