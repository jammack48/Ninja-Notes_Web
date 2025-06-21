
import { useState, useEffect } from 'react';
import { nativeNotificationService } from '@/services/NativeNotificationService';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      const success = await nativeNotificationService.initialize();
      setIsInitialized(true);
      setHasPermission(success);
      
      // Schedule any existing actions from database on startup
      if (success) {
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
