import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = 'lunan.reminders.enabled';
const REMINDER_ID_KEY = 'lunan.reminders.id';

// Show the reminder as a banner even if the app happens to be open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MESSAGES = [
  'Open Lunan and revisit a place you loved 🌅',
  'A good moment to look back on your favorite spots ✨',
  'Been somewhere lovely lately? Save it in Lunan 📍',
];

function pickMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

// Whether the user has turned the weekly reminder on (persisted preference).
export async function areRemindersEnabled() {
  return (await AsyncStorage.getItem(PREF_KEY)) === '1';
}

async function cancelScheduled() {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // already gone — ignore
    }
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  }
}

// Requests permission (if needed) and schedules a weekly reminder.
// Returns true on success, false if permission was denied.
export async function enableReminders() {
  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) {
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    granted = res.granted;
  }
  if (!granted) return false;

  await cancelScheduled();
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: 'Lunan', body: pickMessage() },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 7, // Saturday
      hour: 10,
      minute: 0,
    },
  });
  await AsyncStorage.setItem(REMINDER_ID_KEY, id);
  await AsyncStorage.setItem(PREF_KEY, '1');
  return true;
}

export async function disableReminders() {
  await cancelScheduled();
  await AsyncStorage.setItem(PREF_KEY, '0');
}
