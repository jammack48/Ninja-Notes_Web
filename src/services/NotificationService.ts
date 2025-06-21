
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationOptions {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
  data?: any;
}

class NotificationService {
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async initialize(): Promise<boolean> {
    if (!this.isNative) {
      console.log('Running in browser - native notifications not available');
      return false;
    }

    try {
      // Request permissions
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        console.log('Notification permissions granted');
        
        // Set up notification listeners
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('Notification received:', notification);
        });

        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          console.log('Notification action performed:', notificationAction);
        });

        return true;
      } else {
        console.log('Notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async scheduleNotification(options: NotificationOptions): Promise<boolean> {
    if (!this.isNative) {
      console.log('Browser environment - falling back to web notifications');
      return this.scheduleWebNotification(options);
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: options.id,
            title: options.title,
            body: options.body,
            schedule: {
              at: options.scheduledAt,
            },
            sound: 'default',
            attachments: [],
            actionTypeId: 'OPEN_APP',
            extra: options.data || {},
          },
        ],
      });

      console.log('Native notification scheduled:', options);
      return true;
    } catch (error) {
      console.error('Error scheduling native notification:', error);
      return false;
    }
  }

  private async scheduleWebNotification(options: NotificationOptions): Promise<boolean> {
    // Fallback for web environment
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const timeUntilNotification = options.scheduledAt.getTime() - Date.now();
        
        if (timeUntilNotification > 0) {
          setTimeout(() => {
            new Notification(options.title, {
              body: options.body,
              icon: '/favicon.ico',
            });
          }, timeUntilNotification);
          
          console.log('Web notification scheduled:', options);
          return true;
        }
      }
    }
    
    console.log('Web notifications not supported or denied');
    return false;
  }

  async cancelNotification(id: number): Promise<boolean> {
    if (!this.isNative) {
      console.log('Cannot cancel web notifications');
      return false;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: id.toString() }],
      });
      
      console.log('Notification cancelled:', id);
      return true;
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  async getPendingNotifications(): Promise<any[]> {
    if (!this.isNative) {
      return [];
    }

    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  isNativePlatform(): boolean {
    return this.isNative;
  }
}

export const notificationService = new NotificationService();
