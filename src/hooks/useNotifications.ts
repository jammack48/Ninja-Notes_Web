
import { useState, useEffect } from 'react';
import { notificationService, NotificationOptions } from '@/services/NotificationService';
import { useToast } from '@/components/ui/use-toast';

export const useNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initializeNotifications = async () => {
      const success = await notificationService.initialize();
      setIsInitialized(true);
      setHasPermission(success);
      
      if (!success && notificationService.isNativePlatform()) {
        toast({
          title: "Notification Permission",
          description: "Please enable notifications in your device settings to receive reminders.",
          variant: "destructive"
        });
      }
    };

    initializeNotifications();
  }, [toast]);

  const scheduleNotification = async (options: NotificationOptions): Promise<boolean> => {
    if (!isInitialized) {
      console.log('Notifications not initialized yet');
      return false;
    }

    const success = await notificationService.scheduleNotification(options);
    
    if (success) {
      toast({
        title: "Reminder Set",
        description: `You'll be notified at ${options.scheduledAt.toLocaleString()}`,
      });
    } else {
      toast({
        title: "Reminder Failed",
        description: "Could not schedule the reminder. Please try again.",
        variant: "destructive"
      });
    }

    return success;
  };

  const cancelNotification = async (id: number): Promise<boolean> => {
    const success = await notificationService.cancelNotification(id);
    
    if (success) {
      toast({
        title: "Reminder Cancelled",
        description: "The scheduled reminder has been cancelled.",
      });
    }

    return success;
  };

  return {
    isInitialized,
    hasPermission,
    isNativePlatform: notificationService.isNativePlatform(),
    scheduleNotification,
    cancelNotification,
    getPendingNotifications: notificationService.getPendingNotifications,
  };
};
