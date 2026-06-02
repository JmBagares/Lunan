import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { spacing } from '../theme';
import { useTheme } from '../theme-context';

// Brief branded launch screen shown over the app on open.
export default function SplashIntro() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Image
          source={require('../assets/logo/lunan-mark.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.title}>Lunan</Text>
        <Text style={styles.tagline}>Your map of the places that matter</Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    logo: { width: 124, height: 124, marginBottom: spacing.lg },
    title: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5,
    },
    tagline: {
      marginTop: spacing.xs,
      fontSize: 14,
      color: colors.subtext,
      fontWeight: '500',
    },
  });
