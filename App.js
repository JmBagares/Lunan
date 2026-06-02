import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SplashIntro from './components/SplashIntro';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import AddPlaceScreen from './screens/AddPlaceScreen';
import PlacesListScreen from './screens/PlacesListScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import { ThemeProvider, useTheme } from './theme-context';

const Tab = createBottomTabNavigator();
const MapStack = createNativeStackNavigator();
const PlacesStack = createNativeStackNavigator();

function useStackHeaderOptions() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerShadowVisible: false,
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700', fontSize: 18 },
    contentStyle: { backgroundColor: colors.background },
  };
}

function MapStackScreen() {
  return (
    <MapStack.Navigator screenOptions={useStackHeaderOptions()}>
      <MapStack.Screen
        name="MapHome"
        component={MapScreen}
        options={{ headerShown: false }}
      />
      <MapStack.Screen
        name="AddPlace"
        component={AddPlaceScreen}
        options={{ title: 'Add a Place', presentation: 'modal' }}
      />
    </MapStack.Navigator>
  );
}

function PlacesStackScreen() {
  return (
    <PlacesStack.Navigator screenOptions={useStackHeaderOptions()}>
      <PlacesStack.Screen
        name="PlacesList"
        component={PlacesListScreen}
        options={{ title: 'My Places' }}
      />
      <PlacesStack.Screen
        name="PlaceDetail"
        component={PlaceDetailScreen}
        options={{ title: 'Place' }}
      />
      <PlacesStack.Screen
        name="EditPlace"
        component={AddPlaceScreen}
        options={{ title: 'Edit Place', presentation: 'modal' }}
      />
    </PlacesStack.Navigator>
  );
}

function RootTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        // Add the device's bottom inset so the bar clears the system nav bar
        // (Android edge-to-edge / gesture bar) instead of hiding behind it.
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'ellipse';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'My Places') {
            iconName = focused ? 'heart' : 'heart-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapStackScreen} />
      <Tab.Screen name="My Places" component={PlacesStackScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { colors, dark } = useTheme();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 1700);
    return () => clearTimeout(timer);
  }, []);

  const navTheme = {
    ...DefaultTheme,
    dark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {showIntro ? (
        <SplashIntro />
      ) : (
        <NavigationContainer theme={navTheme}>
          <RootTabs />
        </NavigationContainer>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
