
import { useState, useEffect, useRef } from 'react';
import { nativeNotificationService } from '@/services/NativeNotificationService';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      // Prevent multiple initializations
      if (hasInitializedRef.current) {
        return;
      }
      
      hasInitializedRef.current = true;
      console.log('Initializing native notifications...');
      
      const success = await nativeNotificationService.initialize();
      setIsInitialized(true);
      setHasPermission(success);
      
      console.log('Native notifications initialized:', success ? 'success' : 'failed');
      
      // Schedule any existing actions from database on startup
      if (success) {
        console.log('Scheduling existing actions from database...');
        await nativeNotificationService.scheduleActionsFromDatabase();
      }
    };

    initializeNotifications();
  }, []);

  const scheduleNotification = async (options: any): Promise<boolean> => {
    if (!isInitialized) {
      console.log('Notifications not initialized yet');
      return false;
    }

    return await nativeNotificationService.scheduleNotification(options);
  };

  const cancelNotification = async (id: number): Promise<boolean> => {
    return await nativeNotificationService.cancelNotification(id);
  };

  return {
    isInitialized,
    hasPermission,
    isNativePlatform: nativeNotificationService.isNativePlatform(),
    scheduleNotification,
    cancelNotification,
  };
};
