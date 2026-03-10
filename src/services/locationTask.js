import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task globally
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;
  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        const token = await AsyncStorage.getItem('movex_token');
        if (!token) return;

        const { latitude, longitude } = location.coords;
        const timestamp = new Date().toISOString();

        // ── Offline Sync Logic: Location Queuing ─────────────────────────────
        const rawQueue = await AsyncStorage.getItem('movex_location_queue');
        let queue = rawQueue ? JSON.parse(rawQueue) : [];
        
        // Add current location to queue
        queue.push({ lat: latitude, lng: longitude, timestamp });

        // Try to clear the queue (max 5 at a time to avoid heavy payloads)
        try {
          const res = await api.post('/auth/location-batch', { batch: queue.slice(-5) });
          if (res.data.success) {
            // Success → Clear the sent items from queue
            await AsyncStorage.setItem('movex_location_queue', JSON.stringify([]));
          }
        } catch (postErr) {
          // Network failure / Timeout → Keep queue for next attempt
          // Limit queue size to 50 to prevent storage bloat
          if (queue.length > 50) queue.shift();
          await AsyncStorage.setItem('movex_location_queue', JSON.stringify(queue));
        }
      } catch (err) {}
    }
  }
});

// Function to start the location background task
export const startBackgroundLocationUpdates = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission denied');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background location permission denied');
      return;
    }

    // Check if task is already running
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, 
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: "MoveX Active",
          notificationBody: "Transmitting telemetry to Operations network",
          notificationColor: "#2563EB",
        },
      });
      console.log('[ TASK MGR ] Background location tracking initiated.');
    }
  } catch (error) {
    console.log('[ TASK MGR ERROR ]', error.message);
  }
};

// Function to stop the task
export const stopBackgroundLocationUpdates = async () => {
    try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log('[ TASK MGR ] Background location tracking terminated.');
        }
    } catch (error) {
        console.log('[ TASK MGR ERROR ]', error.message);
    }
}
