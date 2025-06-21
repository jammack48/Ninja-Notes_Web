
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationSchedule {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
  actionId: string;
}

class NativeNotificationService {
  private isNative: boolean;
  private notificationCounter: number = 1;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async initialize(): Promise<boolean> {
    if (!this.isNative) {
      console.log('Running in browser - native notifications not available');
      return false;
    }

    try {
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        console.log('Native notification permissions granted');
        
        // Set up notification listeners
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('Native notification received:', notification);
        });

        LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
          console.log('Native notification action performed:', notificationAction);
          
          // Mark the scheduled action as completed when user taps notification
          const actionId = notificationAction.notification.extra?.actionId;
          if (actionId) {
            await this.markActionCompleted(actionId);
          }
        });

        return true;
      } else {
        console.log('Native notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error initializing native notifications:', error);
      return false;
    }
  }

  async scheduleNotification(schedule: NotificationSchedule): Promise<boolean> {
    if (!this.isNative) {
      console.log('Browser environment - cannot schedule native notifications');
      return false;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: schedule.id,
            title: schedule.title,
            body: schedule.body,
            schedule: {
              at: schedule.scheduledAt,
            },
            sound: 'default',
            attachments: [],
            actionTypeId: 'OPEN_APP',
            extra: { actionId: schedule.actionId },
          },
        ],
      });

      console.log('Native notification scheduled:', schedule);
      return true;
    } catch (error) {
      console.error('Error scheduling native notification:', error);
      return false;
    }
  }

  async cancelNotification(id: number): Promise<boolean> {
    if (!this.isNative) {
      return false;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [{ id }],
      });
      
      console.log('Native notification cancelled:', id);
      return true;
    } catch (error) {
      console.error('Error cancelling native notification:', error);
      return false;
    }
  }

  private async markActionCompleted(actionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('scheduled_actions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) {
        console.error('Error marking action as completed:', error);
      } else {
        console.log('Action marked as completed:', actionId);
      }
    } catch (error) {
      console.error('Error updating action status:', error);
    }
  }

  async scheduleActionsFromDatabase(): Promise<void> {
    try {
      // Get all pending actions that are scheduled for the future
      const { data: pendingActions, error } = await supabase
        .from('scheduled_actions')
        .select(`
          *,
          tasks (
            id,
            title,
            description
          )
        `)
        .eq('status', 'pending')
        .gte('scheduled_for', new Date().toISOString());

      if (error) {
        console.error('Error fetching pending actions:', error);
        return;
      }

      console.log(`Scheduling ${pendingActions?.length || 0} native notifications`);

      for (const action of pendingActions || []) {
        const notificationId = this.notificationCounter++;
        
        await this.scheduleNotification({
          id: notificationId,
          title: `${action.action_type.toUpperCase()}: ${action.tasks?.title || 'Task'}`,
          body: action.tasks?.description || `Scheduled ${action.action_type}`,
          scheduledAt: new Date(action.scheduled_for),
          actionId: action.id,
        });
      }
    } catch (error) {
      console.error('Error scheduling actions from database:', error);
    }
  }

  getNextNotificationId(): number {
    return this.notificationCounter++;
  }

  isNativePlatform(): boolean {
    return this.isNative;
  }
}

export const nativeNotificationService = new NativeNotificationService();
